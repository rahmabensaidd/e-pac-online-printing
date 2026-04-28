import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Book, BookService } from '../../core/services/book.service';
import { BookPreview3dShowcaseComponent } from '../../editor/book-preview-3d-showcase';
import { BookSemanticTextureMap } from '../../editor/book-preview-semantic-textures';
import { computeFamilyFromBindingTypeAndCoverColor } from '../../editor/book-preview-3d-utils';

@Component({
  selector: 'app-custom-book-details-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, BookPreview3dShowcaseComponent],
  templateUrl: './custom-book-details-page.html',
  styleUrl: './custom-book-details-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomBookDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly books = inject(BookService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pdfActionError = signal<string | null>(null);
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
  readonly previewTextures = computed<BookSemanticTextureMap | null>(() => {
    const thumbnailUrl = this.book()?.cover?.coverTemplateThumbnailUrl;
    const bindingType = this.book()?.bindingType ?? null;
    const coverColor = this.book()?.coverColor ?? null;
    if (!thumbnailUrl) {
      return null;
    }

    return {
      family: computeFamilyFromBindingTypeAndCoverColor(bindingType, coverColor),
      outsideFront: thumbnailUrl,
      outsideBack: thumbnailUrl,
      outsideSpine: thumbnailUrl,
      rawPageUrls: [thumbnailUrl],
      revision: 1,
    };
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

  async previewCoverPdf(): Promise<void> {
    const bookId = this.book()?.bookId;
    if (!bookId) return;
    this.pdfActionError.set(null);
    try {
      const response = await this.books.getMyCustomBookCoverPdf(bookId, false);
      this.openBlobInNewTab(response.body);
    } catch (error) {
      console.error('Unable to preview cover PDF', error);
      this.pdfActionError.set('Unable to preview cover PDF.');
    }
  }

  async downloadCoverPdf(): Promise<void> {
    const bookId = this.book()?.bookId;
    if (!bookId) return;
    this.pdfActionError.set(null);
    try {
      const response = await this.books.getMyCustomBookCoverPdf(bookId, true);
      this.downloadBlob(response.body, this.extractFileName(response, `cover-${bookId}.pdf`));
    } catch (error) {
      console.error('Unable to download cover PDF', error);
      this.pdfActionError.set('Unable to download cover PDF.');
    }
  }

  async previewContentPdf(): Promise<void> {
    const bookId = this.book()?.bookId;
    if (!bookId) return;
    this.pdfActionError.set(null);
    try {
      const response = await this.books.getMyCustomBookContentPdf(bookId, false, true);
      this.openBlobInNewTab(response.body);
    } catch (error) {
      console.error('Unable to preview content PDF', error);
      this.pdfActionError.set('Unable to preview content PDF.');
    }
  }

  async downloadContentPdf(): Promise<void> {
    const bookId = this.book()?.bookId;
    if (!bookId) return;
    this.pdfActionError.set(null);
    try {
      const response = await this.books.getMyCustomBookContentPdf(bookId, true, false);
      this.downloadBlob(response.body, this.extractFileName(response, `content-${bookId}.pdf`));
    } catch (error) {
      console.error('Unable to download content PDF', error);
      this.pdfActionError.set('Unable to download content PDF.');
    }
  }

  private openBlobInNewTab(blob: Blob | null): void {
    if (!blob || blob.size === 0) {
      throw new Error('Empty PDF payload');
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private downloadBlob(blob: Blob | null, fileName: string): void {
    if (!blob || blob.size === 0) {
      throw new Error('Empty PDF payload');
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private extractFileName(response: { headers: { get(name: string): string | null } }, fallback: string): string {
    const disposition = response.headers.get('content-disposition') || '';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }
    const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || fallback;
  }
}
