import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product';
import { UiService } from '../../core/services/ui.service';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type SimulatorProductType = 'Book' | 'Magazine' | 'Journal';
type BindingType = 'Saddle Stitched (Booklet)' | 'Perfect Bound' | 'Casebound Hardcover';
type InteriorPaper = 'Offset Smooth (80lb)' | 'Premium Matte (100lb)' | 'Silk Coated (100lb)';
type CoverFinish = 'Matte' | 'Glossy' | 'Soft-Touch';
type TrimSize = '6" x 9"' | '8.5" x 11"' | '5.5" x 8.5"';
type PrintColor = 'Standard Color' | 'Rich Color' | 'Black and White';
type Lamination = 'No Lamination' | 'Matte Lamination' | 'Gloss Lamination';

@Component({
  selector: 'app-price-simulator-page',
  imports: [CurrencyPipe, RouterLink, RevealOnScrollDirective],
  templateUrl: './price-simulator-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceSimulatorPageComponent {
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly ui = inject(UiService);

  readonly productTypes: readonly SimulatorProductType[] = ['Book', 'Magazine', 'Journal'];
  readonly bindingOptions: readonly BindingType[] = [
    'Saddle Stitched (Booklet)',
    'Perfect Bound',
    'Casebound Hardcover',
  ];
  readonly interiorPaperOptions: readonly InteriorPaper[] = [
    'Offset Smooth (80lb)',
    'Premium Matte (100lb)',
    'Silk Coated (100lb)',
  ];
  readonly coverFinishOptions: readonly CoverFinish[] = ['Matte', 'Glossy', 'Soft-Touch'];
  readonly trimSizeOptions: readonly TrimSize[] = ['6" x 9"', '8.5" x 11"', '5.5" x 8.5"'];
  readonly printColorOptions: readonly PrintColor[] = ['Standard Color', 'Rich Color', 'Black and White'];
  readonly laminationOptions: readonly Lamination[] = ['No Lamination', 'Matte Lamination', 'Gloss Lamination'];

  readonly manuscriptName = signal<string | null>(null);
  readonly projectTitle = signal('Your Title');
  readonly authorName = signal('Author Name');
  readonly productType = signal<SimulatorProductType>('Book');
  readonly bindingType = signal<BindingType>('Saddle Stitched (Booklet)');
  readonly interiorPaper = signal<InteriorPaper>('Offset Smooth (80lb)');
  readonly coverFinish = signal<CoverFinish>('Matte');
  readonly trimSize = signal<TrimSize>('6" x 9"');
  readonly printColor = signal<PrintColor>('Standard Color');
  readonly lamination = signal<Lamination>('No Lamination');
  readonly pageCount = signal(24);
  readonly quantity = signal(1);
  readonly proofCopy = signal(false);
  readonly isbnSupport = signal(false);
  readonly rushProduction = signal(false);

  private readonly baseByProduct: Record<SimulatorProductType, number> = {
    Book: 3.2,
    Magazine: 2.7,
    Journal: 3.6,
  };

  private readonly bindingMultiplier: Record<BindingType, number> = {
    'Saddle Stitched (Booklet)': 1,
    'Perfect Bound': 1.18,
    'Casebound Hardcover': 1.42,
  };

  private readonly paperPerPage: Record<InteriorPaper, number> = {
    'Offset Smooth (80lb)': 0.11,
    'Premium Matte (100lb)': 0.13,
    'Silk Coated (100lb)': 0.15,
  };

  private readonly colorPerPage: Record<PrintColor, number> = {
    'Standard Color': 0.055,
    'Rich Color': 0.07,
    'Black and White': 0.03,
  };

  private readonly coverFinishPerUnit: Record<CoverFinish, number> = {
    Matte: 1.2,
    Glossy: 1.35,
    'Soft-Touch': 1.55,
  };

  private readonly laminationPerUnit: Record<Lamination, number> = {
    'No Lamination': 0,
    'Matte Lamination': 0.18,
    'Gloss Lamination': 0.16,
  };

  private readonly trimMultiplier: Record<TrimSize, number> = {
    '6" x 9"': 1,
    '8.5" x 11"': 1.12,
    '5.5" x 8.5"': 0.94,
  };

  readonly quantityDiscountFactor = computed(() => {
    const qty = this.quantity();
    if (qty >= 2500) return 0.82;
    if (qty >= 1000) return 0.87;
    if (qty >= 500) return 0.92;
    if (qty >= 250) return 0.95;
    return 1;
  });

  readonly estimatedUnitPrice = computed(() => {
    const base = this.baseByProduct[this.productType()] * this.bindingMultiplier[this.bindingType()];
    const paper = this.pageCount() * this.paperPerPage[this.interiorPaper()];
    const color = this.pageCount() * this.colorPerPage[this.printColor()];
    const cover = this.coverFinishPerUnit[this.coverFinish()];
    const lamination = this.laminationPerUnit[this.lamination()];
    const trim = this.trimMultiplier[this.trimSize()];

    const unit = (base + paper + color + cover + lamination) * trim;
    return Math.max(0.6, unit * this.quantityDiscountFactor());
  });

  readonly setupFee = computed(() => {
    if (this.productType() === 'Magazine') return 0.72;
    if (this.productType() === 'Journal') return 1.24;
    return 0.84;
  });

  readonly addOnTotal = computed(() => {
    let total = 0;
    if (this.proofCopy()) total += 3.2;
    if (this.isbnSupport()) total += 6.8;
    return total;
  });

  readonly productionSubtotal = computed(() => this.estimatedUnitPrice() * this.quantity());
  readonly rushFee = computed(() => (this.rushProduction() ? this.productionSubtotal() * 0.1 : 0));
  readonly estimatedTotal = computed(() => this.productionSubtotal() + this.setupFee() + this.addOnTotal() + this.rushFee());

  readonly previewMeta = computed(() => `${this.trimSize()} • ${this.bindingType()}`);
  readonly isBookVisual = computed(() => this.productType() === 'Book');
  readonly isMagazineVisual = computed(() => this.productType() === 'Magazine');
  readonly isJournalVisual = computed(() => this.productType() === 'Journal');
  readonly isSaddleStitchedVisual = computed(() => this.bindingType() === 'Saddle Stitched (Booklet)');
  readonly isPerfectBoundVisual = computed(() => this.bindingType() === 'Perfect Bound');
  readonly isCaseboundVisual = computed(() => this.bindingType() === 'Casebound Hardcover');

  readonly previewCoverShapeClass = computed(() => {
    if (this.isMagazineVisual()) {
      return 'w-56 h-80 sm:w-60 sm:h-84 rounded-md';
    }

    if (this.isJournalVisual()) {
      return 'w-56 h-80 sm:w-60 sm:h-84 rounded-2xl';
    }

    return 'w-58 h-80 sm:w-64 sm:h-92 rounded-r-lg';
  });

  readonly previewCoverToneClass = computed(() => {
    if (this.isMagazineVisual()) {
      return 'bg-linear-to-br from-brand-orange via-brand-pink to-brand-teal';
    }

    if (this.isJournalVisual()) {
      return 'bg-linear-to-br from-brand-navy via-brand-orange to-brand-pink';
    }

    return 'bg-linear-to-br from-brand-navy via-brand-teal to-brand-orange';
  });

  constructor() {
    const productParam = this.route.snapshot.queryParamMap.get('product')?.toLowerCase();
    const titleParam = this.route.snapshot.queryParamMap.get('title');

    if (titleParam?.trim()) {
      this.projectTitle.set(titleParam.trim());
    }

    if (productParam === 'magazine') {
      this.productType.set('Magazine');
      return;
    }

    if (productParam === 'journal') {
      this.productType.set('Journal');
      return;
    }

    if (productParam === 'book') {
      this.productType.set('Book');
    }
  }

  onManuscriptChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    this.manuscriptName.set(file?.name ?? null);
  }

  setProductType(type: SimulatorProductType): void {
    this.productType.set(type);
  }

  setBindingType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.bindingOptions.includes(value as BindingType)) {
      this.bindingType.set(value as BindingType);
    }
  }

  setInteriorPaper(event: Event): void {
    const value = this.readInputValue(event);
    if (this.interiorPaperOptions.includes(value as InteriorPaper)) {
      this.interiorPaper.set(value as InteriorPaper);
    }
  }

  setTrimSize(event: Event): void {
    const value = this.readInputValue(event);
    if (this.trimSizeOptions.includes(value as TrimSize)) {
      this.trimSize.set(value as TrimSize);
    }
  }

  setPrintColor(event: Event): void {
    const value = this.readInputValue(event);
    if (this.printColorOptions.includes(value as PrintColor)) {
      this.printColor.set(value as PrintColor);
    }
  }

  setLamination(event: Event): void {
    const value = this.readInputValue(event);
    if (this.laminationOptions.includes(value as Lamination)) {
      this.lamination.set(value as Lamination);
    }
  }

  setCoverFinish(finish: CoverFinish): void {
    this.coverFinish.set(finish);
  }

  onTitleChange(event: Event): void {
    this.projectTitle.set(this.readInputValue(event) || 'Your Title');
  }

  onAuthorChange(event: Event): void {
    this.authorName.set(this.readInputValue(event) || 'Author Name');
  }

  onPageCountChange(event: Event): void {
    const pageCount = this.readNumericValue(event, this.pageCount());
    const normalized = Math.min(Math.max(Math.round(pageCount), 24), 480);
    this.pageCount.set(normalized);
  }

  onQuantityChange(event: Event): void {
    const quantity = this.readNumericValue(event, this.quantity());
    const normalized = Math.min(Math.max(Math.round(quantity), 1), 5000);
    this.quantity.set(normalized);
  }

  onProofCopyChange(event: Event): void {
    this.proofCopy.set(this.readCheckedValue(event));
  }

  onIsbnSupportChange(event: Event): void {
    this.isbnSupport.set(this.readCheckedValue(event));
  }

  onRushProductionChange(event: Event): void {
    this.rushProduction.set(this.readCheckedValue(event));
  }

  addToCart(): void {
    const product: Product = {
      id: Date.now(),
      name: `${this.projectTitle()} (${this.productType()})`,
      category: 'custom',
      price: Number(this.estimatedTotal().toFixed(2)),
      image: this.productGradient(),
      description: 'Personalized print order configured with live price simulation.',
      specs: [
        `Trim: ${this.trimSize()}`,
        `Binding: ${this.bindingType()}`,
        `Paper: ${this.interiorPaper()}`,
        `Pages: ${this.pageCount()}`,
        `Quantity: ${this.quantity()}`,
      ],
    };

    this.cart.add(product, 1);
    this.ui.openCart();
  }

  productTypeClass(type: SimulatorProductType): string {
    const active = this.productType() === type;
    return active
      ? 'bg-brand-navy text-white border-brand-navy'
      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-orange hover:text-brand-navy';
  }

  coverFinishClass(finish: CoverFinish): string {
    const active = this.coverFinish() === finish;
    return active
      ? 'text-brand-navy font-bold'
      : 'text-gray-600';
  }

  private readInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    return target?.value ?? '';
  }

  private productGradient(): string {
    if (this.isMagazineVisual()) {
      return 'linear-gradient(135deg, #FF6B35 0%, #FF006E 55%, #00D9C0 100%)';
    }

    if (this.isJournalVisual()) {
      return 'linear-gradient(135deg, #1A1A2E 0%, #FF6B35 55%, #FF006E 100%)';
    }

    return 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 55%, #FF6B35 100%)';
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
