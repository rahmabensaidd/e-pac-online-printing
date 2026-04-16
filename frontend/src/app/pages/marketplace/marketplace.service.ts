// src/app/features/marketplace/marketplace.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Book, PageResponse } from '../../core/services/book.service';

export interface MarketplaceBook {
    id: string;
    title: string;
    description: string;
    priceFrom: number;
    category: string;
    shortDescription: string;
    tags: string[];
    isAvailable: boolean;
    rating?: number;
    reviewsCount?: number;
    imageUrl?: string;
    quantity: number;
    bindingType: string;
    authors: string[];
}

@Injectable({
    providedIn: 'root'
})
export class MarketplaceService {
    private readonly http = inject(HttpClient);
    private readonly marketplaceApiUrl = '/api/books/marketplace';

    private readonly booksSignal = signal<Book[]>([]);
    private readonly loadingSignal = signal(false);

    readonly marketplaceBooks = computed(() => this.transformBooksToMarketplace(this.booksSignal()));
    readonly loading = this.loadingSignal.asReadonly();

    constructor() {
        this.loadMarketplaceBooks();
    }

    private loadMarketplaceBooks(search?: string): void {
        this.loadingSignal.set(true);

        const params: Record<string, string> = {
            page: '0',
            size: '1000'
        };

        if (search && search.trim().length > 0) {
            params['search'] = search.trim();
        }

        this.http.get<PageResponse<Book>>(this.marketplaceApiUrl, { params })
            .pipe(
                catchError((error) => {
                    console.error('Error loading marketplace books:', error);
                    return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
                })
            )
            .subscribe({
                next: (response) => {
                    this.booksSignal.set(response.content || []);
                    this.loadingSignal.set(false);
                },
                error: () => {
                    this.booksSignal.set([]);
                    this.loadingSignal.set(false);
                }
            });
    }

    private transformBooksToMarketplace(books: Book[] | null | undefined): MarketplaceBook[] {
        if (!books || !Array.isArray(books)) {
            return [];
        }

        return books.map((book) => ({
            id: String(book.bookId),
            title: book.title || 'Untitled Book',
            description: book.description || '',
            priceFrom: book.salePrice || 0,
            category: this.mapBindingTypeToCategory(book.bindingType),
            shortDescription: this.truncateDescription(book.description || book.title, 120),
            tags: this.generateTags(book),
            isAvailable: book.quantity > 0,
            quantity: book.quantity,
            bindingType: book.bindingType,
            authors: book.authors || [],
            rating: undefined, // À ajouter si vous avez un système de notes
            reviewsCount: undefined,
            imageUrl: undefined // À ajouter si vous avez des images
        }));
    }

    private mapBindingTypeToCategory(bindingType: string): string {
        const categoryMap: { [key: string]: string } = {
            'perfect_bound': 'Books',
            'hardcover': 'Books',
            'spiral': 'Books',
            'wire_o': 'Books',
            'saddle_stitch': 'Brochures',
            'case_bound': 'Books'
        };
        return categoryMap[bindingType] || 'Books';
    }

    private truncateDescription(description: string, maxLength: number): string {
        if (!description) return 'No description available';
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength) + '...';
    }

    private generateTags(book: Book): string[] {
        const tags: string[] = [];

        if (book.bindingType) tags.push(this.formatTag(book.bindingType));
        if (book.textPaperType) tags.push(this.formatTag(book.textPaperType));
        if (book.hasCoil) tags.push('Coil Binding');
        if (book.hasInsert) tags.push('Insert');
        if (book.securityLabel) tags.push('Security Label');
        if (book.priorityLevel === 'HIGH') tags.push('Priority');

        return tags.slice(0, 5); // Maximum 5 tags
    }

    private formatTag(value: string): string {
        return value
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    refreshBooks(): void {
        this.loadMarketplaceBooks();
    }
}
