import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product';
import { UiService } from '../../core/services/ui.service';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { AuthService } from '../../core/services/auth.service';

type SimulatorProductType = 'Book' | 'Magazine' | 'Journal';
type BindingType =
    | ''
    | 'CASEBIND'
    | 'CASEBIND_INS'
    | 'CASEBIND_ES'
    | 'CASEBIND_ES_INS'
    | 'PERFECT'
    | 'PERFECT_INS'
    | 'PERFECT_NC'
    | 'PERFECT_NC_INS'
    | 'COILHARD'
    | 'COILHARD_INS'
    | 'COILHARD_TAB'
    | 'COILSOFT'
    | 'LOOSELEAF'
    | 'LOOSELEAF_INS'
    | 'LOOSELEAF_NC'
    | 'LOOSELEAF_NC_INS'
    | 'LOOSELEAF_NC_Tab'
    | 'SS'
    | 'CARD'
    | 'DIVIDER_SHEET'
    | 'NONE';
type BindingFamily = 'CASEBIND' | 'PERFECT' | 'COILHARD' | 'COILSOFT' | 'LOOSELEAF' | 'SS' | 'CARD' | 'DIVIDER_SHEET';

type TextPaperType =
    | 'NONE'
    | 'PT_10_C2S'
    | 'PT_12_C2S'
    | 'PAP1_70'
    | 'PAP1_75'
    | 'LETSGO_MATTE_115'
    | 'LETSGO_MATTE_90'
    | 'BIRCH_W40_TB'
    | 'FSC_MC_CVG_SILKHO_1_0_70'
    | 'FSC_MC_CVG_SILKHO_1_061'
    | 'FSC_MC_DOM_VJT_1_21_75'
    | 'FSC_MC_DOM_VJT_1_29_90'
    | 'GLOSS_80_TEXT'
    | 'GLOSS_80_COVER';

type TextColor = 'ONE_ONE' | 'FOUR_FOUR';

type CoverPaperType =
    | 'NONE'
    | 'GLOSS_TEXT_100'
    | 'GLOSS_TEXT_80'
    | 'GLOSS_COVER_80'
    | 'PT10_C1S'
    | 'PT12_C1S'
    | 'PT16_C1S'
    | 'PT10_C2S'
    | 'PT12_C2S';

type CoverFinish = 'LAYFLAT_GLOSS' | 'LAYFLAT_MATTE_SCUFF_FREE' | 'LAYFLAT_MATTE' | 'MATT';
type CoverColor = 'FOUR_FOUR' | 'FOUR_ZERO' | 'FOUR_ONE' | 'ZERO_ZERO' | 'ONE_ZERO';
type PriorityLevel = 'NORMAL' | 'HIGH1' | 'HIGH2' | 'HIGH3';
type HeadAndTail = 'BLACK_AND_WHITE' | 'WHITE' | 'NONE';
type TrimSize = '6" x 9"' | '8.5" x 11"' | '5.5" x 8.5"';
type CoilType = 'NONE' | 'METAL' | 'PLASTIC';
type TabColor = 'NONE' | 'FULL_COLOR_4_4' | 'FRONT_COLOR_4_0' | 'MONO_1_1';
type InsertPaperType = 'NONE' | 'C1S_10PT' | 'C2S_10PT' | 'C2S_12PT' | 'GLOSS_TEXT_80';
type CaseFinishType = 'NONE' | 'LAYFLAT_GLOSS' | 'LAYFLAT_MATTE' | 'GLOSS_FILM';
type SpineType = 'NONE' | 'ROUND' | 'SQUARE';
type LabelType = 'NONE' | 'STANDARD' | 'ISBN' | 'OTHER';

@Component({
  selector: 'app-price-simulator-page',
  imports: [CurrencyPipe, RouterLink, RevealOnScrollDirective],
  templateUrl: './price-simulator-page.html',
  styleUrl: './price-simulator-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class PriceSimulatorPageComponent {
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);

  readonly authMessage = signal('');

  readonly bindingTypeLabels: Record<BindingType, string> = {
    '': 'Select binding type',
    CASEBIND: 'Casebind',
    CASEBIND_INS: 'Casebind with insert',
    CASEBIND_ES: 'Casebind with Endsheet',
    CASEBIND_ES_INS: 'Casebind with Endsheet and insert',
    PERFECT: 'Perfect',
    PERFECT_INS: 'Perfect with insert',
    PERFECT_NC: 'Perfect (No Cover)',
    PERFECT_NC_INS: 'Perfect with insert (No Cover)',
    COILHARD: 'Coil Hard',
    COILHARD_INS: 'Coil Hard with insert',
    COILHARD_TAB: 'Coil Hard with Tab',
    COILSOFT: 'Coil Soft',
    LOOSELEAF: 'Looseleaf',
    LOOSELEAF_INS: 'Looseleaf with insert',
    LOOSELEAF_NC: 'Looseleaf (No Cover)',
    LOOSELEAF_NC_INS: 'Looseleaf (No Cover) with insert',
    LOOSELEAF_NC_Tab: 'Looseleaf (No Cover) with tab',
    SS: 'Saddle Stitch',
    CARD: 'Card',
    DIVIDER_SHEET: 'Divider Sheet',
    NONE: 'None',
  };

  readonly bindingTypeImages: Record<string, string> = {
    CASEBIND: '/books/casebind.png',
    PERFECT: '/books/perfect.png',
    COILHARD: '/books/coilhard.png',
    COILSOFT: '/books/coilsoft.png',
    LOOSELEAF: '/books/loosleaf.png',
    SS: '/books/saddlestitch.png',
    DIVIDER_SHEET: '/books/dividersheet.png',
    CARD:'/books/cart.png'
  };

  readonly bindingFamilies: readonly BindingFamily[] = [
    'CASEBIND',
    'PERFECT',
    'COILHARD',
    'COILSOFT',
    'LOOSELEAF',
    'SS',
    'CARD',
    'DIVIDER_SHEET',
  ];

  readonly bindingSpecsByFamily: Readonly<Record<BindingFamily, readonly BindingType[]>> = {
    CASEBIND: ['CASEBIND', 'CASEBIND_INS', 'CASEBIND_ES', 'CASEBIND_ES_INS'],
    PERFECT: ['PERFECT', 'PERFECT_INS', 'PERFECT_NC', 'PERFECT_NC_INS'],
    COILHARD: ['COILHARD', 'COILHARD_INS', 'COILHARD_TAB'],
    COILSOFT: ['COILSOFT'],
    LOOSELEAF: ['LOOSELEAF', 'LOOSELEAF_INS', 'LOOSELEAF_NC', 'LOOSELEAF_NC_INS', 'LOOSELEAF_NC_Tab'],
    SS: ['SS'],
    CARD: ['CARD'],
    DIVIDER_SHEET: ['DIVIDER_SHEET'],
  };

  readonly bindingFamilyLabels: Readonly<Record<BindingFamily, string>> = {
    CASEBIND: 'Casebind',
    PERFECT: 'Perfect',
    COILHARD: 'Coil Hard',
    COILSOFT: 'Coil Soft',
    LOOSELEAF: 'Looseleaf',
    SS: 'Saddle Stitch',
    CARD: 'Card',
    DIVIDER_SHEET: 'Divider Sheet',
  };

  readonly textPaperTypeLabels: Record<TextPaperType, string> = {
    NONE: 'Standard / Auto (NONE)',
    PT_10_C2S: 'Coated Cardstock 10 pt (PT_10_C2S)',
    PT_12_C2S: 'Coated Cardstock 12 pt (PT_12_C2S)',
    PAP1_70: 'Uncoated Offset 70 gsm (PAP1_70)',
    PAP1_75: 'Uncoated Offset 75 gsm (PAP1_75)',
    LETSGO_MATTE_115: 'Matte Paper 115 gsm (LETSGO_MATTE_115)',
    LETSGO_MATTE_90: 'Matte Paper 90 gsm (LETSGO_MATTE_90)',
    BIRCH_W40_TB: 'Birch White Text 40 lb (BIRCH_W40_TB)',
    FSC_MC_CVG_SILKHO_1_0_70: 'FSC Silk 70 gsm (FSC_MC_CVG_SILKHO_1_0_70)',
    FSC_MC_CVG_SILKHO_1_061: 'FSC Silk 61 gsm (FSC_MC_CVG_SILKHO_1_061)',
    FSC_MC_DOM_VJT_1_21_75: 'FSC VJT 75 gsm (FSC_MC_DOM_VJT_1_21_75)',
    FSC_MC_DOM_VJT_1_29_90: 'FSC VJT 90 gsm (FSC_MC_DOM_VJT_1_29_90)',
    GLOSS_80_TEXT: 'Gloss Text 80 gsm (GLOSS_80_TEXT)',
    GLOSS_80_COVER: 'Gloss Cover 80 gsm (GLOSS_80_COVER)',
  };

  readonly coverPaperTypeLabels: Record<CoverPaperType, string> = {
    NONE: 'Standard / Auto (NONE)',
    GLOSS_TEXT_100: 'Gloss Text 100 gsm (GLOSS_TEXT_100)',
    GLOSS_TEXT_80: 'Gloss Text 80 gsm (GLOSS_TEXT_80)',
    GLOSS_COVER_80: 'Gloss Cover 80 gsm (GLOSS_COVER_80)',
    PT10_C1S: 'Coated One Side 10 pt (PT10_C1S)',
    PT12_C1S: 'Coated One Side 12 pt (PT12_C1S)',
    PT16_C1S: 'Coated One Side 16 pt (PT16_C1S)',
    PT10_C2S: 'Coated Two Sides 10 pt (PT10_C2S)',
    PT12_C2S: 'Coated Two Sides 12 pt (PT12_C2S)',
  };

  readonly textColorLabels: Record<TextColor, string> = {
    ONE_ONE: 'Black/Black (1/1)',
    FOUR_FOUR: 'Full Color/Full Color (4/4)',
  };

  readonly coverColorLabels: Record<CoverColor, string> = {
    FOUR_FOUR: 'Full Color outside + inside (4/4)',
    FOUR_ZERO: 'Full Color outside only (4/0)',
    FOUR_ONE: 'Full Color outside + black inside (4/1)',
    ZERO_ZERO: 'No print (0/0)',
    ONE_ZERO: 'Black outside only (1/0)',
  };

  readonly productTypes: readonly SimulatorProductType[] = ['Book', 'Magazine', 'Journal'];

  readonly bindingOptions: readonly BindingType[] = [
    '',
    ...this.bindingFamilies.flatMap((family) => this.bindingSpecsByFamily[family]),
    'NONE',
  ];

  readonly textPaperTypeOptions: readonly TextPaperType[] = [
    'NONE',
    'PT_10_C2S',
    'PT_12_C2S',
    'PAP1_70',
    'PAP1_75',
    'LETSGO_MATTE_115',
    'LETSGO_MATTE_90',
    'BIRCH_W40_TB',
    'FSC_MC_CVG_SILKHO_1_0_70',
    'FSC_MC_CVG_SILKHO_1_061',
    'FSC_MC_DOM_VJT_1_21_75',
    'FSC_MC_DOM_VJT_1_29_90',
    'GLOSS_80_TEXT',
    'GLOSS_80_COVER',
  ];

  readonly textColorOptions: readonly TextColor[] = ['ONE_ONE', 'FOUR_FOUR'];

  readonly coverPaperTypeOptions: readonly CoverPaperType[] = [
    'NONE',
    'GLOSS_TEXT_100',
    'GLOSS_TEXT_80',
    'GLOSS_COVER_80',
    'PT10_C1S',
    'PT12_C1S',
    'PT16_C1S',
    'PT10_C2S',
    'PT12_C2S',
  ];

  readonly coverFinishOptions: readonly CoverFinish[] = [
    'MATT',
    'LAYFLAT_GLOSS',
    'LAYFLAT_MATTE_SCUFF_FREE',
    'LAYFLAT_MATTE',
  ];
  readonly coverFinishImages: Record<CoverFinish, string> = {
    'LAYFLAT_GLOSS': '/cover_finish/coverlayflatgloss.png',
    'LAYFLAT_MATTE_SCUFF_FREE': '/cover_finish/matt_scuff_free.png',
    'LAYFLAT_MATTE': '/cover_finish/matt.png',
    'MATT': '/cover_finish/matt.png',
  };

  getCoverFinishImage(value: CoverFinish): string | null {
    return this.coverFinishImages[value] || null;
  }

  hasCoverFinishImage(value: CoverFinish): boolean {
    return !!this.coverFinishImages[value];
  }

  readonly coverColorOptions: readonly CoverColor[] = ['FOUR_FOUR', 'FOUR_ZERO', 'FOUR_ONE', 'ZERO_ZERO', 'ONE_ZERO'];
  readonly priorityLevelOptions: readonly PriorityLevel[] = ['NORMAL', 'HIGH1', 'HIGH2', 'HIGH3'];
  readonly headAndTailOptions: readonly HeadAndTail[] = ['BLACK_AND_WHITE', 'WHITE', 'NONE'];
  readonly trimSizeOptions: readonly TrimSize[] = ['6" x 9"', '8.5" x 11"', '5.5" x 8.5"'];
  readonly coilTypeOptions: readonly CoilType[] = ['NONE', 'METAL', 'PLASTIC'];
  readonly tabColorOptions: readonly TabColor[] = ['NONE', 'FULL_COLOR_4_4', 'FRONT_COLOR_4_0', 'MONO_1_1'];
  readonly insertPaperTypeOptions: readonly InsertPaperType[] = ['NONE', 'C1S_10PT', 'C2S_10PT', 'C2S_12PT', 'GLOSS_TEXT_80'];
  readonly caseFinishTypeOptions: readonly CaseFinishType[] = ['NONE', 'LAYFLAT_GLOSS', 'LAYFLAT_MATTE', 'GLOSS_FILM'];
  readonly spineTypeOptions: readonly SpineType[] = ['NONE', 'ROUND', 'SQUARE'];
  readonly labelTypeOptions: readonly LabelType[] = ['NONE', 'STANDARD', 'ISBN', 'OTHER'];

  readonly productType = signal<SimulatorProductType>('Book');
  readonly bindingType = signal<BindingType>('');

  readonly quantity = signal(1);
  readonly productionPage = signal(1);
  readonly pageCount = signal(24);
  readonly height = signal(21);
  readonly width = signal(14.8);
  readonly thickness = signal(1);

  readonly textPaperType = signal<TextPaperType>('NONE');
  readonly textColor = signal<TextColor>('FOUR_FOUR');
  readonly coverPaperType = signal<CoverPaperType>('NONE');
  readonly coverFinish = signal<CoverFinish>('LAYFLAT_MATTE');
  readonly coverColor = signal<CoverColor>('FOUR_ZERO');

  readonly priorityLevel = signal<PriorityLevel>('NORMAL');
  readonly headAndTail = signal<HeadAndTail>('NONE');

  readonly trimSize = signal<TrimSize>('6" x 9"');

  readonly securityLabel = signal(false);
  readonly perf = signal(false);
  readonly doubleSidedCover = signal(false);
  readonly shrinkwrap = signal(false);
  readonly threeHoleDrill = signal(false);

  readonly proofCopy = signal(false);
  readonly isbnSupport = signal(false);
  readonly rushProduction = signal(false);

  readonly coilType = signal<CoilType>('NONE');
  readonly tabColor = signal<TabColor>('NONE');
  readonly insertPaperType = signal<InsertPaperType>('NONE');
  readonly caseFinishType = signal<CaseFinishType>('NONE');
  readonly spineType = signal<SpineType>('NONE');
  readonly labelType = signal<LabelType>('NONE');

  private readonly baseByProduct: Record<SimulatorProductType, number> = {
    Book: 3.2,
    Magazine: 2.7,
    Journal: 3.6,
  };

  private readonly bindingMultiplier: Record<BindingType, number> = {
    '': 1,
    CASEBIND: 1.42,
    CASEBIND_INS: 1.48,
    CASEBIND_ES: 1.5,
    CASEBIND_ES_INS: 1.56,
    PERFECT: 1.18,
    PERFECT_INS: 1.24,
    PERFECT_NC: 1.1,
    PERFECT_NC_INS: 1.16,
    COILHARD: 1.3,
    COILHARD_INS: 1.36,
    COILHARD_TAB: 1.4,
    COILSOFT: 1.14,
    LOOSELEAF: 1.08,
    LOOSELEAF_INS: 1.14,
    LOOSELEAF_NC: 1.02,
    LOOSELEAF_NC_INS: 1.08,
    LOOSELEAF_NC_Tab: 1.12,
    SS: 1,
    CARD: 0.8,
    DIVIDER_SHEET: 0.72,
    NONE: 0.65,
  };

  private readonly paperPerPage: Record<TextPaperType, number> = {
    NONE: 0.04,
    PT_10_C2S: 0.08,
    PT_12_C2S: 0.09,
    PAP1_70: 0.07,
    PAP1_75: 0.075,
    LETSGO_MATTE_115: 0.11,
    LETSGO_MATTE_90: 0.095,
    BIRCH_W40_TB: 0.12,
    FSC_MC_CVG_SILKHO_1_0_70: 0.07,
    FSC_MC_CVG_SILKHO_1_061: 0.065,
    FSC_MC_DOM_VJT_1_21_75: 0.08,
    FSC_MC_DOM_VJT_1_29_90: 0.095,
    GLOSS_80_TEXT: 0.085,
    GLOSS_80_COVER: 0.1,
  };

  private readonly colorPerPage: Record<TextColor, number> = {
    ONE_ONE: 0.03,
    FOUR_FOUR: 0.07,
  };

  private readonly coverFinishPerUnit: Record<CoverFinish, number> = {
    LAYFLAT_GLOSS: 1.35,
    LAYFLAT_MATTE_SCUFF_FREE: 1.6,
    LAYFLAT_MATTE: 1.45,
    MATT: 1.2,
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
    const paper = this.pageCount() * this.paperPerPage[this.textPaperType()];
    const color = this.pageCount() * this.colorPerPage[this.textColor()];
    const cover = this.coverFinishPerUnit[this.coverFinish()];
    const trim = this.trimMultiplier[this.trimSize()];

    let optionPremium = 0;
    if (this.securityLabel()) optionPremium += 0.12;
    if (this.bindingType().includes('INS')) optionPremium += 0.18;
    if (this.bindingType().includes('TAB')) optionPremium += 0.2;
    if (this.hasBackcoverFromBinding()) optionPremium += 0.15;
    if (this.doubleSidedCover()) optionPremium += 0.22;
    if (this.shrinkwrap()) optionPremium += 0.1;
    if (this.threeHoleDrill()) optionPremium += 0.08;

    const unit = (base + paper + color + cover + optionPremium) * trim;
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

  constructor() {
    const productParam = this.route.snapshot.queryParamMap.get('product')?.toLowerCase();

    if (productParam === 'magazine') {
      this.productType.set('Magazine');
    } else if (productParam === 'journal') {
      this.productType.set('Journal');
    } else {
      this.productType.set('Book');
    }
  }

  onQuantityChange(event: Event): void {
    const quantity = this.readNumericValue(event, this.quantity());
    const normalized = Math.min(Math.max(Math.round(quantity), 1), 5000);
    this.quantity.set(normalized);
  }

  onProductionPageChange(event: Event): void {
    this.productionPage.set(Math.max(1, Math.round(this.readNumericValue(event, this.productionPage()))));
  }

  onPageCountChange(event: Event): void {
    const pageCount = this.readNumericValue(event, this.pageCount());
    const normalized = Math.min(Math.max(Math.round(pageCount), 24), 480);
    this.pageCount.set(normalized);
  }

  onHeightChange(event: Event): void {
    this.height.set(Math.max(0, this.readNumericValue(event, this.height())));
  }

  onWidthChange(event: Event): void {
    this.width.set(Math.max(0, this.readNumericValue(event, this.width())));
  }

  onThicknessChange(event: Event): void {
    this.thickness.set(Math.max(0, this.readNumericValue(event, this.thickness())));
  }

  getBindingTypeLabel(bindingType: BindingType): string {
    return this.bindingTypeLabels[bindingType] ?? bindingType;
  }

  getSelectedBindingTypeLabel(): string {
    return this.bindingType() ? this.getBindingTypeLabel(this.bindingType()) : 'Not selected';
  }

  getSelectedBindingFamily(): BindingFamily | null {
    return this.getBindingFamilyFromType(this.bindingType());
  }

  getBindingSpecificationsForSelectedFamily(): readonly BindingType[] {
    const family = this.getSelectedBindingFamily();
    if (!family) return [];
    return this.bindingSpecsByFamily[family];
  }

  setBindingFamily(family: BindingFamily): void {
    const specs = this.bindingSpecsByFamily[family];
    if (specs.includes(this.bindingType())) {
      return;
    }
    this.bindingType.set(specs[0]);
  }

  setBindingSpecification(event: Event): void {
    const value = this.readInputValue(event);
    if (this.bindingOptions.includes(value as BindingType)) {
      this.bindingType.set(value as BindingType);
    }
  }

  setBindingType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.bindingOptions.includes(value as BindingType)) {
      this.bindingType.set(value as BindingType);
    }
  }

  setTextPaperType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.textPaperTypeOptions.includes(value as TextPaperType)) {
      this.textPaperType.set(value as TextPaperType);
    }
  }

  setTextColor(event: Event): void {
    const value = this.readInputValue(event);
    if (this.textColorOptions.includes(value as TextColor)) {
      this.textColor.set(value as TextColor);
    }
  }

  setCoverPaperType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.coverPaperTypeOptions.includes(value as CoverPaperType)) {
      this.coverPaperType.set(value as CoverPaperType);
    }
  }

  setCoverFinishFromEvent(event: Event): void {
    const value = this.readInputValue(event);
    if (this.coverFinishOptions.includes(value as CoverFinish)) {
      this.coverFinish.set(value as CoverFinish);
    }
  }

  setCoverFinishValue(value: CoverFinish): void {
    if (this.coverFinishOptions.includes(value)) {
      this.coverFinish.set(value);
    }
  }

  getCoverFinishLabel(value: CoverFinish): string {
    if (value === 'LAYFLAT_GLOSS') return 'Layflat Gloss';
    if (value === 'LAYFLAT_MATTE_SCUFF_FREE') return 'Layflat Matte Scuff Free';
    if (value === 'LAYFLAT_MATTE') return 'Layflat Matte';
    return 'Matt';
  }

  getCoverFinishDescription(value: CoverFinish): string {
    if (value === 'LAYFLAT_GLOSS') return 'Shiny and vibrant finish';
    if (value === 'LAYFLAT_MATTE_SCUFF_FREE') return 'Premium matte with extra protection';
    if (value === 'LAYFLAT_MATTE') return 'Soft non-reflective matte look';
    return 'Standard matte finish';
  }

  getCoverFinishPreviewClass(value: CoverFinish): string {
    if (value === 'LAYFLAT_GLOSS') return 'sim-finish-preview--gloss';
    if (value === 'LAYFLAT_MATTE_SCUFF_FREE') return 'sim-finish-preview--scuff';
    if (value === 'LAYFLAT_MATTE') return 'sim-finish-preview--matte';
    return 'sim-finish-preview--matte';
  }

  setCoverColor(event: Event): void {
    const value = this.readInputValue(event);
    if (this.coverColorOptions.includes(value as CoverColor)) {
      this.coverColor.set(value as CoverColor);
    }
  }

  setPriorityLevel(event: Event): void {
    const value = this.readInputValue(event);
    if (this.priorityLevelOptions.includes(value as PriorityLevel)) {
      this.priorityLevel.set(value as PriorityLevel);
    }
  }

  setHeadAndTail(event: Event): void {
    const value = this.readInputValue(event);
    if (this.headAndTailOptions.includes(value as HeadAndTail)) {
      this.headAndTail.set(value as HeadAndTail);
    }
  }

  setTrimSize(event: Event): void {
    const value = this.readInputValue(event);
    if (this.trimSizeOptions.includes(value as TrimSize)) {
      this.trimSize.set(value as TrimSize);
    }
  }

  setLabelType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.labelTypeOptions.includes(value as LabelType)) {
      this.labelType.set(value as LabelType);
    }
  }

  setCoilType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.coilTypeOptions.includes(value as CoilType)) {
      this.coilType.set(value as CoilType);
    }
  }

  setTabColor(event: Event): void {
    const value = this.readInputValue(event);
    if (this.tabColorOptions.includes(value as TabColor)) {
      this.tabColor.set(value as TabColor);
    }
  }

  setInsertPaperType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.insertPaperTypeOptions.includes(value as InsertPaperType)) {
      this.insertPaperType.set(value as InsertPaperType);
    }
  }

  setCaseFinishType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.caseFinishTypeOptions.includes(value as CaseFinishType)) {
      this.caseFinishType.set(value as CaseFinishType);
    }
  }

  setSpineType(event: Event): void {
    const value = this.readInputValue(event);
    if (this.spineTypeOptions.includes(value as SpineType)) {
      this.spineType.set(value as SpineType);
    }
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

  shouldShowTabColor(): boolean {
    return this.bindingType().includes('TAB');
  }

  shouldShowInsertPaperType(): boolean {
    return this.bindingType().includes('INS');
  }

  shouldShowCoilType(): boolean {
    return this.bindingType().includes('COIL');
  }

  shouldShowCaseFinishType(): boolean {
    const bindingType = this.bindingType();
    const caseFinishTypes: BindingType[] = ['COILHARD', 'COILHARD_TAB', 'COILHARD_INS'];
    return caseFinishTypes.includes(bindingType);
  }

  getBindingPreviewClass(bindingType: BindingType): string {
    if (!bindingType || bindingType === 'NONE') return 'sim-choice-preview--minimal';
    if (bindingType.includes('CASEBIND')) return 'sim-choice-preview--hard';
    if (bindingType.includes('PERFECT')) return 'sim-choice-preview--perfect';
    if (bindingType.includes('COIL')) return 'sim-choice-preview--coil';
    if (bindingType.includes('LOOSELEAF')) return 'sim-choice-preview--leaf';
    if (bindingType === 'SS') return 'sim-choice-preview--stitch';
    if (bindingType === 'CARD') return 'sim-choice-preview--card';
    if (bindingType === 'DIVIDER_SHEET') return 'sim-choice-preview--divider';
    return 'sim-choice-preview--minimal';
  }

  getBindingImage(bindingType: BindingType): string | null {
    if (!bindingType || bindingType === 'NONE') return null;
    if (bindingType.startsWith('CASEBIND')) return this.bindingTypeImages.CASEBIND;
    if (bindingType.startsWith('PERFECT')) return this.bindingTypeImages.PERFECT;
    if (bindingType.startsWith('COILHARD')) return this.bindingTypeImages.COILHARD;
    if (bindingType.startsWith('COILSOFT')) return this.bindingTypeImages.COILSOFT;
    if (bindingType.startsWith('LOOSELEAF')) return this.bindingTypeImages.LOOSELEAF;
    if (bindingType === 'SS') return this.bindingTypeImages.SS;
    if (bindingType === 'DIVIDER_SHEET') return this.bindingTypeImages.DIVIDER_SHEET;
    if (bindingType === 'CARD') return this.bindingTypeImages.CARD;
    return null;
  }

  getBindingFamilyImage(family: BindingFamily): string | null {
    const representative = this.bindingSpecsByFamily[family][0];
    return this.getBindingImage(representative);
  }

  getBindingVisualToken(bindingType: BindingType): string {
    if (!bindingType || bindingType === 'NONE') return 'N';
    if (bindingType.includes('CASEBIND')) return 'HB';
    if (bindingType.includes('PERFECT')) return 'PB';
    if (bindingType.includes('COIL')) return 'CL';
    if (bindingType.includes('LOOSELEAF')) return 'LF';
    if (bindingType === 'SS') return 'SS';
    if (bindingType === 'CARD') return 'CD';
    if (bindingType === 'DIVIDER_SHEET') return 'DV';
    return 'BK';
  }

  getBindingShortDescription(bindingType: BindingType): string {
    if (!bindingType || bindingType === 'NONE') return 'No specific binding';
    if (bindingType.includes('CASEBIND')) return 'Hardcover durability';
    if (bindingType.includes('PERFECT')) return 'Softcover clean spine';
    if (bindingType.includes('COIL')) return 'Lay-flat and practical';
    if (bindingType.includes('LOOSELEAF')) return 'Loose pages workflow';
    if (bindingType === 'SS') return 'Light stitched finish';
    if (bindingType === 'CARD') return 'Card format';
    if (bindingType === 'DIVIDER_SHEET') return 'Divider insert style';
    return 'Book binding';
  }

  getTextPaperTypeLabel(value: TextPaperType): string {
    return this.textPaperTypeLabels[value] ?? value;
  }

  getTextColorLabel(value: TextColor): string {
    return this.textColorLabels[value] ?? value;
  }

  getTextPaperPreviewClass(value: TextPaperType): string {
    if (value === 'NONE') return 'sim-choice-preview--minimal';
    if (value.includes('GLOSS')) return 'sim-choice-preview--gloss';
    if (value.includes('MATTE')) return 'sim-choice-preview--matte';
    if (value.includes('PT_')) return 'sim-choice-preview--coated';
    return 'sim-choice-preview--paper';
  }

  getCoverPaperTypeLabel(value: CoverPaperType): string {
    return this.coverPaperTypeLabels[value] ?? value;
  }

  getCoverColorLabel(value: CoverColor): string {
    return this.coverColorLabels[value] ?? value;
  }

  getCoverPaperPreviewClass(value: CoverPaperType): string {
    if (value === 'NONE') return 'sim-choice-preview--minimal';
    if (value.includes('GLOSS')) return 'sim-choice-preview--gloss';
    if (value.includes('C1S')) return 'sim-choice-preview--c1s';
    if (value.includes('C2S')) return 'sim-choice-preview--coated';
    return 'sim-choice-preview--paper';
  }

  goToDetailedDesign(): void {
    this.authMessage.set('');
    const isAuthenticated = this.auth.isAuthenticated();

    if (!isAuthenticated) {
      this.authMessage.set('You need to sign in first before accessing the detailed design page.');
      this.router.navigate(['/login'], {
        queryParams: { redirectTo: '/design-your-book' },
      });
      return;
    }

    this.router.navigate(['/design-your-book'], {
      queryParams: {
        bindingType: this.bindingType(),
        quantity: this.quantity(),
        productionPage: this.productionPage(),
        height: this.height(),
        width: this.width(),
        thickness: this.thickness(),
        textPaperType: this.textPaperType(),
        textColor: this.textColor(),
        coverPaperType: this.coverPaperType(),
        coverFinishType: this.coverFinish(),
        coverColor: this.coverColor(),
        priorityLevel: this.priorityLevel(),
        headAndTail: this.headAndTail(),
      },
    });
  }

  addToCart(): void {
    const product: Product = {
      id: Date.now(),
      name: 'Custom Printing Book',
      category: 'custom',
      price: Number(this.estimatedTotal().toFixed(2)),
      image: 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 55%, #FF6B35 100%)',
      description: 'Custom printing configuration.',
      specs: [
        `Binding: ${this.getSelectedBindingTypeLabel()}`,
        `Text paper: ${this.getTextPaperTypeLabel(this.textPaperType())}`,
        `Text color: ${this.getTextColorLabel(this.textColor())}`,
        `Cover paper: ${this.getCoverPaperTypeLabel(this.coverPaperType())}`,
        `Cover finish: ${this.getCoverFinishLabel(this.coverFinish())}`,
        `Cover color: ${this.getCoverColorLabel(this.coverColor())}`,
        `Pages: ${this.pageCount()}`,
        `Production page: ${this.productionPage()}`,
        `Quantity: ${this.quantity()}`,
        `Dimensions: ${this.width()} x ${this.height()} x ${this.thickness()} cm`,
        `Priority: ${this.priorityLevel()}`,
        `Head and tail: ${this.headAndTail()}`,
        `Security label: ${this.securityLabel() ? 'Yes' : 'No'}`,
        `Insert: ${this.bindingType().includes('INS') ? 'Yes' : 'No'}`,
        `Tab: ${this.bindingType().includes('TAB') ? 'Yes' : 'No'}`,
        `Backcover: ${this.hasBackcoverFromBinding() ? 'Yes' : 'No'}`,
        `Shrinkwrap: ${this.shrinkwrap() ? 'Yes' : 'No'}`,
      ],
    };

    this.cart.add(product, 1);
    this.ui.openCart();
  }

  readCheckedValue(event: Event): boolean {
    const target = event.target as HTMLInputElement | null;
    return target?.checked ?? false;
  }

  private readInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    return target?.value ?? '';
  }

  private readNumericValue(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    const value = Number(target?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  private getBindingFamilyFromType(bindingType: BindingType): BindingFamily | null {
    if (bindingType.startsWith('CASEBIND')) return 'CASEBIND';
    if (bindingType.startsWith('PERFECT')) return 'PERFECT';
    if (bindingType.startsWith('COILHARD')) return 'COILHARD';
    if (bindingType.startsWith('COILSOFT')) return 'COILSOFT';
    if (bindingType.startsWith('LOOSELEAF')) return 'LOOSELEAF';
    if (bindingType === 'SS') return 'SS';
    if (bindingType === 'CARD') return 'CARD';
    if (bindingType === 'DIVIDER_SHEET') return 'DIVIDER_SHEET';
    return null;
  }

  private hasBackcoverFromBinding(): boolean {
    const bt = this.bindingType();
    return !bt.includes('_NC') && bt !== 'CARD' && bt !== 'DIVIDER_SHEET' && bt !== 'NONE';
  }
}

