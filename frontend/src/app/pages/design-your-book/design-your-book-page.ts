import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Editor, EditorTemplateAssociationEvent } from '../../editor/editor';
import { BookRequestDto, BookService } from '../../core/services/book.service';

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
type CoverColor = 'FOUR_FOUR' | 'FOUR_ZERO' | 'FOUR_ONE' | 'ZERO_ZERO' | 'ONE_ZERO';
type CoverFinishType = 'MATT' | 'LAYFLAT_GLOSS' | 'LAYFLAT_MATTE_SCUFF_FREE' | 'LAYFLAT_MATTE';

@Component({
  selector: 'app-design-your-book-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Editor],
  templateUrl: './design-your-book-page.html',
  styleUrl: './design-your-book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignYourBookPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookService = inject(BookService);

  private readonly baseSteps = [
    { id: 'attributes', label: 'Attributes' },
    { id: 'content', label: 'Content' },
    { id: 'templates', label: 'Templates' },
  ] as const;
  private readonly defaultUserBookSalePrice = 1;

  readonly currentStep = signal(0);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);

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
    COILHARD_TAB: 'Coil Hard with tab',
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

  readonly bindingFamilyImages: Readonly<Record<string, string>> = {
    CASEBIND: '/books/casebind.png',
    PERFECT: '/books/perfect.png',
    COILHARD: '/books/coilhard.png',
    COILSOFT: '/books/coilsoft.png',
    LOOSELEAF: '/books/loosleaf.png',
    SS: '/books/saddlestitch.png',
    CARD: '/books/cart.png',
    DIVIDER_SHEET: '/books/dividersheet.png',
  };

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

  readonly textColorOptions: readonly TextColor[] = ['ONE_ONE', 'FOUR_FOUR'];
  readonly textColorLabels: Record<TextColor, string> = {
    ONE_ONE: 'Black/Black (1/1)',
    FOUR_FOUR: 'Full Color/Full Color (4/4)',
  };

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

  readonly coverColorOptions: readonly CoverColor[] = ['FOUR_FOUR', 'FOUR_ZERO', 'FOUR_ONE', 'ZERO_ZERO', 'ONE_ZERO'];
  readonly coverColorLabels: Record<CoverColor, string> = {
    FOUR_FOUR: 'Full Color outside + inside (4/4)',
    FOUR_ZERO: 'Full Color outside only (4/0)',
    FOUR_ONE: 'Full Color outside + black inside (4/1)',
    ZERO_ZERO: 'No print (0/0)',
    ONE_ZERO: 'Black outside only (1/0)',
  };

  readonly coverFinishOptions: readonly CoverFinishType[] = [
    'MATT',
    'LAYFLAT_GLOSS',
    'LAYFLAT_MATTE_SCUFF_FREE',
    'LAYFLAT_MATTE',
  ];
  readonly coverFinishImages: Record<CoverFinishType, string> = {
    MATT: '/cover_finish/matt.png',
    LAYFLAT_GLOSS: '/cover_finish/coverlayflatgloss.png',
    LAYFLAT_MATTE_SCUFF_FREE: '/cover_finish/matt_scuff_free.png',
    LAYFLAT_MATTE: '/cover_finish/matt.png',
  };

  readonly form = this.initForm();

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const toNum = (key: string, fallback: number): number => {
      const raw = qp.get(key);
      if (!raw) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    this.form.patchValue({
      bindingType: qp.get('bindingType') ?? '',
      quantity: toNum('quantity', 1),
      productionPage: toNum('productionPage', 1),
      height: toNum('height', 21),
      width: toNum('width', 14),
      thickness: toNum('thickness', 1),
      textPaperType: qp.get('textPaperType') ?? 'NONE',
      textColor: qp.get('textColor') ?? 'FOUR_FOUR',
      coverPaperType: qp.get('coverPaperType') ?? 'NONE',
      coverFinishType: this.normalizeCoverFinishType(qp.get('coverFinishType')),
      coverColor: qp.get('coverColor') ?? 'FOUR_ZERO',
      headAndTail: qp.get('headAndTail') ?? 'NONE',
    });
  }

  get coverGroup(): FormGroup {
    return this.form.get('cover') as FormGroup;
  }

  get contentGroup(): FormGroup {
    return this.form.get('content') as FormGroup;
  }

  get templateGroup(): FormGroup {
    return this.form.get('template') as FormGroup;
  }

  get visibleSteps(): ReadonlyArray<{ id: string; label: string }> {
    return this.baseSteps;
  }

  get totalVisibleSteps(): number {
    return this.visibleSteps.length;
  }

  goToStep(index: number): void {
    this.currentStep.set(Math.max(0, Math.min(index, this.totalVisibleSteps - 1)));
  }

  nextStep(): void {
    this.ensureCurrentStepInBounds();
    if (this.currentStep() < this.totalVisibleSteps - 1) {
      this.currentStep.update((step) => step + 1);
    }
  }

  prevStep(): void {
    this.ensureCurrentStepInBounds();
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
    }
  }

  isCurrentStep(stepId: string): boolean {
    this.ensureCurrentStepInBounds();
    return this.visibleSteps[this.currentStep()]?.id === stepId;
  }

  onCoverModeChange(mode: 'manual' | 'pdf'): void {
    this.coverGroup.get('mode')?.setValue(mode);
    if (mode === 'pdf') {
      this.coverGroup.patchValue({
        coverTemplateId: this.coverGroup.get('coverTemplateId')?.value ?? null,
      });
    } else {
      this.coverGroup.patchValue({
        pdfFileName: '',
        pdfFileType: 'application/pdf',
        pdfFilePath: '',
      });
    }
  }

  onCoverPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.onCoverModeChange('pdf');
    this.coverGroup.patchValue({
      pdfFileName: file.name,
      pdfFileType: file.type || 'application/pdf',
      pdfFilePath: file.name,
    });
  }

  onContentPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.contentGroup.patchValue({
      fileName: file.name,
      fileType: file.type || 'application/pdf',
      filePath: file.name,
    });
  }

  onTemplateAssociated(event: EditorTemplateAssociationEvent): void {
    this.coverGroup.patchValue({
      coverTemplateId: event.templateId,
    });
    this.submitSuccess.set(`Template "${event.templateName}" associated to this book.`);
  }

  shouldShowTemplateStep(): boolean {
    return true;
  }

  shouldShowTabColor(): boolean {
    const bindingType = (this.form.get('bindingType')?.value ?? '') as string;
    return !!bindingType && bindingType.includes('TAB');
  }

  shouldShowInsertPaperType(): boolean {
    const bindingType = (this.form.get('bindingType')?.value ?? '') as string;
    return !!bindingType && bindingType.includes('INS');
  }

  shouldShowCoilType(): boolean {
    const bindingType = (this.form.get('bindingType')?.value ?? '') as string;
    return !!bindingType && bindingType.includes('COIL');
  }

  shouldShowCaseFinishType(): boolean {
    const bindingType = this.form.get('bindingType')?.value;
    return ['COILHARD', 'COILHARD_TAB', 'COILHARD_INS'].includes(bindingType);
  }

  async onSubmit(): Promise<void> {
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Please complete required fields before submitting.');
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();

    if (!value.content.filePath) {
      this.submitting.set(false);
      this.submitError.set('Please upload the content PDF before creating the book.');
      this.currentStep.set(1);
      return;
    }

    const payload: BookRequestDto = {
      title: value.title,
      description: value.description || '',
      authors: value.authors
        .split(',')
        .map((author: string) => author.trim())
        .filter((author: string) => !!author),
      quantity: value.quantity,
      productionPage: value.productionPage,
      height: value.height,
      thickness: value.thickness,
      width: value.width,
      securityLabel: value.securityLabel,
      hasCoil: value.bindingType.includes('COIL'),
      hasInsert: value.bindingType.includes('INS'),
      hasTab: value.bindingType.includes('TAB'),
      hasBackcover: !value.bindingType.includes('_NC') && value.bindingType !== 'CARD' && value.bindingType !== 'DIVIDER_SHEET' && value.bindingType !== 'NONE',
      perf: value.perf,
      doubleSidedCover: value.doubleSidedCover,
      shrinkwrap: value.shrinkwrap,
      threeHoleDrill: value.threeHoleDrill,
      pnlCover: !!value.pnlCover,
      pnlText: !!value.pnlText,
      textPaperType: value.textPaperType,
      textColor: value.textColor,
      coverFinishType: value.coverFinishType,
      coverColor: value.coverColor,
      coverSize: 'NONE',
      coverPaperType: value.coverPaperType,
      headAndTail: value.headAndTail,
      priorityLevel: value.priorityLevel,
      bindingType: value.bindingType,
      coilType: value.coilType || undefined,
      tabColor: value.tabColor || undefined,
      insertPaperType: value.insertPaperType || undefined,
      caseFinishType: value.caseFinishType || undefined,
      spineType: value.spineType || undefined,
      labelType: value.labelType || undefined,
      salePrice: this.defaultUserBookSalePrice,
      cover: {
        pdfFileName: value.cover.pdfFileName || undefined,
        pdfFileType: value.cover.pdfFileType || undefined,
        pdfFilePath: value.cover.pdfFilePath || undefined,
        coverTemplateId: value.cover.coverTemplateId ?? undefined,
      },
      content: {
        fileName: value.content.fileName || undefined,
        fileType: value.content.fileType || undefined,
        filePath: value.content.filePath || undefined,
        textTemplateId: undefined,
      },
      pnlInformations: [],
    };

    try {
      await this.bookService.createUserBook(payload);
      this.submitSuccess.set('Your custom book has been saved successfully.');
      await this.router.navigate(['/marketplace']);
    } catch (error) {
      console.error('Error creating user book:', error);
      this.submitError.set('Unable to create your custom book. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  private initForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      authors: ['', [Validators.required]],
      bindingType: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(0)]],
      productionPage: [1, [Validators.required, Validators.min(1)]],
      height: [21, [Validators.required, Validators.min(0.1)]],
      width: [14, [Validators.required, Validators.min(0.1)]],
      thickness: [1, [Validators.required, Validators.min(0.1)]],
      textPaperType: ['NONE', [Validators.required]],
      textColor: ['FOUR_FOUR', [Validators.required]],
      coverPaperType: ['NONE', [Validators.required]],
      coverFinishType: ['LAYFLAT_MATTE', [Validators.required]],
      coverColor: ['FOUR_ZERO', [Validators.required]],
      priorityLevel: ['NORMAL', [Validators.required]],
      headAndTail: ['NONE', [Validators.required]],
      securityLabel: [false],
      perf: [false],
      doubleSidedCover: [false],
      shrinkwrap: [false],
      threeHoleDrill: [false],
      pnlCover: [false],
      pnlText: [false],
      coilType: [''],
      tabColor: [''],
      insertPaperType: [''],
      caseFinishType: [''],
      spineType: [''],
      labelType: [''],
      cover: this.fb.group({
        mode: ['manual'],
        pdfFileName: [''],
        pdfFileType: ['application/pdf'],
        pdfFilePath: [''],
        coverTemplateId: [null],
      }),
      content: this.fb.group({
        fileName: [''],
        fileType: ['application/pdf'],
        filePath: [''],
      }),
      template: this.fb.group({
        action: ['select'],
      }),
    });
  }

  private ensureCurrentStepInBounds(): void {
    const maxIndex = Math.max(0, this.totalVisibleSteps - 1);
    if (this.currentStep() > maxIndex) {
      this.currentStep.set(maxIndex);
    }
  }

  getSelectedBindingFamily(): BindingFamily | null {
    return this.getBindingFamilyFromType((this.form.get('bindingType')?.value ?? '') as BindingType);
  }

  getBindingSpecificationsForSelectedFamily(): readonly BindingType[] {
    const family = this.getSelectedBindingFamily();
    if (!family) return [];
    return this.bindingSpecsByFamily[family];
  }

  setBindingFamily(family: BindingFamily): void {
    const specs = this.bindingSpecsByFamily[family];
    const current = (this.form.get('bindingType')?.value ?? '') as BindingType;
    if (specs.includes(current)) {
      return;
    }
    this.form.get('bindingType')?.setValue(specs[0]);
  }

  setBindingSpecification(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = (target?.value ?? '') as BindingType;
    this.form.get('bindingType')?.setValue(value);
  }

  getBindingTypeLabel(bindingType: BindingType): string {
    return this.bindingTypeLabels[bindingType] ?? bindingType;
  }

  getBindingImageForFamily(family: BindingFamily): string | null {
    const representative = this.bindingSpecsByFamily[family][0];
    if (representative.startsWith('CASEBIND')) return this.bindingFamilyImages.CASEBIND;
    if (representative.startsWith('PERFECT')) return this.bindingFamilyImages.PERFECT;
    if (representative.startsWith('COILHARD')) return this.bindingFamilyImages.COILHARD;
    if (representative.startsWith('COILSOFT')) return this.bindingFamilyImages.COILSOFT;
    if (representative.startsWith('LOOSELEAF')) return this.bindingFamilyImages.LOOSELEAF;
    if (representative === 'SS') return this.bindingFamilyImages.SS;
    if (representative === 'CARD') return this.bindingFamilyImages.CARD;
    if (representative === 'DIVIDER_SHEET') return this.bindingFamilyImages.DIVIDER_SHEET;
    return null;
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

  getCoverPaperTypeLabel(value: CoverPaperType): string {
    return this.coverPaperTypeLabels[value] ?? value;
  }

  getCoverColorLabel(value: CoverColor): string {
    return this.coverColorLabels[value] ?? value;
  }

  getCoverFinishLabel(value: CoverFinishType): string {
    if (value === 'LAYFLAT_GLOSS') return 'Layflat Gloss';
    if (value === 'LAYFLAT_MATTE_SCUFF_FREE') return 'Layflat Matte Scuff Free';
    if (value === 'LAYFLAT_MATTE') return 'Layflat Matte';
    return 'Matt';
  }

  getCoverFinishDescription(value: CoverFinishType): string {
    if (value === 'LAYFLAT_GLOSS') return 'Shiny and vibrant finish';
    if (value === 'LAYFLAT_MATTE_SCUFF_FREE') return 'Premium matte with extra protection';
    if (value === 'LAYFLAT_MATTE') return 'Soft non-reflective matte look';
    return 'Standard matte finish';
  }

  setCoverFinishValue(value: CoverFinishType): void {
    this.form.get('coverFinishType')?.setValue(value);
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

  private normalizeCoverFinishType(rawValue: string | null): CoverFinishType {
    if (rawValue === 'MATT') return 'MATT';
    if (rawValue === 'LAYFLAT_GLOSS') return 'LAYFLAT_GLOSS';
    if (rawValue === 'LAYFLAT_MATTE_SCUFF_FREE') return 'LAYFLAT_MATTE_SCUFF_FREE';
    if (rawValue === 'LAYFLAT_MATTE') return 'LAYFLAT_MATTE';
    return 'LAYFLAT_MATTE';
  }
}
