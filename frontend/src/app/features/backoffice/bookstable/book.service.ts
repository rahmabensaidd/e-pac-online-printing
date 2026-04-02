// book.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface Author {
    id?: number;
    name: string;
    email?: string;
}

export interface Book {
    bookId: number;
    title: string;
    description: string;
    is_created_by_user: boolean;
    userbook_status: string | null;
    creation_author: Author | null;
    is_added_from_admin: boolean;
    stock_status: string;
    authors: string[];
    quantity: number;
    pageCount: number;
    height: number;
    thickness: number;
    width: number;
    securityLabel: boolean;
    hasCoil: boolean;
    hasInsert: boolean;
    hasTab: boolean;
    hasBackcover: boolean;
    perf: boolean;
    doubleSidedCover: boolean;
    shrinkwrap: boolean;
    threeHoleDrill: boolean;
    textPaperType: string;
    textColor: string;
    coverFinishType: string;
    coverColor: string;
    coverSize: string;
    coverPaperType: string;
    headAndTail: string;
    priorityLevel: string;
    bindingType: string;
    coilType: string | null;
    tabColor: string | null;
    insertPaperType: string | null;
    caseFinishType: string | null;
    spineType: string | null;
    labelType: string | null;
    siren: string;
    salePrice: number;
}

export interface BookOverview {
    totalBooks: number;
    lowStockBooks: number;
    outOfStockBooks: number;
    totalValue: number;
}

export type BookResponseDto = Book;

export interface BookRequestDto {
    title: string;
    description: string;
    authors: string[];
    quantity: number;
    pageCount: number;
    height: number;
    thickness: number;
    width: number;
    securityLabel: boolean;
    hasCoil: boolean;
    hasInsert: boolean;
    hasTab: boolean;
    hasBackcover: boolean;
    perf: boolean;
    doubleSidedCover: boolean;
    shrinkwrap: boolean;
    threeHoleDrill: boolean;
    textPaperType: string;
    textColor: string;
    coverFinishType: string;
    coverColor: string;
    coverSize: string;
    coverPaperType: string;
    headAndTail: string;
    priorityLevel: string;
    bindingType: string;
    coilType?: string;
    tabColor?: string;
    insertPaperType?: string;
    caseFinishType?: string;
    spineType?: string;
    labelType?: string;
    siren: string;
    salePrice: number;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Injectable({
    providedIn: 'root',
})
export class BookService {
    private http = inject(HttpClient);
    private apiUrl = '/api/admin/books';

    // State signals
    private booksSignal = signal<Book[]>([]);
    private loadingSignal = signal(false);
    private overviewSignal = signal<BookOverview | null>(null);
    private totalElementsSignal = signal(0);
    private totalPagesSignal = signal(0);

    // Computed values
    readonly books = this.booksSignal.asReadonly();
    readonly loading = this.loadingSignal.asReadonly();
    readonly overview = this.overviewSignal.asReadonly();
    readonly totalElements = this.totalElementsSignal.asReadonly();
    readonly totalPages = this.totalPagesSignal.asReadonly();

    // Computed derived data - avec vérification de sécurité
    readonly lowStockBooks = computed(() => {
        const books = this.books();
        if (!Array.isArray(books)) return [];
        return books.filter((book) => {
            const status = book.stock_status?.toLowerCase() || '';
            return status === 'low' || status === 'reorder' || book.quantity < 10;
        });
    });

    readonly totalBooksValue = computed(() => {
        const books = this.books();
        if (!Array.isArray(books)) return 0;
        return books.reduce((total, book) => total + (book.salePrice * book.quantity), 0);
    });

    readonly averageStock = computed(() => {
        const books = this.books();
        if (!Array.isArray(books) || books.length === 0) return 0;
        const totalStock = books.reduce((sum, book) => sum + book.quantity, 0);
        return Math.round(totalStock / books.length);
    });

    // Data table row transformation - CORRECTION PRINCIPALE
    readonly bookRows = computed(() => {
        const books = this.books();

        // ✅ Vérification critique
        if (!books || !Array.isArray(books)) {
            console.warn('bookRows: books is not an array:', books);
            return [];
        }

        return books.map((book) => ({
            id: String(book.bookId),
            title: book.title || 'No title',
            description: book.description || '',
            authors: Array.isArray(book.authors) ? book.authors.join(', ') : '',
            quantity: book.quantity ?? 0,
            stock_status: book.stock_status || 'unknown',
            salePrice: book.salePrice ?? 0,
            bindingType: book.bindingType || '',
            pageCount: book.pageCount ?? 0,
            is_added_from_admin: book.is_added_from_admin ?? false,
            created_by_user: book.is_created_by_user ?? false,
        }));
    });

    constructor() {
        this.loadBooks();
        this.loadOverview();
    }

    /**
     * Load all books from API - CORRIGÉ
     */
    loadBooks(): void {
        this.loadingSignal.set(true);

        this.http.get<PageResponse<Book>>(this.apiUrl, {
            params: {
                page: 0,
                size: 1000 // Récupérer tous les livres
            }
        })
        .pipe(
            catchError((error) => {
                console.error('Error loading books:', error);
                return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
            })
        )
        .subscribe({
            next: (response) => {
                // ✅ Extraire correctement le tableau content
                const booksArray = response.content || [];
                this.booksSignal.set(booksArray);
                this.totalElementsSignal.set(response.totalElements || 0);
                this.totalPagesSignal.set(response.totalPages || 0);
                this.loadingSignal.set(false);

                console.log(`Loaded ${booksArray.length} books`);
            },
            error: (error) => {
                console.error('Error in loadBooks:', error);
                this.loadingSignal.set(false);
                this.booksSignal.set([]);
                this.totalElementsSignal.set(0);
                this.totalPagesSignal.set(0);
            }
        });
    }

    /**
     * Load books with pagination and filtering
     */
    loadBooksWithFilters(params: {
        page?: number;
        size?: number;
        search?: string;
        status?: string;
        bindingType?: string;
    }): void {
        this.loadingSignal.set(true);

        this.http.get<PageResponse<Book>>(this.apiUrl, { params })
            .pipe(
                catchError((error) => {
                    console.error('Error loading books with filters:', error);
                    return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
                })
            )
            .subscribe({
                next: (response) => {
                    this.booksSignal.set(response.content || []);
                    this.totalElementsSignal.set(response.totalElements || 0);
                    this.totalPagesSignal.set(response.totalPages || 0);
                    this.loadingSignal.set(false);
                },
                error: () => {
                    this.loadingSignal.set(false);
                    this.booksSignal.set([]);
                }
            });
    }

    /**
     * Load book overview statistics
     */
    loadOverview(): void {
        this.http.get<BookOverview>(`${this.apiUrl}/overview`)
            .pipe(
                catchError((error) => {
                    console.error('Error loading book overview:', error);
                    return of(null);
                })
            )
            .subscribe((overview) => {
                this.overviewSignal.set(overview);
            });
    }

    /**
     * Get book by ID
     */
    async getBookById(bookId: number): Promise<Book | undefined> {
        try {
            return await this.http.get<Book>(`${this.apiUrl}/${bookId}`).toPromise();
        } catch (error) {
            console.error('Error getting book by ID:', error);
            throw error;
        }
    }

    /**
     * Create new book
     */
    async createBook(book: BookRequestDto): Promise<Book> {
        try {
            const newBook = await this.http.post<Book>(this.apiUrl, book).toPromise();
            if (newBook) {
                this.booksSignal.update(books => [...books, newBook]);
                this.loadOverview();
            }
            return newBook!;
        } catch (error) {
            console.error('Error creating book:', error);
            throw error;
        }
    }

    /**
     * Update existing book
     */
    async updateBook(bookId: number, book: BookRequestDto): Promise<Book> {
        try {
            const updatedBook = await this.http.put<Book>(`${this.apiUrl}/${bookId}`, book).toPromise();
            if (updatedBook) {
                this.booksSignal.update(books =>
                    books.map(b => b.bookId === bookId ? updatedBook : b)
                );
                this.loadOverview();
            }
            return updatedBook!;
        } catch (error) {
            console.error('Error updating book:', error);
            throw error;
        }
    }

    /**
     * Partially update book
     */
    async patchBook(bookId: number, updates: Partial<BookRequestDto>): Promise<Book> {
        try {
            const updatedBook = await this.http.patch<Book>(`${this.apiUrl}/${bookId}`, updates).toPromise();
            if (updatedBook) {
                this.booksSignal.update(books =>
                    books.map(b => b.bookId === bookId ? updatedBook : b)
                );
                this.loadOverview();
            }
            return updatedBook!;
        } catch (error) {
            console.error('Error patching book:', error);
            throw error;
        }
    }

    /**
     * Delete book
     */
    async deleteBook(bookId: number): Promise<void> {
        try {
            await this.http.delete<void>(`${this.apiUrl}/${bookId}`).toPromise();
            this.booksSignal.update(books => books.filter(b => b.bookId !== bookId));
            this.loadOverview();
        } catch (error) {
            console.error('Error deleting book:', error);
            throw error;
        }
    }

    /**
     * Update book stock
     */
    async updateStock(bookId: number, quantity: number): Promise<Book> {
        try {
            const updatedBook = await this.http.patch<Book>(`${this.apiUrl}/${bookId}/stock`, null, {
                params: { quantity: quantity.toString() }
            }).toPromise();
            if (updatedBook) {
                this.booksSignal.update(books =>
                    books.map(b => b.bookId === bookId ? updatedBook : b)
                );
                this.loadOverview();
            }
            return updatedBook!;
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    }

    /**
     * Mark incoming stock (similar to inventory action)
     */
    async markBookIncoming(bookId: string): Promise<void> {
        const bookIdNum = Number(bookId);
        const book = this.books().find(b => b.bookId === bookIdNum);

        if (book) {
            const newQuantity = book.quantity + 10;
            await this.updateStock(bookIdNum, newQuantity);
        }
    }

    /**
     * Get low stock books
     */
    async getLowStockBooks(): Promise<Book[]> {
        try {
            return await this.http.get<Book[]>(`${this.apiUrl}/low-stock`).toPromise() || [];
        } catch (error) {
            console.error('Error getting low stock books:', error);
            return [];
        }
    }

    /**
     * Get books by binding type
     */
    async getBooksByBindingType(bindingType: string): Promise<Book[]> {
        try {
            return await this.http.get<Book[]>(`${this.apiUrl}/binding/${bindingType}`).toPromise() || [];
        } catch (error) {
            console.error('Error getting books by binding type:', error);
            return [];
        }
    }

    /**
     * Refresh all data
     */
    refreshData(): void {
        this.loadBooks();
        this.loadOverview();
    }
}