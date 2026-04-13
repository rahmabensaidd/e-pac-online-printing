import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Book, BookService } from '../../core/services/book.service';
import { CartService, CustomBookPriceQuote } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';

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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly books = signal<Book[]>([]);

  readonly addToCartModalOpen = signal(false);
  readonly selectedBook = signal<Book | null>(null);
  readonly modalQuantity = signal(1);
  readonly modalQuote = signal<CustomBookPriceQuote | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly modalInfo = signal<string | null>(null);
  readonly calculatingPrice = signal(false);
  readonly addingToCart = signal(false);

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
    this.modalQuote.set(null);
    this.modalError.set(null);
    this.modalInfo.set(null);
    this.addToCartModalOpen.set(true);
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

  async calculatePrice(): Promise<void> {
    const book = this.selectedBook();
    if (!book) return;

    this.calculatingPrice.set(true);
    this.modalError.set(null);
    this.modalInfo.set(null);
    try {
      const quote = await this.cart.calculateCustomBookPrice(book.bookId, this.modalQuantity());
      this.modalQuote.set(quote);
      if (quote.isEstimated) {
        this.modalInfo.set('Estimated price applied');
      }
    } catch (error) {
      console.error('Unable to calculate custom book price', error);
      this.modalQuote.set(null);
      this.modalError.set('Unable to calculate price now. Please try again.');
    } finally {
      this.calculatingPrice.set(false);
    }
  }

  async addCustomBookToCart(): Promise<void> {
    const book = this.selectedBook();
    const quote = this.modalQuote();
    if (!book || !quote) return;

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
      });

      this.ui.showToast?.({
        message: quote.isEstimated
          ? 'Custom book added with estimated price.'
          : 'Custom book added to cart.',
        type: quote.isEstimated ? 'warning' : 'success',
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
}
