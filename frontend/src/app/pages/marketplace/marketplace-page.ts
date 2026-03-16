import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { Product, ProductCategory } from '../../core/models/product';
import { UiService } from '../../core/services/ui.service';
import { MARKETPLACE_ITEMS } from './marketplace.data';
import { MARKETPLACE_CATEGORIES, MarketplaceCategory, MarketplaceItem } from './marketplace.types';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type CategoryFilter = 'All' | MarketplaceCategory;
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating-desc' | 'reviews-desc' | 'title-asc';

interface SortItem {
  value: SortOption;
  label: string;
}

@Component({
  selector: 'app-marketplace-page',
  imports: [CurrencyPipe, NgOptimizedImage, RevealOnScrollDirective],
  templateUrl: './marketplace-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplacePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly ui = inject(UiService);

  private readonly productsCache = new Map<string, Product>();

  readonly categoryFilters: readonly CategoryFilter[] = ['All', ...MARKETPLACE_CATEGORIES];
  readonly sortItems: readonly SortItem[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to high' },
    { value: 'price-desc', label: 'Price: High to low' },
    { value: 'rating-desc', label: 'Top rated' },
    { value: 'reviews-desc', label: 'Most reviewed' },
    { value: 'title-asc', label: 'Title: A to Z' },
  ];
  readonly skeletonCards = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  readonly itemsPerPage = 9;

  readonly minPriceBoundary = Math.floor(Math.min(...MARKETPLACE_ITEMS.map((item) => item.priceFrom)));
  readonly maxPriceBoundary = Math.ceil(Math.max(...MARKETPLACE_ITEMS.map((item) => item.priceFrom)));

  readonly isLoading = signal(true);
  readonly items = signal<MarketplaceItem[]>([]);
  readonly searchQuery = signal('');
  readonly selectedCategory = signal<CategoryFilter>('All');
  readonly selectedSort = signal<SortOption>('featured');
  readonly availableOnly = signal(false);
  readonly minPrice = signal(this.minPriceBoundary);
  readonly maxPrice = signal(this.maxPriceBoundary);
  readonly selectedTags = signal<string[]>([]);
  readonly currentPage = signal(1);

  readonly allTags = computed(() =>
    Array.from(new Set(this.items().flatMap((item) => item.tags))).sort((left, right) =>
      left.localeCompare(right),
    ),
  );

  readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const sort = this.selectedSort();
    const availableOnly = this.availableOnly();
    const minPrice = this.minPrice();
    const maxPrice = this.maxPrice();
    const selectedTags = this.selectedTags();

    const filtered = this.items().filter((item) => {
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

      const haystack = `${item.title} ${item.category} ${item.shortDescription} ${item.tags.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];

    switch (sort) {
      case 'price-asc':
        sorted.sort((left, right) => left.priceFrom - right.priceFrom);
        return sorted;
      case 'price-desc':
        sorted.sort((left, right) => right.priceFrom - left.priceFrom);
        return sorted;
      case 'rating-desc':
        sorted.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
        return sorted;
      case 'reviews-desc':
        sorted.sort((left, right) => (right.reviewsCount ?? 0) - (left.reviewsCount ?? 0));
        return sorted;
      case 'title-asc':
        sorted.sort((left, right) => left.title.localeCompare(right.title));
        return sorted;
      case 'featured':
      default:
        return sorted;
    }
  });

  readonly totalResults = computed(() => this.filteredItems().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalResults() / this.itemsPerPage)));
  readonly safeCurrentPage = computed(() => Math.min(this.currentPage(), this.totalPages()));

  readonly paginatedItems = computed(() => {
    const start = (this.safeCurrentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredItems().slice(start, end);
  });

  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  readonly visibleRangeStart = computed(() => {
    if (this.totalResults() === 0) return 0;
    return (this.safeCurrentPage() - 1) * this.itemsPerPage + 1;
  });
  readonly visibleRangeEnd = computed(() => Math.min(this.safeCurrentPage() * this.itemsPerPage, this.totalResults()));
  readonly activeFilterCount = computed(() => {
    let count = 0;

    if (this.searchQuery().trim().length > 0) count += 1;
    if (this.selectedCategory() !== 'All') count += 1;
    if (this.availableOnly()) count += 1;
    if (this.minPrice() !== this.minPriceBoundary || this.maxPrice() !== this.maxPriceBoundary) count += 1;
    count += this.selectedTags().length;

    return count;
  });
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  constructor() {
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

    const timer = setTimeout(() => {
      this.items.set(MARKETPLACE_ITEMS);
      this.isLoading.set(false);
    }, 350);

    this.destroyRef.onDestroy(() => clearTimeout(timer));
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
    const value = this.readNumericValue(event, this.minPriceBoundary);
    const normalized = Math.min(Math.max(value, this.minPriceBoundary), this.maxPrice());
    this.minPrice.set(normalized);
    this.resetPagination();
  }

  onMaxPriceChange(event: Event): void {
    const value = this.readNumericValue(event, this.maxPriceBoundary);
    const normalized = Math.max(Math.min(value, this.maxPriceBoundary), this.minPrice());
    this.maxPrice.set(normalized);
    this.resetPagination();
  }

  toggleTag(tag: string): void {
    this.selectedTags.update((current) =>
      current.includes(tag) ? current.filter((existing) => existing !== tag) : [...current, tag],
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
    this.minPrice.set(this.minPriceBoundary);
    this.maxPrice.set(this.maxPriceBoundary);
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

  quickView(item: MarketplaceItem): void {
    this.router.navigate(['/products', item.id]);
  }

  addToCart(item: MarketplaceItem): void {
    if (!item.isAvailable) {
      return;
    }

    this.cart.add(this.toProduct(item), 1);
    this.ui.openCart();
  }

  categoryVisual(item: MarketplaceItem): string {
    if (item.imageUrl) {
      return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
    }

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
    return this.isMarketplaceCategory(category) ? category : 'All';
  }

  private isMarketplaceCategory(value: string | null): value is MarketplaceCategory {
    return value !== null && (MARKETPLACE_CATEGORIES as readonly string[]).includes(value);
  }

  private toProduct(item: MarketplaceItem): Product {
    const cached = this.productsCache.get(item.id);
    if (cached) return cached;

    const product: Product = {
      id: MARKETPLACE_ITEMS.findIndex((entry) => entry.id === item.id) + 1000,
      name: item.title,
      category: this.mapCategory(item.category),
      price: item.priceFrom,
      image: this.categoryGradient(item.category),
      description: item.shortDescription,
      specs: [
        `${item.category} product`,
        ...item.tags.slice(0, 2),
      ],
    };

    this.productsCache.set(item.id, product);
    return product;
  }

  private mapCategory(category: MarketplaceCategory): ProductCategory {
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

  private categoryGradient(category: MarketplaceCategory): string {
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
