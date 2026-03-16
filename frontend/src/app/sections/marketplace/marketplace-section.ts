import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, ProductCategory } from '../../core/models/product';
import { CartService } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';
import { MarketplaceCategory } from '../../pages/marketplace/marketplace.types';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type Filter = 'all' | Exclude<ProductCategory, 'custom'>;
type ProductWithMarketplaceCategory = Product & {
  marketplaceCategory: MarketplaceCategory;
  detailsKey: string;
};

@Component({
  selector: 'app-marketplace-section',
  imports: [CurrencyPipe, RouterLink, RevealOnScrollDirective],
  templateUrl: './marketplace-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceSectionComponent {
  readonly cart = inject(CartService);
  readonly ui = inject(UiService);
  readonly maxProductsBeforeDiscoveryCard = 7;

  readonly filter = signal<Filter>('all');

  readonly products: ProductWithMarketplaceCategory[] = [
    {
      id: 1,
      name: 'Business Cards',
      category: 'business',
      marketplaceCategory: 'Business Cards',
      detailsKey: 'card-matte-standard',
      price: 12.5,
      image: 'linear-gradient(135deg, #FF6B35 0%, #FF8E72 100%)',
      description: 'Premium 16pt matte finish business cards with full color printing.',
      specs: ['3.5" × 2" standard', '16pt premium stock', 'Full color both sides'],
    },
    {
      id: 2,
      name: 'Flyers',
      category: 'marketing',
      marketplaceCategory: 'Flyers',
      detailsKey: 'flyer-premium-a4',
      price: 35.0,
      image: 'linear-gradient(135deg, #00D9C0 0%, #00B4A6 100%)',
      description: 'Vibrant flyers perfect for events, promotions, and announcements.',
      specs: ['8.5" × 11" letter', '100lb gloss text', 'Full bleed printing'],
    },
    {
      id: 3,
      name: 'Posters',
      category: 'marketing',
      marketplaceCategory: 'Posters',
      detailsKey: 'poster-matte-a2',
      price: 18.99,
      image: 'linear-gradient(135deg, #FF006E 0%, #8338EC 100%)',
      description: 'High-quality posters for indoor displays and presentations.',
      specs: ['18" × 24"', 'Photo quality paper', 'UV resistant ink'],
    },
    {
      id: 4,
      name: 'Brochures',
      category: 'marketing',
      marketplaceCategory: 'Brochures',
      detailsKey: 'brochure-trifold-classic',
      price: 89.0,
      image: 'linear-gradient(135deg, #FFBE0B 0%, #FB5607 100%)',
      description: 'Tri-fold brochures that tell your brand story beautifully.',
      specs: ['11" × 8.5" flat', '100lb matte cover', 'Six panel design'],
    },
    {
      id: 5,
      name: 'Postcards',
      category: 'marketing',
      marketplaceCategory: 'Flyers',
      detailsKey: 'featured-postcards',
      price: 25.0,
      image: 'linear-gradient(135deg, #3A86FF 0%, #8338EC 100%)',
      description: 'Direct mail postcards that grab attention instantly.',
      specs: ['6" × 4"', '14pt cardstock', 'UV coating available'],
    },
    {
      id: 6,
      name: 'Stickers',
      category: 'packaging',
      marketplaceCategory: 'Brochures',
      detailsKey: 'featured-stickers',
      price: 15.0,
      image: 'linear-gradient(135deg, #CCFF00 0%, #9EF01A 100%)',
      description: 'Durable vinyl stickers for branding and decoration.',
      specs: ['Custom sizes', 'Waterproof vinyl', 'Die-cut available'],
    },
    {
      id: 7,
      name: 'Calendars',
      category: 'business',
      marketplaceCategory: 'Calendars',
      detailsKey: 'calendar-wall-classic',
      price: 12.99,
      image: 'linear-gradient(135deg, #FF6B9D 0%, #C44569 100%)',
      description: 'Wall calendars with your custom photos and branding.',
      specs: ['12" × 12"', 'Saddle stitched', '13 months'],
    },
    {
      id: 8,
      name: 'Photo Books',
      category: 'photo',
      marketplaceCategory: 'Books',
      detailsKey: 'book-layflat-photo',
      price: 24.99,
      image: 'linear-gradient(135deg, #00F5FF 0%, #00B8D4 100%)',
      description: 'Hardcover photo books to preserve your memories.',
      specs: ['8" × 8"', '20 pages included', 'Lay-flat binding'],
    },
  ];

  readonly filteredProducts = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.products;
    return this.products.filter((p) => p.category === f);
  });
  readonly sectionProducts = computed(() =>
    this.filteredProducts().slice(0, this.maxProductsBeforeDiscoveryCard),
  );
  readonly headerCtaQueryParams = computed<Record<string, string> | undefined>(() => {
    const categories = Array.from(new Set(this.filteredProducts().map((product) => product.marketplaceCategory)));
    if (categories.length !== 1) {
      return undefined;
    }

    return { category: categories[0] };
  });

  setFilter(filter: Filter): void {
    this.filter.set(filter);
  }

  addToCart(p: ProductWithMarketplaceCategory): void {
    this.cart.add(p, 1);
    this.ui.openCart();
  }
}
