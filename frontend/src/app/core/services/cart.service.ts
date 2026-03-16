import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  add(product: Product, quantity = 1): void {
    this.items.update((items) => {
      const idx = items.findIndex((x) => x.product.id === product.id);
      if (idx >= 0) {
        const copy = [...items];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...items, { product, quantity }];
    });
  }

  remove(productId: number): void {
    this.items.update((items) => items.filter((x) => x.product.id !== productId));
  }

  setQuantity(productId: number, quantity: number): void {
    const q = Math.max(1, Math.floor(quantity || 1));
    this.items.update((items) =>
      items.map((x) => (x.product.id === productId ? { ...x, quantity: q } : x))
    );
  }

  clear(): void {
    this.items.set([]);
  }
}
