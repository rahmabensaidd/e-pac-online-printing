import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Book, BookService } from '../../core/services/book.service';
import { BookPreview3dFloatingComponent } from '../../editor/book-preview-3d-floating';

@Component({
  selector: 'app-custom-book-details-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, BookPreview3dFloatingComponent],
  templateUrl: './custom-book-details-page.html',
  styleUrl: './custom-book-details-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomBookDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly books = inject(BookService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly book = signal<Book | null>(null);

  readonly hasCoverPdf = computed(() => !!this.book()?.cover?.pdfFilePath);
  readonly hasContentPdf = computed(() => !!this.book()?.content?.filePath);
  readonly coverPdfUrl = computed(() => {
    const id = this.book()?.bookId;
    return id ? `/api/user/books/my/${id}/cover-pdf` : '';
  });
  readonly contentPdfUrl = computed(() => {
    const id = this.book()?.bookId;
    return id ? `/api/user/books/my/${id}/content-pdf` : '';
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const rawId = this.route.snapshot.paramMap.get('bookId');
    const bookId = Number(rawId);
    if (!Number.isFinite(bookId) || bookId <= 0) {
      this.error.set('Invalid book id.');
      this.loading.set(false);
      return;
    }

    try {
      this.book.set(await this.books.getMyCustomBookById(bookId));
    } catch (error) {
      console.error('Unable to load custom book details', error);
      this.error.set('Unable to load custom book details.');
      this.book.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
