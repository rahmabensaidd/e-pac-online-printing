import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';
import { buildProductDetailsFromMarketplaceBook, getProductDetailsByKey } from '../../core/catalog/product-details';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { MarketplaceService } from '../marketplace/marketplace.service';

@Component({
  selector: 'app-product-details-page',
  imports: [CurrencyPipe, RouterLink, RevealOnScrollDirective],
  templateUrl: './product-details-page.html',
  styleUrl: './product-details-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly ui = inject(UiService);
  private readonly marketplaceService = inject(MarketplaceService);

  private readonly detailsKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly marketplaceLoading = computed(() => this.marketplaceService.loading());
  readonly details = computed(() => {
    const key = this.detailsKey();
    const liveBook = this.marketplaceService.marketplaceBooks().find((book) => book.id === key);
    return liveBook ? buildProductDetailsFromMarketplaceBook(liveBook) : getProductDetailsByKey(key);
  });
  readonly waitingForMarketplaceBook = computed(() => {
    const key = this.detailsKey().trim();
    return /^\d+$/.test(key) && !this.details() && this.marketplaceLoading();
  });
  readonly browseButtonLabel = computed(() => {
    const detail = this.details();
    if (!detail) {
      return 'Browse catalog';
    }

    return detail.marketplaceCategory ? `Browse ${detail.marketplaceCategory}` : 'Browse catalog';
  });
  readonly availabilityTone = computed(() => {
    return this.details()?.isAvailable
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';
  });
  readonly previewSurfaceStyle = computed(() => {
    const detail = this.details();
    if (!detail) {
      return {} as Record<string, string>;
    }

    if (detail.imageStyle.startsWith('url(')) {
      return {
        backgroundImage: detail.imageStyle,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      };
    }

    return { background: detail.imageStyle };
  });

  async addToCart(): Promise<void> {
    const detail = this.details();
    if (!detail || !detail.isAvailable) {
      return;
    }

    try {
      await this.cart.add(detail.cartProduct, 1);
      this.ui.openCart();
    } catch {
      this.ui.showToast?.({
        message: 'Unable to add this product to cart right now',
        type: 'error'
      });
    }
  }

  browseCatalog(): void {
    const detail = this.details();
    if (!detail?.marketplaceCategory) {
      this.router.navigateByUrl('/marketplace');
      return;
    }

    this.router.navigate(['/marketplace'], {
      queryParams: { category: detail.marketplaceCategory },
    });
  }

}
