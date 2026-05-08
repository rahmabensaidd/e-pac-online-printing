// src/app/features/marketplace/marketplace-page.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { Product, ProductCategory } from '../../core/models/product';
import { UiService } from '../../core/services/ui.service';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { MarketplaceService, MarketplaceBook } from './marketplace.service';

type CategoryFilter = 'All' | 'Books' | 'Brochures' | 'Flyers' | 'Posters' | 'Calendars' | 'Business Cards';
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'title-asc';

interface SortItem {
  value: SortOption;
  label: string;
}

@Component({
  selector: 'app-marketplace-page',
  imports: [CurrencyPipe, NgOptimizedImage, RevealOnScrollDirective],
  templateUrl: './marketplace-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class MarketplacePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly ui = inject(UiService);
  private readonly marketplaceService = inject(MarketplaceService);

  readonly categoryFilters: readonly CategoryFilter[] = ['All', 'Books', 'Brochures', 'Flyers', 'Posters', 'Calendars', 'Business Cards'];
  readonly sortItems: readonly SortItem[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to high' },
    { value: 'price-desc', label: 'Price: High to low' },
    { value: 'title-asc', label: 'Title: A to Z' },
  ];
  readonly skeletonCards = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  readonly itemsPerPage = 9;
  readonly ratingStars = [1, 2, 3, 4, 5];

  // Utiliser les vraies données du service
  readonly isLoading = computed(() => this.marketplaceService.loading());
  readonly items = computed(() => this.marketplaceService.marketplaceBooks());

  readonly minPriceBoundary = computed(() => {
    const allItems = this.items();
    if (allItems.length === 0) return 0;
    return Math.floor(Math.min(...allItems.map((item) => item.priceFrom)));
  });

  readonly maxPriceBoundary = computed(() => {
    const allItems = this.items();
    if (allItems.length === 0) return 1000;
    return Math.ceil(Math.max(...allItems.map((item) => item.priceFrom)));
  });

  // Filtres
  readonly searchQuery = signal('');
  readonly selectedCategory = signal<CategoryFilter>('All');
  readonly selectedSort = signal<SortOption>('featured');
  readonly availableOnly = signal(false);
  readonly minPrice = signal(0);
  readonly maxPrice = signal(1000);
  readonly selectedTags = signal<string[]>([]);
  readonly currentPage = signal(1);

  readonly allTags = computed(() => {
    const allItems = this.items();
    const tagsSet = new Set<string>();
    allItems.forEach(item => {
      item.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  });

  readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const sort = this.selectedSort();
    const availableOnly = this.availableOnly();
    const minPrice = this.minPrice();
    const maxPrice = this.maxPrice();
    const selectedTags = this.selectedTags();
    const allItems = this.items();

    if (allItems.length === 0) return [];

    const filtered = allItems.filter((item) => {
      if (category !== 'All' && item.category !== category) {
        return false;
      }

      if (item.priceFrom < minPrice || item.priceFrom > maxPrice) {
        return false;
      }

      if (availableOnly && !item.isAvailable) {
        return false;
      }

      if (selectedTags.length > 0 && !selectedTags.some((tag) => item.tags.includes(tag))) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${item.title} ${item.category} ${item.shortDescription} ${item.tags.join(' ')} ${item.authors.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];

    switch (sort) {
      case 'price-asc':
        sorted.sort((left, right) => left.priceFrom - right.priceFrom);
        break;
      case 'price-desc':
        sorted.sort((left, right) => right.priceFrom - left.priceFrom);
        break;
      case 'title-asc':
        sorted.sort((left, right) => left.title.localeCompare(right.title));
        break;
      case 'featured':
      default:
        // Garder l'ordre original ou trier par ID
        sorted.sort((left, right) => parseInt(left.id) - parseInt(right.id));
        break;
    }

    return sorted;
  });

  readonly totalResults = computed(() => this.filteredItems().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalResults() / this.itemsPerPage)));
  readonly safeCurrentPage = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    return Math.min(Math.max(current, 1), total);
  });

  readonly paginatedItems = computed(() => {
    const start = (this.safeCurrentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredItems().slice(start, end);
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, index) => index + 1);
  });

  readonly visibleRangeStart = computed(() => {
    if (this.totalResults() === 0) return 0;
    return (this.safeCurrentPage() - 1) * this.itemsPerPage + 1;
  });

  readonly visibleRangeEnd = computed(() => {
    return Math.min(this.safeCurrentPage() * this.itemsPerPage, this.totalResults());
  });

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim().length > 0) count++;
    if (this.selectedCategory() !== 'All') count++;
    if (this.availableOnly()) count++;
    if (this.minPrice() !== this.minPriceBoundary() || this.maxPrice() !== this.maxPriceBoundary()) count++;
    count += this.selectedTags().length;
    return count;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  ngOnInit(): void {
    // Initialiser les prix par défaut après que les données soient chargées
    setTimeout(() => {
      this.minPrice.set(this.minPriceBoundary());
      this.maxPrice.set(this.maxPriceBoundary());
    }, 100);

    // Lire les paramètres d'URL
    this.route.queryParamMap
        .pipe(
            startWith(this.route.snapshot.queryParamMap),
            map((params) => params.get('category')),
            takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((categoryParam) => {
          const nextCategory = this.resolveCategoryFromQuery(categoryParam);
          if (this.selectedCategory() !== nextCategory) {
            this.selectedCategory.set(nextCategory);
            this.resetPagination();
          }
        });
  }

  setCategory(category: CategoryFilter): void {
    if (this.selectedCategory() !== category) {
      this.selectedCategory.set(category);
      this.resetPagination();
    }
    this.syncCategoryQueryParam(category);
  }

  onSearchChange(event: Event): void {
    const value = this.readInputValue(event);
    this.searchQuery.set(value);
    this.resetPagination();
  }

  onSortChange(event: Event): void {
    const value = this.readInputValue(event);
    const match = this.sortItems.find((item) => item.value === value);
    if (match) {
      this.selectedSort.set(match.value);
      this.resetPagination();
    }
  }

  onAvailableOnlyChange(event: Event): void {
    const checked = this.readCheckedValue(event);
    this.availableOnly.set(checked);
    this.resetPagination();
  }

  onMinPriceChange(event: Event): void {
    const value = this.readNumericValue(event, this.minPriceBoundary());
    const normalized = Math.min(Math.max(value, this.minPriceBoundary()), this.maxPrice());
    this.minPrice.set(normalized);
    this.resetPagination();
  }

  onMaxPriceChange(event: Event): void {
    const value = this.readNumericValue(event, this.maxPriceBoundary());
    const normalized = Math.max(Math.min(value, this.maxPriceBoundary()), this.minPrice());
    this.maxPrice.set(normalized);
    this.resetPagination();
  }

  toggleTag(tag: string): void {
    this.selectedTags.update((current) =>
        current.includes(tag) ? current.filter((existing) => existing !== tag) : [...current, tag]
    );
    this.resetPagination();
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
    this.selectedSort.set('featured');
    this.availableOnly.set(false);
    this.minPrice.set(this.minPriceBoundary());
    this.maxPrice.set(this.maxPriceBoundary());
    this.selectedTags.set([]);
    this.resetPagination();
    this.syncCategoryQueryParam('All');
  }

  previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  goToPage(page: number): void {
    const normalized = Math.min(Math.max(page, 1), this.totalPages());
    this.currentPage.set(normalized);
  }

  quickView(item: MarketplaceBook): void {
    this.router.navigate(['/products', item.id]);
  }

  async addToCart(item: MarketplaceBook): Promise<void> {
    if (!item.isAvailable) {
      this.ui.showToast?.({
        message: 'This product is currently out of stock',
        type: 'warning'
      });
      return;
    }

    const product = this.toProduct(item);
    try {
      await this.cart.add(product, 1);
      this.ui.openCart();
    } catch {
      this.ui.showToast?.({
        message: 'Unable to add this product to cart right now',
        type: 'error'
      });
    }
  }

  categoryVisual(item: MarketplaceBook): string {
    return this.categoryGradient(item.category);
  }

  categoryPillClass(category: CategoryFilter): string {
    const active = this.selectedCategory() === category;
    return active
        ? 'bg-brand-navy text-white shadow-lg'
        : 'bg-white text-gray-700 hover:bg-brand-orange hover:text-white';
  }

  tagPillClass(tag: string): string {
    const active = this.isTagSelected(tag);
    return active
        ? 'bg-brand-navy text-white border-brand-navy'
        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-orange hover:text-brand-orange';
  }

  reviewStars(reviewRating: number | undefined): number[] {
    const safeRating = Math.max(0, Math.min(5, Math.round(reviewRating ?? 0)));
    return this.ratingStars.slice(0, safeRating);
  }

  private resetPagination(): void {
    this.currentPage.set(1);
  }

  private syncCategoryQueryParam(category: CategoryFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === 'All' ? null : category },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private resolveCategoryFromQuery(category: string | null): CategoryFilter {
    return this.isValidCategory(category) ? category : 'All';
  }

  private isValidCategory(value: string | null): value is CategoryFilter {
    return value !== null && (this.categoryFilters as readonly string[]).includes(value);
  }

  private toProduct(item: MarketplaceBook): Product {
    return {
      id: parseInt(item.id) || 0,
      name: item.title,
      category: this.mapCategory(item.category),
      price: item.priceFrom,
      image: this.categoryGradient(item.category),
      description: item.shortDescription,
      specs: [
        item.bindingType,
        ...item.tags.slice(0, 2),
        `${item.quantity} in stock`
      ],
    };
  }

  private mapCategory(category: string): ProductCategory {
    switch (category) {
      case 'Business Cards':
      case 'Calendars':
        return 'business';
      case 'Books':
        return 'photo';
      case 'Posters':
      case 'Flyers':
      case 'Brochures':
      default:
        return 'marketing';
    }
  }

  private categoryGradient(category: string): string {
    switch (category) {
      case 'Books':
        return 'linear-gradient(135deg, #FF6B9D 0%, #8338EC 100%)';
      case 'Calendars':
        return 'linear-gradient(135deg, #00D9C0 0%, #3A86FF 100%)';
      case 'Posters':
        return 'linear-gradient(135deg, #FF6B35 0%, #FF006E 100%)';
      case 'Flyers':
        return 'linear-gradient(135deg, #CCFF00 0%, #00D9C0 100%)';
      case 'Business Cards':
        return 'linear-gradient(135deg, #1A1A2E 0%, #3A86FF 100%)';
      case 'Brochures':
      default:
        return 'linear-gradient(135deg, #FFBE0B 0%, #00D9C0 100%)';
    }
  }

  private readInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    return target?.value ?? '';
  }

  private readCheckedValue(event: Event): boolean {
    const target = event.target as HTMLInputElement | null;
    return target?.checked ?? false;
  }

  private readNumericValue(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    const value = Number(target?.value);
    return Number.isFinite(value) ? value : fallback;
  }
}
