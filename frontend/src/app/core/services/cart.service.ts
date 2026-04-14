import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, ProductCategory } from '../models/product';

export type CartItemSource = 'MARKETPLACE' | 'CUSTOM';

export interface CartItem {
  orderLineId: number;
  bookId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemSource: CartItemSource;
  isEstimated: boolean;
  currency: string;
  calculatedAt: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CustomBookPriceQuote {
  bookId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isEstimated: boolean;
  currency: string;
  calculatedAt: string;
  message?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface CartApiItem {
  orderLineId: number;
  bookId: number;
  title: string;
  description: string;
  bindingType: string | null;
  itemSource: CartItemSource | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isEstimated: boolean | null;
  currency: string | null;
  calculatedAt: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface CartApiResponse {
  cartId: number | null;
  totalPrice: number;
  itemCount: number;
  removed: boolean;
  items: CartApiItem[];
}

interface AddToCartRequest {
  cartId: number | null;
  bookId: number;
  quantity: number;
}

interface AddPricedCustomItemRequest {
  cartId: number | null;
  bookId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isEstimated: boolean;
  currency: string;
  calculatedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface UpdateCartItemQuantityRequest {
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartApiUrl = '/api/cart';
  private readonly storageKey = 'epac_active_cart_id';

  private readonly cartIdSignal = signal<number | null>(null);
  private readonly itemsSignal = signal<CartItem[]>([]);
  private readonly syncingSignal = signal(false);

  readonly cartId = this.cartIdSignal.asReadonly();
  readonly items = this.itemsSignal.asReadonly();
  readonly syncing = this.syncingSignal.asReadonly();

  readonly count = computed(() =>
      this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
      this.items().reduce((sum, item) => sum + item.lineTotal, 0)
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const storedCartId = this.readStoredCartId();
      if (storedCartId !== null) {
        this.cartIdSignal.set(storedCartId);
        void this.refresh();
      }
    }
  }

  async refresh(): Promise<void> {
    const cartId = this.cartIdSignal();
    if (cartId === null) {
      this.resetLocalState();
      return;
    }

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(this.http.get<CartApiResponse>(`${this.cartApiUrl}/${cartId}`));
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error refreshing cart:', error);
      this.resetLocalState();
    } finally {
      this.syncingSignal.set(false);
    }
  }

  async add(product: Product, quantity = 1): Promise<void> {
    const payload: AddToCartRequest = {
      cartId: this.cartIdSignal(),
      bookId: product.id,
      quantity: Math.max(1, Math.floor(quantity || 1)),
    };

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(this.http.post<CartApiResponse>(`${this.cartApiUrl}/items`, payload));
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error adding product to cart:', error);
      throw error;
    } finally {
      this.syncingSignal.set(false);
    }
  }

  async calculateCustomBookPrice(bookId: number, quantity: number, priority: 'LOW' | 'MEDIUM' | 'HIGH'): Promise<CustomBookPriceQuote> {
    const payload = {
      bookId,
      quantity: Math.max(1, Math.floor(quantity || 1)),
      priority,
    };

    return await firstValueFrom(
        this.http.post<CustomBookPriceQuote>(`${this.cartApiUrl}/custom-pricing`, payload)
    );
  }

  async addPricedCustomItem(input: {
    bookId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isEstimated: boolean;
    currency: string;
    calculatedAt: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<void> {
    const payload: AddPricedCustomItemRequest = {
      cartId: this.cartIdSignal(),
      bookId: input.bookId,
      quantity: Math.max(1, Math.floor(input.quantity || 1)),
      unitPrice: input.unitPrice,
      totalPrice: input.totalPrice,
      isEstimated: input.isEstimated,
      currency: input.currency || 'USD',
      calculatedAt: input.calculatedAt,
      priority: input.priority,
    };

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(
          this.http.post<CartApiResponse>(`${this.cartApiUrl}/custom-items/priced`, payload)
      );
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error adding priced custom item to cart:', error);
      throw error;
    } finally {
      this.syncingSignal.set(false);
    }
  }

  async remove(orderLineId: number): Promise<void> {
    const cartId = this.cartIdSignal();
    if (cartId === null) {
      this.resetLocalState();
      return;
    }

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(
          this.http.delete<CartApiResponse>(`${this.cartApiUrl}/${cartId}/items/${orderLineId}`)
      );
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    } finally {
      this.syncingSignal.set(false);
    }
  }

  async setQuantity(orderLineId: number, quantity: number): Promise<void> {
    const cartId = this.cartIdSignal();
    if (cartId === null) {
      this.resetLocalState();
      return;
    }

    const normalizedQuantity = Math.max(1, Math.floor(quantity || 1));
    const payload: UpdateCartItemQuantityRequest = { quantity: normalizedQuantity };

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(
          this.http.patch<CartApiResponse>(`${this.cartApiUrl}/${cartId}/items/${orderLineId}`, payload)
      );
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      throw error;
    } finally {
      this.syncingSignal.set(false);
    }
  }

  async clear(): Promise<void> {
    const cartId = this.cartIdSignal();
    if (cartId === null) {
      this.resetLocalState();
      return;
    }

    this.syncingSignal.set(true);
    try {
      const response = await firstValueFrom(this.http.delete<CartApiResponse>(`${this.cartApiUrl}/${cartId}`));
      this.applyCartResponse(response);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    } finally {
      this.syncingSignal.set(false);
    }
  }

  private applyCartResponse(response: CartApiResponse | null | undefined): void {
    if (!response || response.removed || response.cartId === null) {
      this.resetLocalState();
      return;
    }

    this.cartIdSignal.set(response.cartId);
    this.persistCartId(response.cartId);
    this.itemsSignal.set((response.items || []).map((item) => this.mapCartItem(item)));
  }

  private mapCartItem(item: CartApiItem): CartItem {
    const itemSource: CartItemSource = item.itemSource === 'CUSTOM' ? 'CUSTOM' : 'MARKETPLACE';
    return {
      orderLineId: item.orderLineId,
      bookId: item.bookId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      itemSource,
      isEstimated: !!item.isEstimated,
      currency: item.currency || 'USD',
      calculatedAt: item.calculatedAt,
      priority: item.priority || 'LOW',
      product: {
        id: item.bookId,
        name: item.title,
        category: this.mapBindingTypeToCategory(item.bindingType, itemSource),
        price: item.unitPrice,
        image: this.gradientForBindingType(item.bindingType, itemSource),
        description: item.description || '',
        specs: this.specsForBindingType(item.bindingType, itemSource),
      },
    };
  }

  private mapBindingTypeToCategory(bindingType: string | null, itemSource: CartItemSource): ProductCategory {
    if (itemSource === 'CUSTOM') {
      return 'custom';
    }

    switch ((bindingType || '').toUpperCase()) {
      case 'CARD':
        return 'business';
      case 'SS':
        return 'marketing';
      case 'CASEBIND':
      case 'CASEBIND_INS':
      case 'CASEBIND_ES':
      case 'CASEBIND_ES_INS':
      case 'PERFECT':
      case 'PERFECT_INS':
      case 'PERFECT_NC':
      case 'PERFECT_NC_INS':
        return 'photo';
      default:
        return 'custom';
    }
  }

  private gradientForBindingType(bindingType: string | null, itemSource: CartItemSource): string {
    if (itemSource === 'CUSTOM') {
      return 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 100%)';
    }

    switch (this.mapBindingTypeToCategory(bindingType, itemSource)) {
      case 'business':
        return 'linear-gradient(135deg, #1A1A2E 0%, #3A86FF 100%)';
      case 'marketing':
        return 'linear-gradient(135deg, #FF6B35 0%, #FF006E 100%)';
      case 'photo':
        return 'linear-gradient(135deg, #FF6B9D 0%, #8338EC 100%)';
      case 'packaging':
        return 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 100%)';
      case 'custom':
      default:
        return 'linear-gradient(135deg, #FFBE0B 0%, #00D9C0 100%)';
    }
  }

  private specsForBindingType(bindingType: string | null, itemSource: CartItemSource): string[] {
    if (itemSource === 'CUSTOM') {
      return [bindingType?.replaceAll('_', ' ') || 'Custom book'];
    }

    if (!bindingType) {
      return ['Marketplace product'];
    }

    return [bindingType.replaceAll('_', ' ')];
  }

  private resetLocalState(): void {
    this.cartIdSignal.set(null);
    this.itemsSignal.set([]);
    this.removeStoredCartId();
  }

  private readStoredCartId(): number | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const rawValue = window.localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  private persistCartId(cartId: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.localStorage.setItem(this.storageKey, String(cartId));
  }

  private removeStoredCartId(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }
}