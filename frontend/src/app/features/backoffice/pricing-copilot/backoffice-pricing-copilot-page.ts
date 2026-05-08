import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  CopilotAnalyzeRequest,
  CopilotAnalyzeResponse,
  CopilotConversationTurn,
  PricingService,
  QuoteRequest,
} from '../../../core/services/pricing.service';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';

type CopilotField =
  | 'siren'
  | 'bindingType'
  | 'quantity'
  | 'productionPage'
  | 'height'
  | 'width'
  | 'thickness'
  | 'textPaperType'
  | 'textColor'
  | 'coverPaperType'
  | 'coverFinishType'
  | 'coverColor'
  | 'priorityLevel'
  | 'headAndTail'
  | 'securityLabel'
  | 'hasCoil'
  | 'hasInsert'
  | 'hasTab'
  | 'hasBackcover'
  | 'perf'
  | 'doubleSidedCover'
  | 'shrinkwrap'
  | 'threeHoleDrill'
  | 'coilType'
  | 'tabColor'
  | 'insertPaperType'
  | 'caseFinishType'
  | 'spineType'
  | 'labelType'
  | 'selectedQuestion';

interface CopilotQuestion {
  id: CopilotField;
  label: string;
  type: 'number' | 'select';
  options?: readonly string[];
  placeholder?: string;
}

interface ChatMessage {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  streaming?: boolean;
}

interface CopilotBarDatum {
  label: string;
  value: number;
  displayValue: string;
  widthPercent: number;
  accentClass?: string;
}

type BindingFamily = 'CASEBIND' | 'PERFECT' | 'COILHARD' | 'COILSOFT' | 'LOOSELEAF' | 'SS';
type CoverFinishType = 'MATT' | 'LAYFLAT_GLOSS' | 'LAYFLAT_MATTE_SCUFF_FREE' | 'LAYFLAT_MATTE';

@Component({
  selector: 'app-backoffice-pricing-copilot-page',
  imports: [FormsModule, BackofficeCardComponent, BackofficeSectionHeaderComponent],
  templateUrl: './backoffice-pricing-copilot-page.html',
  styleUrl: './backoffice-pricing-copilot-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficePricingCopilotPageComponent {
  private readonly pricingService = inject(PricingService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly priorityLevelOptions = ['NORMAL', 'HIGH1', 'HIGH2', 'HIGH3'] as const;
  private readonly suggestedQuestions = [
    'Why this price?',
    'Which driver influences the price the most?',
    'What action do you recommend?',
  ] as const;
  private readonly booleanFields = new Set<CopilotField>([
    'securityLabel',
    'hasCoil',
    'hasInsert',
    'hasTab',
    'hasBackcover',
    'perf',
    'doubleSidedCover',
    'shrinkwrap',
    'threeHoleDrill',
  ]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<CopilotAnalyzeResponse | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly currentStep = signal(0);
  readonly numericDraft = signal<string | number | null>('');
  readonly followUpDraft = signal('');

  readonly state = signal({
    siren: null as string | null,
    bindingType: '',
    quantity: null as number | null,
    productionPage: null as number | null,
    height: null as number | null,
    width: null as number | null,
    thickness: null as number | null,
    textPaperType: '',
    textColor: '',
    coverPaperType: '',
    coverFinishType: '',
    coverColor: '',
    priorityLevel: '',
    headAndTail: '',
    securityLabel: 0,
    hasCoil: 0,
    hasInsert: 0,
    hasTab: 0,
    hasBackcover: 0,
    perf: 0,
    doubleSidedCover: 0,
    shrinkwrap: 0,
    threeHoleDrill: 0,
    coilType: 'NONE',
    tabColor: 'NONE',
    insertPaperType: 'NONE',
    caseFinishType: 'NONE',
    spineType: 'NONE',
    labelType: 'NONE',
    selectedQuestion: '',
  });

  readonly bindingFamilyLabels: Readonly<Record<BindingFamily, string>> = {
    CASEBIND: 'Casebind',
    PERFECT: 'Perfect',
    COILHARD: 'Coil Hard',
    COILSOFT: 'Coil Soft',
    LOOSELEAF: 'Looseleaf',
    SS: 'Saddle Stitch',
  };

  readonly bindingFamilyImages: Readonly<Record<BindingFamily, string>> = {
    CASEBIND: '/books/casebind.png',
    PERFECT: '/books/perfect.png',
    COILHARD: '/books/coilhard.png',
    COILSOFT: '/books/coilsoft.png',
    LOOSELEAF: '/books/loosleaf.png',
    SS: '/books/saddlestitch.png',
  };

  readonly coverFinishLabels: Readonly<Record<CoverFinishType, string>> = {
    MATT: 'Matt',
    LAYFLAT_GLOSS: 'Layflat Gloss',
    LAYFLAT_MATTE_SCUFF_FREE: 'Layflat Matte Scuff Free',
    LAYFLAT_MATTE: 'Layflat Matte',
  };

  readonly coverFinishImages: Readonly<Record<CoverFinishType, string>> = {
    MATT: '/cover_finish/matt.png',
    LAYFLAT_GLOSS: '/cover_finish/coverlayflatgloss.png',
    LAYFLAT_MATTE_SCUFF_FREE: '/cover_finish/matt_scuff_free.png',
    LAYFLAT_MATTE: '/cover_finish/matt.png',
  };

  readonly questions: readonly CopilotQuestion[] = [
    { id: 'siren', label: 'What is the customer code (siren)?', type: 'select', options: ['SAV', 'MISSING', 'UNKNOWN'] },
    { id: 'bindingType', label: 'What is the binding type?', type: 'select', options: ['SS', 'CASEBIND', 'PERFECT', 'COILHARD', 'COILSOFT', 'LOOSELEAF'] },
    { id: 'quantity', label: 'What is the quantity?', type: 'number', placeholder: 'Example: 500' },
    { id: 'productionPage', label: 'How many production pages?', type: 'number', placeholder: 'Example: 252' },
    { id: 'height', label: 'What is the height?', type: 'number', placeholder: 'Example: 297' },
    { id: 'width', label: 'What is the width?', type: 'number', placeholder: 'Example: 210' },
    { id: 'thickness', label: 'What is the thickness?', type: 'number', placeholder: 'Example: 1.2' },
    { id: 'textPaperType', label: 'What is the text paper type?', type: 'select', options: ['BIRCH_W40_TB', 'GLOSS_80_TEXT', 'PAP1_70', 'PAP1_75', 'NONE'] },
    { id: 'textColor', label: 'What is the text color?', type: 'select', options: ['ONE_ONE', 'FOUR_FOUR'] },
    { id: 'coverPaperType', label: 'What is the cover paper type?', type: 'select', options: ['GLOSS_TEXT_100', 'GLOSS_TEXT_80', 'GLOSS_COVER_80', 'PT10_C1S', 'PT12_C1S', 'PT16_C1S', 'PT10_C2S', 'PT12_C2S', 'NONE'] },
    { id: 'coverFinishType', label: 'What is the cover finish type?', type: 'select', options: ['MATT', 'LAYFLAT_GLOSS', 'LAYFLAT_MATTE_SCUFF_FREE', 'LAYFLAT_MATTE'] },
    { id: 'coverColor', label: 'What is the cover color?', type: 'select', options: ['FOUR_FOUR', 'FOUR_ZERO', 'FOUR_ONE', 'ZERO_ZERO', 'ONE_ZERO'] },
    { id: 'priorityLevel', label: 'What is the priority level?', type: 'select', options: ['NORMAL', 'HIGH1', 'HIGH2', 'HIGH3'] },
    { id: 'headAndTail', label: 'What is the head-and-tail option?', type: 'select', options: ['BLACK_AND_WHITE', 'WHITE', 'NONE'] },
    { id: 'securityLabel', label: 'Security label (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'hasCoil', label: 'Has coil (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'hasInsert', label: 'Has insert (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'hasTab', label: 'Has tab (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'hasBackcover', label: 'Has backcover (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'perf', label: 'Perf (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'doubleSidedCover', label: 'Double-sided cover (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'shrinkwrap', label: 'Shrinkwrap (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'threeHoleDrill', label: 'Three-hole drill (0/1)?', type: 'select', options: ['0', '1'] },
    { id: 'coilType', label: 'What is the coil type?', type: 'select', options: ['NONE', 'METAL', 'PLASTIC'] },
    { id: 'tabColor', label: 'What is the tab color?', type: 'select', options: ['NONE', 'FULL_COLOR_4_4', 'FRONT_COLOR_4_0', 'MONO_1_1'] },
    { id: 'insertPaperType', label: 'What is the insert paper type?', type: 'select', options: ['NONE', 'C1S_10PT', 'C2S_10PT', 'C2S_12PT', 'GLOSS_TEXT_80'] },
    { id: 'caseFinishType', label: 'What is the case finish type?', type: 'select', options: ['NONE', 'LAYFLAT_GLOSS', 'LAYFLAT_MATTE', 'GLOSS_FILM'] },
    { id: 'spineType', label: 'What is the spine type?', type: 'select', options: ['NONE', 'ROUND', 'SQUARE'] },
    { id: 'labelType', label: 'What is the label type?', type: 'select', options: ['NONE', 'STANDARD', 'ISBN', 'OTHER'] },
    {
      id: 'selectedQuestion',
      label: 'What do you want to analyze?',
      type: 'select',
      options: this.suggestedQuestions,
    },
  ];

  readonly activeQuestion = computed(() => this.questions[this.currentStep()] ?? null);
  readonly isConversationDone = computed(() => this.currentStep() >= this.questions.length);
  readonly followUpQuestions = computed(() => {
    const currentQuestion = this.result()?.selectedQuestion ?? this.state().selectedQuestion;
    return this.suggestedQuestions.filter((question) => question !== currentQuestion);
  });
  readonly activeOptions = computed(() => {
    const question = this.activeQuestion();
    if (!question || question.type !== 'select') return [];
    return question.options ?? [];
  });
  readonly numericDraftText = computed(() => {
    const value = this.numericDraft();
    return value == null ? '' : String(value);
  });

  constructor() {
    this.startConversation();
  }

  startConversation(): void {
    this.messages.set([]);
    this.currentStep.set(this.getNextVisibleStep(0));
    this.numericDraft.set('');
    this.followUpDraft.set('');
    this.error.set(null);
    this.result.set(null);
    this.state.set({
      siren: null,
      bindingType: '',
      quantity: null,
      productionPage: null,
      height: null,
      width: null,
      thickness: null,
      textPaperType: '',
      textColor: '',
      coverPaperType: '',
      coverFinishType: '',
      coverColor: '',
      priorityLevel: '',
      headAndTail: '',
      securityLabel: 0,
      hasCoil: 0,
      hasInsert: 0,
      hasTab: 0,
      hasBackcover: 0,
      perf: 0,
      doubleSidedCover: 0,
      shrinkwrap: 0,
      threeHoleDrill: 0,
      coilType: 'NONE',
      tabColor: 'NONE',
      insertPaperType: 'NONE',
      caseFinishType: 'NONE',
      spineType: 'NONE',
      labelType: 'NONE',
      selectedQuestion: '',
    });

    this.addBotMessage('PRICING COPILOT\nLet us build a complete quote payload together.');
    this.askCurrentQuestion();
  }

  chooseOption(option: string): void {
    if (this.loading() || this.isConversationDone()) return;
    const question = this.activeQuestion();
    if (!question || question.type !== 'select') return;

    this.updateField(question.id, option);
    this.addUserMessage(this.getOptionDisplayText(question, option));
    this.advanceConversation();
  }

  submitNumericAnswer(): void {
    if (this.loading() || this.isConversationDone()) return;
    const question = this.activeQuestion();
    if (!question || question.type !== 'number') return;

    const normalizedDraft = String(this.numericDraft() ?? '').trim();
    if (!normalizedDraft) return;

    const value = Number(normalizedDraft);
    if (Number.isNaN(value)) return;

    this.updateField(question.id, String(value));
    this.addUserMessage(String(value));
    this.numericDraft.set('');
    this.advanceConversation();
  }

  private advanceConversation(): void {
    const nextStep = this.getNextVisibleStep(this.currentStep() + 1);
    this.currentStep.set(nextStep);

    if (nextStep >= this.questions.length) {
      this.addBotMessage('REQUEST READY\nRunning pricing and AI interpretation.');
      void this.analyze();
      return;
    }

    this.askCurrentQuestion();
  }

  private askCurrentQuestion(): void {
    const question = this.activeQuestion();
    if (!question) return;
    this.addBotMessage(question.label);
  }

  async analyze(): Promise<void> {
    await this.runAnalysis(this.state().selectedQuestion || 'Why this price?');
  }

  async askFollowUpQuestion(question: string): Promise<void> {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || this.loading() || !this.isConversationDone()) {
      return;
    }

    this.addUserMessage(normalizedQuestion);
    this.followUpDraft.set('');
    await this.runAnalysis(normalizedQuestion);
  }

  async submitCustomFollowUpQuestion(): Promise<void> {
    await this.askFollowUpQuestion(this.followUpDraft());
  }

  isFollowUpDraftEmpty(): boolean {
    return this.followUpDraft().trim().length === 0;
  }

  private async runAnalysis(selectedQuestion: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.state.update((current) => ({ ...current, selectedQuestion }));

    try {
      const payload = this.buildPayload(selectedQuestion);
      const response = await firstValueFrom(this.pricingService.analyzeWithCopilot(payload));
      this.result.set(response);
      const answerText = (response.copilot.answer ?? '').trim();
      const normalizedAnswer = /^AI ANALYSIS\b/i.test(answerText) ? answerText : `AI ANALYSIS\n${answerText}`;
      await this.addStreamingBotMessage(normalizedAnswer);
      const action = (response.copilot as any).recommendedAction ?? (response.copilot as any).recommended_action ?? 'REVIEW';
      this.addBotMessage(`DECISION\nCONFIDENCE: ${response.copilot.confidence}\nACTION: ${action}`);
    } catch (err) {
      console.error('Copilot analyze failed', err);
      const message = 'Copilot is unavailable right now. Please verify the Spring backend and Python service.';
      this.error.set(message);
      this.addBotMessage(`ERROR\n${message}`);
    } finally {
      this.loading.set(false);
    }
  }

  private buildPayload(selectedQuestion: string): CopilotAnalyzeRequest {
    const s = this.state();
    const product: QuoteRequest['product'] = {
      quantity: s.quantity ?? 0,
      productionPage: s.productionPage ?? 0,
      height: s.height ?? 0,
      width: s.width ?? 0,
      thickness: s.thickness ?? 0,
      securityLabel: s.securityLabel,
      hasCoil: s.hasCoil,
      hasInsert: s.hasInsert,
      hasTab: s.hasTab,
      hasBackcover: s.hasBackcover,
      perf: s.perf,
      doubleSidedCover: s.doubleSidedCover,
      shrinkwrap: s.shrinkwrap,
      threeHoleDrill: s.threeHoleDrill,
      textPaperType: s.textPaperType,
      textColor: s.textColor,
      coverPaperType: s.coverPaperType,
      coverFinishType: s.coverFinishType,
      coverColor: s.coverColor,
      priorityLevel: s.priorityLevel,
      headAndTail: s.headAndTail,
      coilType: s.coilType,
      tabColor: s.tabColor,
      insertPaperType: s.insertPaperType,
      caseFinishType: s.caseFinishType,
      spineType: s.spineType,
      labelType: s.labelType,
    };

    return {
      siren: s.siren,
      bindingType: s.bindingType,
      product,
      selectedQuestion,
      conversationHistory: this.buildConversationHistory(),
    };
  }

  private updateField(field: CopilotField, rawValue: string): void {
    this.state.update((current) => {
      const next = { ...current };
      if (field === 'height' || field === 'width' || field === 'quantity' || field === 'productionPage' || field === 'thickness') {
        const parsed = rawValue === '' ? null : Number(rawValue);
        next[field] = Number.isNaN(parsed as number) ? null : parsed;
        this.applyDependentDefaults(next);
        return next;
      }

      if (
        field === 'securityLabel' ||
        field === 'hasCoil' ||
        field === 'hasInsert' ||
        field === 'hasTab' ||
        field === 'hasBackcover' ||
        field === 'perf' ||
        field === 'doubleSidedCover' ||
        field === 'shrinkwrap' ||
        field === 'threeHoleDrill'
      ) {
        next[field] = Number(rawValue) === 1 ? 1 : 0;
        this.applyDependentDefaults(next);
        return next;
      }

      next[field] = rawValue;
      this.applyDependentDefaults(next);
      return next;
    });
  }

  private getNextVisibleStep(startIndex: number): number {
    let index = startIndex;
    while (index < this.questions.length) {
      const question = this.questions[index];
      if (this.shouldAskQuestion(question)) {
        break;
      }
      index += 1;
    }
    return index;
  }

  private shouldAskQuestion(question: CopilotQuestion): boolean {
    const s = this.state();
    switch (question.id) {
      case 'coilType':
        return s.bindingType === 'COILHARD' || s.bindingType === 'COILSOFT';
      case 'tabColor':
        return s.hasTab === 1;
      case 'insertPaperType':
        return s.hasInsert === 1;
      case 'threeHoleDrill':
        return s.bindingType === 'COILHARD' || s.bindingType === 'COILSOFT' || s.bindingType === 'LOOSELEAF';
      case 'spineType':
        return s.bindingType === 'LOOSELEAF' || s.bindingType === 'COILHARD' || s.bindingType === 'COILSOFT';
      case 'labelType':
        return s.securityLabel === 1;
      default:
        return true;
    }
  }

  private applyDependentDefaults(state: {
    bindingType: string;
    securityLabel: number;
    hasTab: number;
    hasInsert: number;
    threeHoleDrill: number;
    coilType: string;
    tabColor: string;
    insertPaperType: string;
    spineType: string;
    labelType: string;
  }): void {
    const isCoil = state.bindingType === 'COILHARD' || state.bindingType === 'COILSOFT';
    const supportsThreeHole = isCoil || state.bindingType === 'LOOSELEAF';
    const supportsSpineType = isCoil || state.bindingType === 'LOOSELEAF';

    if (!isCoil) {
      state.coilType = 'NONE';
    }
    if (!supportsThreeHole) {
      state.threeHoleDrill = 0;
    }
    if (state.hasTab !== 1) {
      state.tabColor = 'NONE';
    }
    if (state.hasInsert !== 1) {
      state.insertPaperType = 'NONE';
    }
    if (!supportsSpineType) {
      state.spineType = 'NONE';
    }
    if (state.securityLabel !== 1) {
      state.labelType = 'NONE';
    }
  }

  isNumericDraftEmpty(): boolean {
    const rawDraft = this.numericDraft();
    return (rawDraft == null ? '' : String(rawDraft)).trim().length === 0;
  }

  isBindingVisualQuestion(question: CopilotQuestion | null): boolean {
    return question?.id === 'bindingType';
  }

  isCoverFinishVisualQuestion(question: CopilotQuestion | null): boolean {
    return question?.id === 'coverFinishType';
  }

  isBooleanQuestion(question: CopilotQuestion | null): boolean {
    return question != null && this.booleanFields.has(question.id);
  }

  isPriorityQuestion(question: CopilotQuestion | null): boolean {
    return question?.id === 'priorityLevel';
  }

  setPriorityLevel(level: string): void {
    if (this.loading() || this.isConversationDone()) {
      return;
    }

    this.updateField('priorityLevel', level);

    const question = this.activeQuestion();
    if (question?.id === 'priorityLevel') {
      this.addUserMessage(level);
      this.advanceConversation();
    }
  }

  getBooleanOptionLabel(option: string): string {
    return option === '1' ? 'True' : 'False';
  }

  getBindingFamilyLabel(option: string): string {
    return this.bindingFamilyLabels[option as BindingFamily] ?? option;
  }

  getBindingFamilyImage(option: string): string | null {
    return this.bindingFamilyImages[option as BindingFamily] ?? null;
  }

  getCoverFinishLabel(option: string): string {
    return this.coverFinishLabels[option as CoverFinishType] ?? option;
  }

  getCoverFinishImage(option: string): string | null {
    return this.coverFinishImages[option as CoverFinishType] ?? null;
  }

  getCurrentBindingLabel(): string {
    const bindingType = this.state().bindingType;
    return bindingType ? this.getBindingFamilyLabel(bindingType) : 'Not selected';
  }

  getCurrentBindingImage(): string | null {
    return this.getBindingFamilyImage(this.state().bindingType);
  }

  getCurrentCoverFinishLabel(): string {
    const coverFinishType = this.state().coverFinishType;
    return coverFinishType ? this.getCoverFinishLabel(coverFinishType) : 'Not selected';
  }

  getCurrentCoverFinishImage(): string | null {
    return this.getCoverFinishImage(this.state().coverFinishType);
  }

  getCurrentFormatLabel(): string {
    const current = this.state();
    return this.buildFormatLabel(current.width, current.height);
  }

  getCurrentCoverColorLabel(): string {
    return this.formatEnumLabel(this.state().coverColor || 'NONE');
  }

  getCurrentCoverColorStyle(): string {
    return this.buildCoverColorStyle(this.state().coverColor);
  }

  getTopDriverBars(): CopilotBarDatum[] {
    return this.buildDriverBars(this.result());
  }

  getModelPredictionBars(): CopilotBarDatum[] {
    return this.buildModelBars(this.result());
  }

  getConfidenceMeterWidth(): number {
    return this.getConfidenceWidth(this.result()?.copilot.confidence ?? '');
  }

  getConfidenceToneClass(): string {
    return this.getConfidenceTone(this.result()?.copilot.confidence ?? '');
  }

  private buildFormatLabel(width: number | null, height: number | null): string {
    if (width == null || height == null) {
      return 'Size not defined';
    }
    return `${width} x ${height} mm`;
  }

  private buildCoverColorStyle(coverColor: string): string {
    switch (coverColor) {
      case 'FOUR_FOUR':
        return 'linear-gradient(135deg, #fb7185 0%, #38bdf8 50%, #facc15 100%)';
      case 'FOUR_ZERO':
        return 'linear-gradient(135deg, #fb7185 0%, #38bdf8 100%)';
      case 'FOUR_ONE':
        return 'linear-gradient(135deg, #fb7185 0%, #38bdf8 75%, #111827 100%)';
      case 'ONE_ZERO':
        return 'linear-gradient(135deg, #111827 0%, #f97316 100%)';
      case 'ZERO_ZERO':
        return 'linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)';
      default:
        return 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)';
    }
  }

  private buildDriverBars(response: CopilotAnalyzeResponse | null): CopilotBarDatum[] {
    const drivers = response?.pricing.explanation?.topDrivers ?? [];
    const validDrivers = drivers.filter((driver) => typeof driver.importance === 'number' && driver.importance != null);
    const maxValue = validDrivers.reduce((max, driver) => Math.max(max, driver.importance ?? 0), 0);

    return validDrivers.map((driver) => {
      const rawValue = driver.importance ?? 0;
      const displayValue = rawValue <= 1 ? `${(rawValue * 100).toFixed(1)}%` : `${rawValue.toFixed(1)}%`;
      return {
        label: this.formatFeatureLabel(driver.name),
        value: rawValue,
        displayValue,
        widthPercent: maxValue > 0 ? (rawValue / maxValue) * 100 : 0,
      };
    });
  }

  private buildModelBars(response: CopilotAnalyzeResponse | null): CopilotBarDatum[] {
    const modelSummaries = response?.pricing.explanation?.modelSummaries ?? [];
    const validModels = modelSummaries.filter((model) => typeof model.prediction === 'number' && model.prediction != null);
    const maxValue = validModels.reduce((max, model) => Math.max(max, model.prediction ?? 0), 0);
    const selectedModel = response?.pricing.selectedModel;

    return validModels.map((model) => ({
      label: model.label,
      value: model.prediction ?? 0,
      displayValue: `$${(model.prediction ?? 0).toFixed(2)}`,
      widthPercent: maxValue > 0 ? ((model.prediction ?? 0) / maxValue) * 100 : 0,
      accentClass: model.modelName === selectedModel ? 'copilot-bar-fill--selected' : 'copilot-bar-fill--muted',
    }));
  }

  private getConfidenceWidth(confidence: string): number {
    const normalized = confidence.toUpperCase();
    if (normalized === 'HIGH') return 100;
    if (normalized === 'MEDIUM') return 66;
    return 34;
  }

  private getConfidenceTone(confidence: string): string {
    const normalized = confidence.toUpperCase();
    if (normalized === 'HIGH') return 'copilot-meter__fill--high';
    if (normalized === 'MEDIUM') return 'copilot-meter__fill--medium';
    return 'copilot-meter__fill--low';
  }

  formatMessage(text: string): SafeHtml {
    const escaped = this.escapeHtml(text);
    const html = this.formatStructuredText(escaped);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private getOptionDisplayText(question: CopilotQuestion, option: string): string {
    if (this.isBooleanQuestion(question)) {
      return this.getBooleanOptionLabel(option);
    }
    if (this.isBindingVisualQuestion(question)) {
      return this.getBindingFamilyLabel(option);
    }
    if (this.isCoverFinishVisualQuestion(question)) {
      return this.getCoverFinishLabel(option);
    }
    return option;
  }

  private addBotMessage(text: string): void {
    this.messages.update((current) => [...current, { id: current.length + 1, sender: 'bot', text }]);
  }

  private async addStreamingBotMessage(text: string): Promise<void> {
    const messageId = this.messages().length + 1;
    this.messages.update((current) => [...current, { id: messageId, sender: 'bot', text: '', streaming: true }]);

    const chunks = text.split(/(\s+)/).filter((chunk) => chunk.length > 0);
    let currentText = '';

    for (const chunk of chunks) {
      currentText += chunk;
      this.messages.update((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, text: currentText, streaming: true } : message,
        ),
      );
      await this.wait(18);
    }

    this.messages.update((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, text, streaming: false } : message,
      ),
    );
  }

  private addUserMessage(text: string): void {
    this.messages.update((current) => [...current, { id: current.length + 1, sender: 'user', text }]);
  }

  private buildConversationHistory(): CopilotConversationTurn[] {
    return this.messages()
      .map((message) => ({
        role: (message.sender === 'bot' ? 'copilot' : 'user') as CopilotConversationTurn['role'],
        content: message.text,
      }))
      .filter((turn) => turn.content.trim().length > 0);
  }

  private wait(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private formatStructuredText(text: string): string {
    const lines = text.split('\n');
    const fragments: string[] = [];
    let paragraphLines: string[] = [];
    let listType: 'ol' | 'ul' | null = null;
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (!paragraphLines.length) return;
      fragments.push(`<p class="copilot-rich-paragraph">${this.applyInlineFormatting(paragraphLines.join('<br>'))}</p>`);
      paragraphLines = [];
    };

    const flushList = () => {
      if (!listType || !listItems.length) return;
      const className = listType === 'ol'
        ? 'copilot-rich-list copilot-rich-list--ordered'
        : 'copilot-rich-list copilot-rich-list--unordered';
      const tag = listType === 'ol' ? 'ol' : 'ul';
      const items = listItems.map((item) => `<li>${this.applyInlineFormatting(item)}</li>`).join('');
      fragments.push(`<${tag} class="${className}">${items}</${tag}>`);
      listType = null;
      listItems = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = Math.min(3, headingMatch[1].length);
        fragments.push(
          `<div class="copilot-rich-heading copilot-rich-heading--h${level}">${this.applyInlineFormatting(headingMatch[2])}</div>`,
        );
        continue;
      }

      if (this.isMarkerLine(trimmed)) {
        flushParagraph();
        flushList();
        fragments.push(`<div class="copilot-rich-marker">${this.applyInlineFormatting(trimmed)}</div>`);
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        flushParagraph();
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        flushParagraph();
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(trimmed.replace(/^[-*]\s+/, ''));
        continue;
      }

      flushList();
      paragraphLines.push(trimmed);
    }

    flushParagraph();
    flushList();
    return fragments.join('');
  }

  private applyInlineFormatting(value: string): string {
    return value.replace(/\*\*(.+?)\*\*/g, '<strong class="copilot-rich-strong">$1</strong>');
  }

  private isMarkerLine(value: string): boolean {
    return /^[A-Z][A-Z\s]{2,}$/.test(value);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatFeatureLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatEnumLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
