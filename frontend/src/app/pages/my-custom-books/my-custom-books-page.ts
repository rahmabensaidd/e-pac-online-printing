import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Book, BookService } from '../../core/services/book.service';
import { CartService, CustomBookPriceQuote } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';
import { PricingService, QuoteRequest } from '../../core/services/pricing.service';

@Component({
  selector: 'app-my-custom-books-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './my-custom-books-page.html',
  styleUrl: './my-custom-books-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCustomBooksPageComponent {
  private readonly bookService = inject(BookService);
  private readonly cart = inject(CartService);
  private readonly ui = inject(UiService);
  private readonly pricingService = inject(PricingService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly books = signal<Book[]>([]);

  readonly addToCartModalOpen = signal(false);
  readonly selectedBook = signal<Book | null>(null);
  readonly modalQuantity = signal(1);
  readonly modalPriority = signal<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  readonly modalQuote = signal<CustomBookPriceQuote | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly modalInfo = signal<string | null>(null);
  readonly calculatingPrice = signal(false);
  readonly addingToCart = signal(false);

  readonly priorityOptions = [
    { value: 'LOW' as const, label: 'Low', color: 'bg-slate-500', description: 'Standard processing' },
    { value: 'MEDIUM' as const, label: 'Medium', color: 'bg-amber-500', description: 'Faster processing (+15%)' },
    { value: 'HIGH' as const, label: 'High', color: 'bg-red-500', description: 'Express processing (+30%)' }
  ];

  readonly canAddPricedItem = computed(() =>
      !!this.selectedBook() &&
      !!this.modalQuote() &&
      this.modalQuantity() > 0 &&
      !this.addingToCart()
  );

  readonly selectedBookSpecs = computed(() => {
    const book = this.selectedBook();
    return book ? this.specsSummary(book) : '';
  });

  readonly customBooksCount = computed(() => this.books().length);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const books = await this.bookService.getMyCustomBooks();
      this.books.set(books ?? []);
    } catch (error) {
      console.error('Unable to load custom books', error);
      this.error.set('Unable to load your custom books right now.');
      this.books.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openAddToCartModal(book: Book): void {
    this.selectedBook.set(book);
    this.modalQuantity.set(1);
    this.modalPriority.set(this.mapPricingPriorityToModalPriority(book.priorityLevel));
    this.modalQuote.set(null);
    this.modalError.set(null);
    this.modalInfo.set(null);
    this.addToCartModalOpen.set(true);
    void this.calculatePrice();
  }

  closeAddToCartModal(): void {
    if (this.calculatingPrice() || this.addingToCart()) {
      return;
    }

    this.addToCartModalOpen.set(false);
    this.selectedBook.set(null);
    this.modalQuote.set(null);
    this.modalError.set(null);
    this.modalInfo.set(null);
  }

  onQuantityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement | null)?.value ?? 1);
    const normalized = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;

    this.modalQuantity.set(normalized);
    this.modalQuote.set(null);
    this.modalInfo.set(null);
    this.modalError.set(null);
  }

  setPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    this.modalPriority.set(priority);
    this.modalQuote.set(null);
    this.modalInfo.set(null);
    this.modalError.set(null);
  }

  getPriorityColor(priority: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (priority) {
      case 'LOW':
        return 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
      case 'MEDIUM':
        return 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100';
      case 'HIGH':
        return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
    }
  }

  getPrioritySelectedColor(priority: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (priority) {
      case 'LOW':
        return 'bg-slate-600 text-white shadow-sm';
      case 'MEDIUM':
        return 'bg-amber-600 text-white shadow-sm';
      case 'HIGH':
        return 'bg-red-600 text-white shadow-sm';
    }
  }

  async calculatePrice(): Promise<void> {
    const book = this.selectedBook();
    if (!book) {
      return;
    }

    this.calculatingPrice.set(true);
    this.modalError.set(null);
    this.modalInfo.set(null);

    try {
      const payload = this.mapBookToQuoteRequest(book);
      const response = await firstValueFrom(this.pricingService.getQuote(payload));

      if (!response.available || response.selectedPrice == null) {
        this.modalQuote.set(this.buildFallbackQuote(book));
        this.modalInfo.set(response.message || 'Estimated price applied (pricing API unavailable).');
        this.modalError.set(null);
        return;
      }

      const unitPrice = response.selectedPrice;
      const quantity = this.modalQuantity();
      const totalPrice = unitPrice * quantity;

      const quote: CustomBookPriceQuote = {
        bookId: book.bookId,
        quantity,
        unitPrice,
        totalPrice,
        isEstimated: false,
        currency: 'USD',
        calculatedAt: new Date().toISOString(),
      };

      this.modalQuote.set(quote);

      if (response.message) {
        this.modalInfo.set(response.message);
      }
    } catch (error) {
      console.error('Unable to calculate custom book price', error);
      this.modalQuote.set(this.buildFallbackQuote(book));
      this.modalInfo.set('Estimated price applied (pricing API unavailable).');
      this.modalError.set(null);
    } finally {
      this.calculatingPrice.set(false);
    }
  }

  async addCustomBookToCart(): Promise<void> {
    const book = this.selectedBook();
    const quote = this.modalQuote();

    if (!book || !quote) {
      return;
    }

    this.addingToCart.set(true);
    this.modalError.set(null);

    try {
      await this.cart.addPricedCustomItem({
        bookId: book.bookId,
        quantity: this.modalQuantity(),
        unitPrice: quote.unitPrice,
        totalPrice: quote.totalPrice,
        isEstimated: quote.isEstimated,
        currency: quote.currency || 'USD',
        calculatedAt: quote.calculatedAt,
        priority: this.modalPriority(),
      });

      this.ui.showToast?.({
        message: `Custom book added to cart with ${this.modalPriority()} priority.`,
        type: 'success',
      });

      this.closeAddToCartModal();
      this.ui.openCart();
    } catch (error) {
      console.error('Unable to add priced custom item to cart', error);
      this.modalError.set('Unable to add this custom book to cart right now.');
    } finally {
      this.addingToCart.set(false);
    }
  }

  private mapBookToQuoteRequest(book: Book): QuoteRequest {
    return {
      siren: book.siren || null,
      bindingType: book.bindingType || 'NONE',
      product: {
        quantity: this.modalQuantity(),
        productionPage: book.productionPage ?? 1,
        height: book.height ?? 0,
        width: book.width ?? 0,
        thickness: book.thickness ?? 0,

        securityLabel: this.boolToInt(book.securityLabel),
        hasCoil: this.boolToInt(book.hasCoil),
        hasInsert: this.boolToInt(book.hasInsert),
        hasTab: this.boolToInt(book.hasTab),
        hasBackcover: this.boolToInt(book.hasBackcover),
        perf: this.boolToInt(book.perf),
        doubleSidedCover: this.boolToInt(book.doubleSidedCover),
        shrinkwrap: this.boolToInt(book.shrinkwrap),
        threeHoleDrill: this.boolToInt(book.threeHoleDrill),

        textPaperType: book.textPaperType || 'NONE',
        textColor: book.textColor || 'FOUR_FOUR',
        coverPaperType: book.coverPaperType || 'NONE',
        coverFinishType: book.coverFinishType || 'MATT',
        coverColor: book.coverColor || 'FOUR_ZERO',
        priorityLevel: this.mapPriorityToPricingPriority(this.modalPriority()),
        headAndTail: book.headAndTail || 'NONE',
        coilType: book.coilType || 'NONE',
        tabColor: book.tabColor || 'NONE',
        insertPaperType: book.insertPaperType || 'NONE',
        caseFinishType: book.caseFinishType || 'NONE',
        spineType: book.spineType || 'NONE',
        labelType: book.labelType || 'NONE',
      }
    };
  }

  private buildFallbackQuote(book: Book): CustomBookPriceQuote {
    const quantity = this.modalQuantity();

    const pages = this.safeNumber(book.productionPage, 1);
    const width = this.safeNumber(book.width, 14);
    const height = this.safeNumber(book.height, 21);
    const areaFactor = (width * height) / 1000;

    const baseBookPrice = this.safeNumber(book.salePrice, 0);
    const computedBase = baseBookPrice > 0 ? baseBookPrice : 5 + pages * 0.08 + areaFactor;

    const priorityMultiplier = this.priorityMultiplier(this.modalPriority());
    const unitPrice = this.roundCurrency(Math.max(1, computedBase * priorityMultiplier));

    return {
      bookId: book.bookId,
      quantity,
      unitPrice,
      totalPrice: this.roundCurrency(unitPrice * quantity),
      isEstimated: true,
      currency: 'USD',
      calculatedAt: new Date().toISOString(),
      message: 'Estimated price applied',
      priority: this.modalPriority(),
    };
  }

  private priorityMultiplier(priority: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    switch (priority) {
      case 'LOW':
        return 1;
      case 'MEDIUM':
        return 1.15;
      case 'HIGH':
        return 1.3;
    }
  }

  private safeNumber(value: number | null | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return value;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private boolToInt(value: boolean | null | undefined): number {
    return value ? 1 : 0;
  }

  private mapPriorityToPricingPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (priority) {
      case 'LOW':
        return 'NORMAL';
      case 'MEDIUM':
        return 'HIGH1';
      case 'HIGH':
        return 'HIGH2';
    }
  }

  private mapPricingPriorityToModalPriority(priorityLevel: string | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch ((priorityLevel || '').toUpperCase()) {
      case 'HIGH1':
        return 'MEDIUM';
      case 'HIGH2':
      case 'HIGH3':
        return 'HIGH';
      case 'NORMAL':
      default:
        return 'LOW';
    }
  }

  specsSummary(book: Book): string {
    const dims = `${book.width} x ${book.height}`;
    return `${book.bindingType || 'N/A'} - ${book.productionPage || 0} pages - ${dims}`;
  }

  coverVisual(book: Book): string {
    const binding = (book.bindingType || '').toUpperCase();

    if (binding.includes('CASEBIND') || binding.includes('PERFECT')) {
      return 'linear-gradient(135deg, #111827 0%, #374151 100%)';
    }
    if (binding.includes('COIL')) {
      return 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)';
    }
    if (binding.includes('LOOSELEAF')) {
      return 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)';
    }

    return 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)';
  }

  coverImageUrl(book: Book): string | null {
    const raw = book.cover?.images?.[0]?.trim();
    if (!raw) {
      return null;
    }

    if (
        raw.startsWith('http://') ||
        raw.startsWith('https://') ||
        raw.startsWith('data:') ||
        raw.startsWith('/')
    ) {
      return raw;
    }

    return `/${raw.replace(/^\.?\//, '')}`;
  }

  editQueryParams(book: Book): Record<string, string | number> {
    return {
      bindingType: book.bindingType || '',
      quantity: book.quantity || 1,
      productionPage: book.productionPage || 1,
      height: book.height || 21,
      width: book.width || 14,
      thickness: book.thickness || 1,
      textPaperType: book.textPaperType || 'NONE',
      textColor: book.textColor || 'FOUR_FOUR',
      coverPaperType: book.coverPaperType || 'NONE',
      coverFinishType: book.coverFinishType || 'MATT',
      coverColor: book.coverColor || 'FOUR_ZERO',
      headAndTail: book.headAndTail || 'NONE',
    };
  }
}
