import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewEncapsulation,
  inject
} from '@angular/core';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { AuthService } from '../core/services/auth.service';
import { BookPreview3dFloatingComponent } from './book-preview-3d-floating';
import { BookPreviewFamily, computeFamilyFromBindingTypeAndCoverColor } from './book-preview-3d-utils';
import { BookSemanticTextureMap, extractSemanticTextureMap } from './book-preview-semantic-textures';
import {
  CoverTemplateApiModel,
  CoverTemplateUsageApiModel,
  CoverTemplatesApiService
} from '../features/backoffice/core/cover-templates-api.service';

const MILLIMETERS_PER_CENTIMETER = 10;
const PRINT_SCENE_DPI = 300;
const DEFAULT_BLANK_WIDTH = 210;
const DEFAULT_BLANK_HEIGHT = 297;
const DEFAULT_BLANK_THICKNESS = 20;
const SYSTEM_BLANKS_PATH = '/cesdk/1.67.0/ly.img.template/blanks/content.json';
const FALLBACK_SCOPES: string[] = [
  'text/edit',
  'text/character',
  'fill/change',
  'fill/changeType',
  'stroke/change',
  'shape/change',
  'layer/move',
  'layer/resize',
  'layer/rotate',
  'layer/flip',
  'layer/crop',
  'layer/opacity',
  'layer/blendMode',
  'layer/visibility',
  'layer/clipping',
  'appearance/adjustments',
  'appearance/filter',
  'appearance/effect',
  'appearance/blur',
  'appearance/shadow',
  'appearance/animation',
  'lifecycle/destroy',
  'lifecycle/duplicate',
  'editor/add',
  'editor/select'
];
const PLACEHOLDER_EDITABLE_SCOPES: string[] = [
  'text/edit',
  'text/character',
  'fill/change',
  'fill/changeType',
  'editor/select'
];

interface SceneBlockDefinition {
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  placeholder?: boolean;
}

interface ScenePageDefinition {
  width?: number;
  height?: number;
  blocks?: SceneBlockDefinition[];
}

interface CustomSceneDefinition {
  pages?: ScenePageDefinition[];
}

type ManagedTemplateFamily = 'WRAP_1P' | 'WRAP_2P' | 'FLAT_2P' | 'FLAT_4P';

interface TemplateLayoutMetrics {
  family: ManagedTemplateFamily;
  trimWidth: number;
  trimHeight: number;
  thickness: number;
  pageWidth: number;
  pageHeight: number;
}

export interface AdminTemplate {
  id: string;
  templateId?: number;
  sourceBlankCode?: string;
  label: string;
  description: string;
  family: string;
  type: 'wrap' | 'flat' | 'blank';
  pages: number;
  meta: {
    uri: string;
    thumbUri: string;
    width: number;
    height: number;
    thickness?: number;
  };
  status?: 'DRAFT' | 'PUBLISHED' | 'MY_TEMPLATE';
  sceneString?: string;
  createdAt?: string;
  updatedAt?: string;
  metadataJson?: string;
  creationAuthorId?: number | null;
}

interface CesdkLibraryAsset {
  id: string;
  label: string;
  description: string;
  family: string;
  meta: {
    uri: string;
    thumbUri: string;
    width: number;
    height: number;
  };
  sourceId: string;
  rawAsset: unknown;
}

type LibraryAsset = AdminTemplate | CesdkLibraryAsset;

interface LibraryTab {
  id: string;
  title: string;
  icon: 'blanks' | 'myTemplates' | 'published' | 'templates' | 'images' | 'text' | 'shapes' | 'stickers';
  category: 'admin' | 'cesdk';
  sourceId?: string;
}

export interface EditorTemplateAssociationEvent {
  templateId: number;
  templateName: string;
  templateFamily: string;
  sceneString: string;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function resolveLabel(value: unknown, fallback: string): string {
  if (hasText(value)) {
    return value.trim();
  }

  const localized = asRecord(value);
  if (hasText(localized['en'])) {
    return localized['en'].trim();
  }

  const firstText = Object.values(localized).find((entry) => hasText(entry));
  return hasText(firstText) ? firstText.trim() : fallback;
}

function resolveDescription(value: unknown): string {
  if (hasText(value)) {
    return value.trim();
  }

  const localized = asRecord(value);
  if (hasText(localized['en'])) {
    return localized['en'].trim();
  }

  const firstText = Object.values(localized).find((entry) => hasText(entry));
  return hasText(firstText) ? firstText.trim() : '';
}

export function normalizeBlankAsset(asset: unknown): AdminTemplate {
  const source = asRecord(asset);
  const meta = asRecord(source['meta']);
  const id = hasText(source['id']) ? source['id'].trim() : `blank-${Date.now()}`;

  return {
    id,
    label: resolveLabel(source['label'], id),
    description: resolveDescription(source['description']),
    family: hasText(source['family']) ? source['family'].trim() : 'CUSTOM',
    type: hasText(source['type']) ? (source['type'].trim() as AdminTemplate['type']) : 'blank',
    pages: toPositiveNumber(source['pages'], 1),
    meta: {
      uri: hasText(meta['uri']) ? meta['uri'].trim() : '',
      thumbUri: hasText(meta['thumbUri']) ? meta['thumbUri'].trim() : '',
      width: toPositiveNumber(meta['width'], DEFAULT_BLANK_WIDTH),
      height: toPositiveNumber(meta['height'], DEFAULT_BLANK_HEIGHT),
      thickness: typeof meta['thickness'] === 'number' && Number.isFinite(meta['thickness'])
          ? meta['thickness']
          : undefined
    }
  };
}

export async function normalizeBlankAssets(assets: unknown): Promise<AdminTemplate[]> {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.map((asset) => normalizeBlankAsset(asset));
}

function createFallbackBlanks(): AdminTemplate[] {
  return [
    {
      id: 'wrap-1p-blank',
      label: 'WRAP 1P Blank',
      description: 'Template for 1-page wrap book',
      family: 'WRAP_1P',
      type: 'wrap',
      pages: 1,
      meta: {
        uri: '',
        thumbUri: '',
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT,
        thickness: 20
      }
    },
    {
      id: 'wrap-2p-blank',
      label: 'WRAP 2P Blank',
      description: 'Template for 2-page wrap book',
      family: 'WRAP_2P',
      type: 'wrap',
      pages: 2,
      meta: {
        uri: '',
        thumbUri: '',
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT,
        thickness: 20
      }
    },
    {
      id: 'flat-2p-blank',
      label: 'FLAT 2P Blank',
      description: 'Template for 2-page flat book',
      family: 'FLAT_2P',
      type: 'flat',
      pages: 2,
      meta: {
        uri: '',
        thumbUri: '',
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT
      }
    },
    {
      id: 'flat-4p-blank',
      label: 'FLAT 4P Blank',
      description: 'Template for 4-page flat book',
      family: 'FLAT_4P',
      type: 'flat',
      pages: 4,
      meta: {
        uri: '',
        thumbUri: '',
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT
      }
    }
  ];
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, BookPreview3dFloatingComponent],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
  encapsulation: ViewEncapsulation.None
})
export class Editor implements AfterViewInit, OnChanges, OnDestroy {
  readonly sizePresets = [
    { id: '16x19', label: '16 x 19 cm', width: 16, height: 19 },
    { id: '14x21', label: '14 x 21 cm', width: 14, height: 21 },
    { id: '17x24', label: '17 x 24 cm', width: 17, height: 24 },
    { id: '21x29.7', label: '21 x 29.7 cm', width: 21, height: 29.7 },
    { id: '21.6x27.9', label: '21.6 x 27.9 cm', width: 21.6, height: 27.9 }
  ] as const;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly coverTemplatesApi = inject(CoverTemplatesApiService);

  @Input() mode: 'default' | 'bookCreation' = 'default';
  @Input() bookBindingType: string | null = null;
  @Input() bookCoverColor: string | null = null;
  @Input() bookWidth: number | string | null = null;
  @Input() bookHeight: number | string | null = null;
  @Input() bookThickness: number | string | null = null;
  @Input() initialTemplateId: number | null = null;

  @Output() templateAssociated = new EventEmitter<EditorTemplateAssociationEvent>();
  @Output() templateSelectionCleared = new EventEmitter<void>();

  cesdk: Awaited<ReturnType<typeof CreativeEditorSDK.create>> | null = null;
  currentLibraryEntry = 'system-blanks';
  isLibraryPanelOpen = false;
  isLibraryLoading = false;
  isExportingPdf = false;
  isAssociatingTemplateToBook = false;
  isCheckingTemplateUsage = false;
  isProcessingSaveDecision = false;
  saveDecisionMode: 'linked' | 'choice' | 'createOnly' = 'createOnly';
  saveDecisionMessage = '';
  saveDecisionLinkedBooksCount = 0;
  libraryError = '';
  libraryNotice = '';
  libraryAssets: LibraryAsset[] = [];
  previewTextures: BookSemanticTextureMap | null = null;

  private readonly cesdkVersion = CreativeEditorSDK.version;
  private readonly systemBlanksPath = SYSTEM_BLANKS_PATH.replace('1.67.0', this.cesdkVersion);
  private blankAssetsCache: AdminTemplate[] | null = null;
  private blankAssetsPromise: Promise<AdminTemplate[]> | null = null;
  private saveDecisionDialogId: string | null = null;
  private currentTemplateSource: 'system' | 'published' | 'myTemplate' | 'cesdk' | null = null;
  private hasAppliedInitialBookTemplate = false;
  private previewRefreshInFlight = false;
  private previewRefreshQueued = false;
  private previewObjectUrls: string[] = [];
  private previewInteractionTarget: HTMLElement | null = null;
  private readonly previewInteractionListeners: Array<{ type: string; listener: EventListener }> = [];
  private isEditorDestroying = false;
  currentTemplate: AdminTemplate | null = null;

  private readonly defaultLibraryTabs: readonly LibraryTab[] = [
    { id: 'system-blanks', title: 'System Blanks', icon: 'blanks', category: 'admin' },
    { id: 'my-templates', title: 'MyTemplates', icon: 'myTemplates', category: 'admin' },
    { id: 'published', title: 'Published', icon: 'published', category: 'admin' },
    { id: 'ly.img.template', title: 'Templates', icon: 'templates', sourceId: 'ly.img.template', category: 'cesdk' },
    { id: 'ly.img.image', title: 'Images', icon: 'images', sourceId: 'ly.img.image', category: 'cesdk' },
    { id: 'ly.img.text', title: 'Text', icon: 'text', sourceId: 'ly.img.textComponents', category: 'cesdk' },
    { id: 'ly.img.vectorpath', title: 'Shapes', icon: 'shapes', sourceId: 'ly.img.vectorpath', category: 'cesdk' },
    { id: 'ly.img.sticker', title: 'Stickers', icon: 'stickers', sourceId: 'ly.img.sticker', category: 'cesdk' }
  ];
  private readonly bookCreationLibraryTabs: readonly LibraryTab[] = [
    { id: 'system-blanks', title: 'System Blanks', icon: 'blanks', category: 'admin' },
    { id: 'my-templates', title: 'MyTemplates', icon: 'myTemplates', category: 'admin' },
    { id: 'published', title: 'Published', icon: 'published', category: 'admin' },
    { id: 'ly.img.image', title: 'Images', icon: 'images', sourceId: 'ly.img.image', category: 'cesdk' },
    { id: 'ly.img.text', title: 'Text', icon: 'text', sourceId: 'ly.img.textComponents', category: 'cesdk' },
    { id: 'ly.img.vectorpath', title: 'Shapes', icon: 'shapes', sourceId: 'ly.img.vectorpath', category: 'cesdk' },
    { id: 'ly.img.sticker', title: 'Stickers', icon: 'stickers', sourceId: 'ly.img.sticker', category: 'cesdk' }
  ];

  get libraryTabs(): readonly LibraryTab[] {
    return this.isBookCreationMode() ? this.bookCreationLibraryTabs : this.defaultLibraryTabs;
  }

  get selectedSizeId(): string {
    const currentWidth = typeof this.bookWidth === 'string' ? Number(this.bookWidth) : this.bookWidth;
    const currentHeight = typeof this.bookHeight === 'string' ? Number(this.bookHeight) : this.bookHeight;
    const matched = this.sizePresets.find((size) => size.width === currentWidth && size.height === currentHeight);
    return matched?.id ?? this.sizePresets[0].id;
  }

  updateEditorSize(sizeId: string): void {
    const nextSize = this.sizePresets.find((size) => size.id === sizeId);
    if (!nextSize) {
      return;
    }

    this.bookWidth = nextSize.width;
    this.bookHeight = nextSize.height;
    this.cdr.markForCheck();

    if (this.cesdk) {
      void this.applyBookDimensionsToCurrentScene(this.currentTemplate?.family, { resizeContentAware: true });
      this.schedulePreviewTextureRefresh();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const dimensionsChanged = !!changes['bookWidth'] || !!changes['bookHeight'] || !!changes['bookThickness'];
    this.ensureCurrentLibraryEntryIsValid();
    if (changes['initialTemplateId']) {
      this.hasAppliedInitialBookTemplate = false;
    }
    if (
      this.cesdk &&
      (changes['bookBindingType'] || changes['bookCoverColor'] || dimensionsChanged)
    ) {
      this.schedulePreviewTextureRefresh();
    }

    if (this.cesdk && !this.isBookCreationMode() && dimensionsChanged) {
      void this.applyBookDimensionsToCurrentScene(this.currentTemplate?.family, { resizeContentAware: true });
    }

    if (!this.isBookCreationMode() || !this.cesdk) {
      return;
    }

    void this.handleBookCreationContextChanges(changes);
    if (changes['initialTemplateId']) {
      void this.tryApplyInitialTemplateInBookMode();
    }
  }

  async ngAfterViewInit(): Promise<void> {
    this.isEditorDestroying = false;
    this.ensureCurrentLibraryEntryIsValid();
    const localBaseURL = `/cesdk/${this.cesdkVersion}/`;
    const initialBlanksPromise = this.loadSystemBlanks();

    if (this.isBookCreationMode()) {
      this.isLibraryPanelOpen = true;
    }

    if (this.currentLibraryEntry === 'system-blanks') {
      this.isLibraryLoading = true;
      initialBlanksPromise
          .then((blanks) => {
            if (this.currentLibraryEntry === 'system-blanks' && this.libraryAssets.length === 0) {
              this.libraryAssets = blanks;
              this.isLibraryLoading = false;
              this.cdr.markForCheck();
            }
          })
          .catch(() => {
            this.isLibraryLoading = false;
            this.cdr.markForCheck();
          });
    }

    this.cesdk = await CreativeEditorSDK.create('#editor', {
      baseURL: localBaseURL,
      devMode: true,
    });
    this.cesdk.ui.setDockOrder([]);
    const assetLibraryPanelId = '//ly.img.panel/assetLibrary';
    if (this.cesdk.ui.isPanelOpen(assetLibraryPanelId)) {
      this.cesdk.ui.closePanel(assetLibraryPanelId);
    }
    await this.cesdk.addDefaultAssetSources();
    await this.cesdk.addDemoAssetSources({ sceneMode: 'Design' });
    this.configureEditorPageView();
    this.configureNativeNavigationBar();
    await this.createInitialScene();
    await this.loadLibraryAssets(this.currentLibraryEntry);
    await this.tryApplyInitialTemplateInBookMode();
    this.registerPreviewInteractionListeners();
    this.schedulePreviewTextureRefresh();
  }

  private configureEditorPageView(): void {
    if (!this.cesdk) {
      return;
    }

    try {
      this.cesdk.engine.settings.setBool('features/singlePageModeEnabled', false);
      this.cesdk.engine.settings.setBool('features/pageCarouselEnabled', true);
      this.cesdk.engine.settings.setBool('page/title/show', true);
      this.cesdk.engine.settings.setBool('page/title/showOnSinglePage', true);
      this.cesdk.engine.settings.setBool('page/title/showPageTitleTemplate', false);
      this.cesdk.engine.settings.setBool('page/title/appendPageName', true);
      this.cesdk.engine.settings.setString('page/title/separator', ' - ');
    } catch {
      // Certaines options UI peuvent ne pas être disponibles selon la config CE.SDK.
    }
  }

  private configureNativeNavigationBar(): void {
    if (!this.cesdk) {
      return;
    }

    if (this.isBookCreationMode()) {
      const bookCreationNavItems: Array<string | Record<string, unknown>> = [
        'ly.img.undoRedo.navigationBar',
        'ly.img.pageResize.navigationBar',
        'ly.img.title.navigationBar',
        'ly.img.zoom.navigationBar',
        'ly.img.spacer',
        {
          id: 'ly.img.action.navigationBar',
          key: 'save-template-action',
          label: 'Save Template',
          variant: 'regular',
          color: 'accent',
          onClick: async () => {
            await this.saveCurrentAsMyTemplate();
          }
        },
        {
          id: 'ly.img.action.navigationBar',
          key: 'save-associate-template-action',
          label: this.isAssociatingTemplateToBook ? 'Saving...' : 'Save and Associate to Book',
          variant: 'regular',
          color: 'accent',
          isDisabled: this.isAssociatingTemplateToBook,
          isLoading: this.isAssociatingTemplateToBook,
          onClick: async () => {
            await this.saveAndAssociateToBook();
          }
        }
      ];

      this.cesdk.ui.setNavigationBarOrder(bookCreationNavItems);
      return;
    }

    const navigationItems: Array<string | Record<string, unknown>> = [
      'ly.img.undoRedo.navigationBar',
      'ly.img.pageResize.navigationBar',
      'ly.img.title.navigationBar',
      'ly.img.zoom.navigationBar',
      'ly.img.spacer',
      {
        id: 'ly.img.action.navigationBar',
        key: 'save-template-action',
        label: this.isCheckingTemplateUsage ? 'Checking...' : 'Save Template',
        variant: 'regular',
        color: 'accent',
        isDisabled: this.isCheckingTemplateUsage || this.isProcessingSaveDecision,
        isLoading: this.isCheckingTemplateUsage,
        onClick: async () => {
          await this.handleSaveTemplateRequested();
        }
      }
    ];

    if (this.canPublishTemplates()) {
      navigationItems.push({
        id: 'ly.img.action.navigationBar',
        key: 'publish-template-action',
        label: 'Publish',
        variant: 'regular',
        color: 'accent',
        onClick: async () => {
          await this.publishCurrentTemplate();
        }
      });
    }

    navigationItems.push({
      id: 'ly.img.action.navigationBar',
      key: 'add-text-action',
      label: 'Add Text',
      variant: 'regular',
      onClick: async () => {
        await this.addTextBlock();
      }},
    {
      id: 'ly.img.action.navigationBar',
      key: 'export-pdf-action',
      label: this.isExportingPdf ? 'Exporting PDF...' : 'Export PDF',
      variant: 'regular',
      isDisabled: this.isExportingPdf,
      isLoading: this.isExportingPdf,
      onClick: async () => {
        await this.exportCurrentAsPdf();
      }
    });

    this.cesdk.ui.setNavigationBarOrder(navigationItems);
  }
  async addTextBlock(): Promise<void> {
    if (!this.cesdk) {
      this.libraryError = 'Editor is not ready yet.';
      return;
    }

    try {
      const currentPage = this.cesdk.engine.scene.getCurrentPage();
      if (!currentPage || !this.cesdk.engine.block.isValid(currentPage)) {
        throw new Error('No valid page available.');
      }

      const textBlock = this.cesdk.engine.block.create('text');
      this.cesdk.engine.block.setString(textBlock, 'text/text', 'Votre texte');
      this.cesdk.engine.block.setWidth(textBlock, 80);
      this.cesdk.engine.block.setHeight(textBlock, 18);
      this.cesdk.engine.block.setPositionX(textBlock, 12);
      this.cesdk.engine.block.setPositionY(textBlock, 12);

      this.cesdk.engine.block.appendChild(currentPage, textBlock);
      this.cesdk.engine.block.setSelected(textBlock, true);
      this.schedulePreviewTextureRefresh();
    } catch (error) {
      console.error('Erreur ajout zone texte:', error);
      this.libraryError = 'Impossible d’ajouter une zone texte.';
    }
  }

  private isBookCreationMode(): boolean {
    return this.mode === 'bookCreation';
  }

  private ensureCurrentLibraryEntryIsValid(): void {
    if (this.libraryTabs.some((tab) => tab.id === this.currentLibraryEntry)) {
      return;
    }
    this.currentLibraryEntry = this.libraryTabs[0]?.id ?? 'system-blanks';
  }

  private normalizeManagedFamily(family: string | null | undefined): ManagedTemplateFamily | null {
    const normalized = (family ?? '').trim().toUpperCase();
    if (normalized === 'WRAP_1P' || normalized === 'WRAP_2P' || normalized === 'FLAT_2P' || normalized === 'FLAT_4P') {
      return normalized;
    }
    return null;
  }

  private configureCurrentSceneForPrint(): void {
    if (!this.cesdk) {
      return;
    }

    const scene = this.cesdk.engine.scene.get();
    if (!scene || !this.cesdk.engine.block.isValid(scene)) {
      return;
    }

    try {
      this.cesdk.engine.scene.setDesignUnit('Millimeter');
    } catch {
      // Ignore unsupported design-unit updates.
    }

    try {
      this.cesdk.engine.block.setFloat(scene, 'scene/dpi', PRINT_SCENE_DPI);
    } catch {
      // DPI is a print optimization; editor rendering still works without it.
    }
  }

  private resolveRequiredBookTemplateFamily(): string | null {
    if (!this.isBookCreationMode()) {
      return null;
    }

    const binding = (this.bookBindingType ?? '').trim().toUpperCase();
    const coverColor = (this.bookCoverColor ?? '').trim().toUpperCase();
    const isFourZero = coverColor === 'FOUR_ZERO' || coverColor === '4/0';

    const isCasebindOrPerfect = binding.startsWith('CASEBIND') || binding.startsWith('PERFECT');
    if (isCasebindOrPerfect) {
      return isFourZero ? 'WRAP_1P' : 'WRAP_2P';
    }

    const isCoilOrLooseleaf = binding.startsWith('COIL') || binding.startsWith('LOOSELEAF');
    if (isCoilOrLooseleaf) {
      return isFourZero ? 'FLAT_2P' : 'FLAT_4P';
    }

    return null;
  }

  private toBookPositiveNumber(value: number | string | null | undefined, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return fallback;
  }

  private toBookPositiveMillimeters(value: number | string | null | undefined, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value * MILLIMETERS_PER_CENTIMETER;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed * MILLIMETERS_PER_CENTIMETER;
      }
    }

    return fallback;
  }

  private resolveBookDimensionsForFamily(family: string | null): { pageWidth: number; pageHeight: number; trimWidth: number; trimHeight: number; thickness: number } {
    const trimWidth = this.toBookPositiveMillimeters(this.bookWidth, DEFAULT_BLANK_WIDTH);
    const trimHeight = this.toBookPositiveMillimeters(this.bookHeight, DEFAULT_BLANK_HEIGHT);
    const thickness = this.toBookPositiveMillimeters(this.bookThickness, DEFAULT_BLANK_THICKNESS);

    if (family?.startsWith('WRAP_')) {
      return {
        pageWidth: trimWidth * 2 + thickness,
        pageHeight: trimHeight,
        trimWidth,
        trimHeight,
        thickness
      };
    }

    return {
      pageWidth: trimWidth,
      pageHeight: trimHeight,
      trimWidth,
      trimHeight,
      thickness
    };
  }

  private buildLayoutMetricsForFamily(familyHint: string | null | undefined): TemplateLayoutMetrics {
    const family = this.normalizeManagedFamily(familyHint)
      ?? this.normalizeManagedFamily(this.resolveRequiredBookTemplateFamily())
      ?? 'WRAP_1P';
    const dimensions = this.resolveBookDimensionsForFamily(family);
    return {
      family,
      trimWidth: dimensions.trimWidth,
      trimHeight: dimensions.trimHeight,
      thickness: dimensions.thickness,
      pageWidth: dimensions.pageWidth,
      pageHeight: dimensions.pageHeight
    };
  }

  private readCurrentFirstPageSize(): { width: number; height: number } | null {
    if (!this.cesdk) {
      return null;
    }

    const page = this.getScenePages()[0];
    if (typeof page !== 'number' || !this.cesdk.engine.block.isValid(page)) {
      return null;
    }

    try {
      const width = this.cesdk.engine.block.getWidth(page);
      const height = this.cesdk.engine.block.getHeight(page);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
      }
      return { width, height };
    } catch {
      return null;
    }
  }

  private normalizeLayoutMetricsCandidate(candidate: unknown): TemplateLayoutMetrics | null {
    const source = asRecord(candidate);
    const family = this.normalizeManagedFamily(source['family'] as string | null | undefined);
    if (!family) {
      return null;
    }

    const fallback = this.buildLayoutMetricsForFamily(family);
    const trimWidth = this.toBookPositiveNumber(source['trimWidth'] as number | string | null | undefined, fallback.trimWidth);
    const trimHeight = this.toBookPositiveNumber(source['trimHeight'] as number | string | null | undefined, fallback.trimHeight);
    const thickness = this.toBookPositiveNumber(source['thickness'] as number | string | null | undefined, fallback.thickness);

    const defaultPageWidth = family.startsWith('WRAP_') ? trimWidth * 2 + thickness : trimWidth;
    const pageWidth = this.toBookPositiveNumber(source['pageWidth'] as number | string | null | undefined, defaultPageWidth);
    const pageHeight = this.toBookPositiveNumber(source['pageHeight'] as number | string | null | undefined, trimHeight);

    return { family, trimWidth, trimHeight, thickness, pageWidth, pageHeight };
  }

  private readLayoutMetricsFromMetadata(metadataJson: string | null | undefined): TemplateLayoutMetrics | null {
    if (!hasText(metadataJson)) {
      return null;
    }

    try {
      const parsed = asRecord(JSON.parse(metadataJson));
      if ('layoutMetrics' in parsed) {
        return this.normalizeLayoutMetricsCandidate(parsed['layoutMetrics']);
      }
      return this.normalizeLayoutMetricsCandidate(parsed);
    } catch {
      return null;
    }
  }

  private mergeLayoutMetricsIntoMetadata(
    existingMetadataJson: string | null | undefined,
    metrics: TemplateLayoutMetrics
  ): string {
    let parsed: Record<string, unknown> = {};

    if (hasText(existingMetadataJson)) {
      try {
        parsed = asRecord(JSON.parse(existingMetadataJson));
      } catch {
        parsed = {};
      }
    }

    parsed['layoutMetrics'] = {
      family: metrics.family,
      trimWidth: metrics.trimWidth,
      trimHeight: metrics.trimHeight,
      thickness: metrics.thickness,
      pageWidth: metrics.pageWidth,
      pageHeight: metrics.pageHeight
    };

    return JSON.stringify(parsed);
  }

  private buildCurrentLayoutMetricsForTemplate(familyHint: string | null | undefined): TemplateLayoutMetrics {
    const family = this.normalizeManagedFamily(familyHint) ?? 'WRAP_1P';
    const fromInputs = this.buildLayoutMetricsForFamily(family);
    const fromExistingMetadata = this.readLayoutMetricsFromMetadata(this.currentTemplate?.metadataJson);
    const sceneSize = this.readCurrentFirstPageSize();

    let trimWidth = fromExistingMetadata?.trimWidth ?? fromInputs.trimWidth;
    let trimHeight = fromExistingMetadata?.trimHeight ?? fromInputs.trimHeight;
    let thickness = fromExistingMetadata?.thickness ?? fromInputs.thickness;
    let pageWidth = fromExistingMetadata?.pageWidth ?? fromInputs.pageWidth;
    let pageHeight = fromExistingMetadata?.pageHeight ?? fromInputs.pageHeight;

    if (sceneSize) {
      if (family.startsWith('WRAP_')) {
        const expectedSpreadWidth = trimWidth * 2 + thickness;
        const looksLikeFullSpread = this.areCloseDimensions(sceneSize.width, expectedSpreadWidth, 2);

        if (looksLikeFullSpread) {
          pageWidth = sceneSize.width;
          pageHeight = sceneSize.height;
          const inferredTrimWidth = (sceneSize.width - thickness) / 2;
          if (Number.isFinite(inferredTrimWidth) && inferredTrimWidth > 0) {
            trimWidth = inferredTrimWidth;
          }
        } else {
          // In native CE.SDK resize, admins enter the intended book width/height.
          // For WRAP templates we reinterpret that width as trim width, then
          // expand the effective spread with the preserved thickness.
          trimWidth = sceneSize.width;
          pageWidth = trimWidth * 2 + thickness;
          pageHeight = sceneSize.height;
        }
        trimHeight = sceneSize.height;
      } else {
        pageWidth = sceneSize.width;
        pageHeight = sceneSize.height;
        trimWidth = sceneSize.width;
        trimHeight = sceneSize.height;
      }
    }

    return { family, trimWidth, trimHeight, thickness, pageWidth, pageHeight };
  }

  private readFirstPageSizeFromSceneString(sceneString: string): { width: number; height: number } | null {
    if (!hasText(sceneString)) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(sceneString);
    } catch {
      return null;
    }

    const candidates: Array<{ width: number; height: number; score: number }> = [];
    const visited = new Set<unknown>();

    const visit = (node: unknown, keyHint = ''): void => {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (visited.has(node)) {
        return;
      }
      visited.add(node);

      const record = asRecord(node);
      const width = typeof record['width'] === 'number' ? record['width'] : NaN;
      const height = typeof record['height'] === 'number' ? record['height'] : NaN;
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        const typeValue = hasText(record['type']) ? record['type'].toLowerCase() : '';
        let score = 0;
        if (keyHint.toLowerCase().includes('page')) {
          score += 2;
        }
        if (typeValue.includes('page')) {
          score += 2;
        }
        if (Array.isArray(record['blocks']) || Array.isArray(record['children'])) {
          score += 1;
        }
        if (score > 0) {
          candidates.push({ width, height, score });
        }
      }

      for (const [key, value] of Object.entries(record)) {
        if (Array.isArray(value)) {
          for (const child of value) {
            visit(child, key);
          }
        } else {
          visit(value, key);
        }
      }
    };

    visit(parsed);
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.width * b.height - a.width * a.height;
    });

    return { width: candidates[0].width, height: candidates[0].height };
  }

  private deriveWrapSourceMetricsFromSceneString(
    sceneString: string,
    family: ManagedTemplateFamily,
    targetMetrics: TemplateLayoutMetrics
  ): TemplateLayoutMetrics | null {
    if (!(family === 'WRAP_1P' || family === 'WRAP_2P')) {
      return null;
    }

    const firstPage = this.readFirstPageSizeFromSceneString(sceneString);
    if (!firstPage) {
      return null;
    }

    const sourcePageWidth = firstPage.width;
    const sourcePageHeight = firstPage.height;
    if (sourcePageWidth <= 0 || sourcePageHeight <= 0) {
      return null;
    }

    const thicknessRatio = targetMetrics.pageWidth > 0
      ? targetMetrics.thickness / targetMetrics.pageWidth
      : 0;
    const normalizedRatio = Math.min(Math.max(thicknessRatio, 0.005), 0.35);
    const sourceThickness = Math.max(0.1, sourcePageWidth * normalizedRatio);
    const sourceTrimWidth = (sourcePageWidth - sourceThickness) / 2;

    if (!Number.isFinite(sourceTrimWidth) || sourceTrimWidth <= 0) {
      return null;
    }

    return {
      family,
      trimWidth: sourceTrimWidth,
      trimHeight: sourcePageHeight,
      thickness: sourceThickness,
      pageWidth: sourcePageWidth,
      pageHeight: sourcePageHeight
    };
  }

  private deriveWrapSourceMetricsFromLoadedScene(
    family: ManagedTemplateFamily,
    targetMetrics: TemplateLayoutMetrics
  ): TemplateLayoutMetrics | null {
    if (!this.cesdk || !(family === 'WRAP_1P' || family === 'WRAP_2P')) {
      return null;
    }

    const firstPage = this.getScenePages()[0];
    if (typeof firstPage !== 'number' || !this.cesdk.engine.block.isValid(firstPage)) {
      return null;
    }

    try {
      const sourcePageWidth = this.cesdk.engine.block.getWidth(firstPage);
      const sourcePageHeight = this.cesdk.engine.block.getHeight(firstPage);
      if (!Number.isFinite(sourcePageWidth) || !Number.isFinite(sourcePageHeight) || sourcePageWidth <= 0 || sourcePageHeight <= 0) {
        return null;
      }

      let sourceThickness = Math.max(0.1, targetMetrics.thickness);
      let sourceTrimWidth = (sourcePageWidth - sourceThickness) / 2;
      if (!Number.isFinite(sourceTrimWidth) || sourceTrimWidth <= 0) {
        sourceThickness = Math.max(0.1, Math.min(sourcePageWidth * 0.2, DEFAULT_BLANK_THICKNESS));
        sourceTrimWidth = (sourcePageWidth - sourceThickness) / 2;
      }
      if (!Number.isFinite(sourceTrimWidth) || sourceTrimWidth <= 0) {
        return null;
      }

      return {
        family,
        trimWidth: sourceTrimWidth,
        trimHeight: sourcePageHeight,
        thickness: sourceThickness,
        pageWidth: sourcePageWidth,
        pageHeight: sourcePageHeight
      };
    } catch {
      return null;
    }
  }

  private getPageContentBlocks(pageId: number): number[] {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(pageId)) {
      return [];
    }

    return this.cesdk.engine.block
      .getChildren(pageId)
      .filter((blockId) => this.cesdk!.engine.block.isValid(blockId) && !this.isSceneOrPageBlock(blockId));
  }

  private readBlockFrame(blockId: number): { x: number; y: number; width: number; height: number } | null {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(blockId)) {
      return null;
    }

    try {
      const x = this.cesdk.engine.block.getPositionX(blockId);
      const y = this.cesdk.engine.block.getPositionY(blockId);
      const width = this.cesdk.engine.block.getWidth(blockId);
      const height = this.cesdk.engine.block.getHeight(blockId);

      if (![x, y, width, height].every((value) => Number.isFinite(value))) {
        return null;
      }

      if (width <= 0 || height <= 0) {
        return null;
      }

      return { x, y, width, height };
    } catch {
      return null;
    }
  }

  private writeBlockFrame(
    blockId: number,
    frame: { x: number; y: number; width: number; height: number }
  ): void {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(blockId)) {
      return;
    }

    const safeWidth = Math.max(0.1, frame.width);
    const safeHeight = Math.max(0.1, frame.height);

    try {
      this.cesdk.engine.block.setSize(blockId, safeWidth, safeHeight, { maintainCrop: true });
    } catch {
      try {
        this.cesdk.engine.block.setWidth(blockId, safeWidth, true);
        this.cesdk.engine.block.setHeight(blockId, safeHeight, true);
      } catch {
        // non-resizable block
      }
    }

    // Keep intended top-left after resizing.
    try {
      this.cesdk.engine.block.setPosition(blockId, frame.x, frame.y);
    } catch {
      try {
        this.cesdk.engine.block.setPositionX(blockId, frame.x);
        this.cesdk.engine.block.setPositionY(blockId, frame.y);
      } catch {
        // non-positionable block
      }
    }
  }

  private resizeFlatPageContent(
    pageId: number,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): void {
    if (!this.cesdk || sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    const scaleX = targetWidth / sourceWidth;
    const scaleY = targetHeight / sourceHeight;
    const blocks = this.getPageContentBlocks(pageId);

    for (const blockId of blocks) {
      const frame = this.readBlockFrame(blockId);
      if (!frame) {
        continue;
      }

      this.writeBlockFrame(blockId, {
        x: frame.x * scaleX,
        y: frame.y * scaleY,
        width: frame.width * scaleX,
        height: frame.height * scaleY
      });
    }
  }

  private resizeWrapOutsidePageContent(
    pageId: number,
    sourceMetrics: TemplateLayoutMetrics,
    targetMetrics: TemplateLayoutMetrics
  ): void {
    if (!this.cesdk || sourceMetrics.trimWidth <= 0 || sourceMetrics.trimHeight <= 0) {
      return;
    }

    // WRAP page 1 is a semantic spread: Back | Spine | Front.
    // It cannot be remapped with one global horizontal scale.
    const sourceBackStart = 0;
    const sourceSpineStart = sourceMetrics.trimWidth;
    const sourceFrontStart = sourceMetrics.trimWidth + sourceMetrics.thickness;

    const targetBackStart = 0;
    const targetSpineStart = targetMetrics.trimWidth;
    const targetFrontStart = targetMetrics.trimWidth + targetMetrics.thickness;

    const coverScaleX = targetMetrics.trimWidth / sourceMetrics.trimWidth;
    const safeSourceThickness = Math.max(sourceMetrics.thickness, 0.1);
    const safeTargetThickness = Math.max(targetMetrics.thickness, 0.1);
    const spineScaleX = safeTargetThickness / safeSourceThickness;
    const scaleY = targetMetrics.trimHeight / sourceMetrics.trimHeight;

    const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): number =>
      Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

    const blocks = this.getPageContentBlocks(pageId);
    for (const blockId of blocks) {
      const frame = this.readBlockFrame(blockId);
      if (!frame) {
        continue;
      }

      const blockStart = frame.x;
      const blockEnd = frame.x + frame.width;
      const backOverlap = overlap(blockStart, blockEnd, sourceBackStart, sourceSpineStart);
      const spineOverlap = overlap(blockStart, blockEnd, sourceSpineStart, sourceFrontStart);
      const frontOverlap = overlap(blockStart, blockEnd, sourceFrontStart, sourceMetrics.pageWidth);

      let sourceZoneStart = sourceBackStart;
      let targetZoneStart = targetBackStart;
      let zoneScaleX = coverScaleX;

      if (spineOverlap >= backOverlap && spineOverlap >= frontOverlap && spineOverlap > 0) {
        sourceZoneStart = sourceSpineStart;
        targetZoneStart = targetSpineStart;
        zoneScaleX = spineScaleX;
      } else if (frontOverlap > backOverlap && frontOverlap > 0) {
        sourceZoneStart = sourceFrontStart;
        targetZoneStart = targetFrontStart;
        zoneScaleX = coverScaleX;
      }

      this.writeBlockFrame(blockId, {
        x: targetZoneStart + (frame.x - sourceZoneStart) * zoneScaleX,
        y: frame.y * scaleY,
        width: frame.width * zoneScaleX,
        height: frame.height * scaleY
      });
    }
  }

  private async resizeLoadedTemplateToTargetDimensions(
    sourceMetrics: TemplateLayoutMetrics,
    targetMetrics: TemplateLayoutMetrics,
    familyHint: string | null | undefined
  ): Promise<boolean> {
    if (!this.cesdk) {
      return false;
    }

    const family = this.normalizeManagedFamily(familyHint);
    const pages = this.getScenePages();
    if (!family || pages.length === 0) {
      return false;
    }

    if (family === 'WRAP_1P') {
      this.resizeWrapOutsidePageContent(pages[0], sourceMetrics, targetMetrics);
      return true;
    }

    if (family === 'WRAP_2P') {
      this.resizeWrapOutsidePageContent(pages[0], sourceMetrics, targetMetrics);
      // Keep the existing second-page artwork intact. The follow-up page resize
      // updates the sheet size without distorting the already designed content.
      return true;
    }

    // FLAT families keep existing global resizeContentAware flow unchanged.
    return false;
  }

  private requiredPageCountForFamily(family: string | null): number {
    if (family === 'WRAP_2P' || family === 'FLAT_2P') {
      return 2;
    }

    if (family === 'FLAT_4P') {
      return 4;
    }

    return 1;
  }

  private async createInitialScene(): Promise<void> {
    const family = this.resolveRequiredBookTemplateFamily();
    const dimensions = this.resolveBookDimensionsForFamily(family);
    await this.createEmptyScene(dimensions.pageWidth, dimensions.pageHeight);
  }

  private areCloseDimensions(left: number, right: number, tolerance = 1): boolean {
    return Math.abs(left - right) <= tolerance;
  }

  private matchesCurrentBookDimensions(asset: AdminTemplate, requiredFamily: string): boolean {
    const templateMetrics = this.readLayoutMetricsFromMetadata(asset.metadataJson);
    if (!templateMetrics) {
      return false;
    }

    if (this.normalizeManagedFamily(templateMetrics.family) !== requiredFamily) {
      return false;
    }

    const targetMetrics = this.buildLayoutMetricsForFamily(requiredFamily);
    const directMatch = this.areCloseDimensions(templateMetrics.trimWidth, targetMetrics.trimWidth)
      && this.areCloseDimensions(templateMetrics.trimHeight, targetMetrics.trimHeight);
    const rotatedMatch = this.areCloseDimensions(templateMetrics.trimWidth, targetMetrics.trimHeight)
      && this.areCloseDimensions(templateMetrics.trimHeight, targetMetrics.trimWidth);
    return directMatch || rotatedMatch;
  }

  private filterAdminAssetsForBookMode(assets: AdminTemplate[], tabId?: string): AdminTemplate[] {
    if (!this.isBookCreationMode()) {
      return assets;
    }

    const family = this.resolveRequiredBookTemplateFamily();
    if (!family) {
      return [];
    }

    return assets.filter((asset) => {
      if (this.normalizeManagedFamily(asset.family) !== family) {
        return false;
      }

      if (tabId === 'published') {
        return this.matchesCurrentBookDimensions(asset, family);
      }

      return true;
    });
  }

  private async handleBookCreationContextChanges(changes: SimpleChanges): Promise<void> {
    const familyChanged = !!changes['bookBindingType'] || !!changes['bookCoverColor'];
    const dimensionsChanged = !!changes['bookWidth'] || !!changes['bookHeight'] || !!changes['bookThickness'];

    if (!familyChanged && !dimensionsChanged) {
      return;
    }

    if (familyChanged) {
      await this.loadLibraryAssets(this.currentLibraryEntry);
      await this.tryApplyInitialTemplateInBookMode();
    }

    if (this.currentTemplate) {
      const requiredFamily = this.resolveRequiredBookTemplateFamily();
      const currentFamily = this.normalizeManagedFamily(this.currentTemplate.family);

      if (!requiredFamily) {
        this.currentTemplate = null;
        this.currentTemplateSource = null;
        this.libraryNotice = 'Template selection cleared. Set Binding Type and Cover Color first.';
        this.templateSelectionCleared.emit();
        const dims = this.resolveBookDimensionsForFamily(null);
        await this.createEmptyScene(dims.pageWidth, dims.pageHeight);
        return;
      }

      if (requiredFamily && currentFamily && requiredFamily !== currentFamily) {
        this.currentTemplate = null;
        this.currentTemplateSource = null;
        this.libraryNotice = 'Template selection cleared because binding/color changed.';
        this.templateSelectionCleared.emit();
        const dims = this.resolveBookDimensionsForFamily(requiredFamily);
        await this.createEmptyScene(dims.pageWidth, dims.pageHeight);
        return;
      }

      if (dimensionsChanged || familyChanged) {
        await this.applyBookDimensionsToCurrentScene(this.currentTemplate.family);
        await this.fitDocument();
      }
      return;
    }

    const dims = this.resolveBookDimensionsForFamily(this.resolveRequiredBookTemplateFamily());
    await this.createEmptyScene(dims.pageWidth, dims.pageHeight);
  }

  private async applyBookDimensionsToCurrentScene(
    familyHint?: string,
    options?: { resizeContentAware?: boolean }
  ): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    const normalizedFamily = this.normalizeManagedFamily(familyHint ?? this.currentTemplate?.family) ?? this.resolveRequiredBookTemplateFamily();
    const dimensions = this.resolveBookDimensionsForFamily(normalizedFamily);
    const requiredPageCount = this.requiredPageCountForFamily(normalizedFamily);
    const shouldResizeContentAware = options?.resizeContentAware ?? true;

    const scene = this.cesdk.engine.scene.get();
    if (!scene || !this.cesdk.engine.block.isValid(scene)) {
      await this.createEmptyScene(dimensions.pageWidth, dimensions.pageHeight);
      return;
    }

    const pages = this.getScenePages();
    while (pages.length < requiredPageCount) {
      const page = this.cesdk.engine.block.create('page');
      this.cesdk.engine.block.setWidth(page, dimensions.pageWidth);
      this.cesdk.engine.block.setHeight(page, dimensions.pageHeight);
      this.cesdk.engine.block.appendChild(scene, page);
      pages.push(page);
    }

    const validPages = pages.filter((page) => this.cesdk!.engine.block.isValid(page));

    if (shouldResizeContentAware) {
      // Existing global strategy (kept): good default fallback when source
      // layout metrics are unavailable.
      try {
        if (validPages.length > 0) {
          this.cesdk.engine.block.resizeContentAware(validPages, dimensions.pageWidth, dimensions.pageHeight);
        }
      } catch {
        for (const page of validPages) {
          this.cesdk.engine.block.setWidth(page, dimensions.pageWidth);
          this.cesdk.engine.block.setHeight(page, dimensions.pageHeight);
        }
      }
    } else {
      for (const page of validPages) {
        this.cesdk.engine.block.setWidth(page, dimensions.pageWidth);
        this.cesdk.engine.block.setHeight(page, dimensions.pageHeight);
      }
    }

    for (let index = 0; index < validPages.length; index += 1) {
      this.cesdk.engine.block.setString(validPages[index], 'name', `Scene ${index + 1}`);
    }

    this.positionPagesInColumn(pages, dimensions.pageHeight);
  }

  private async tryApplyInitialTemplateInBookMode(): Promise<void> {
    if (!this.isBookCreationMode() || this.hasAppliedInitialBookTemplate || typeof this.initialTemplateId !== 'number') {
      return;
    }

    const requiredFamily = this.resolveRequiredBookTemplateFamily();
    if (!requiredFamily) {
      return;
    }

    const findAndApply = async (tabId: 'my-templates' | 'published'): Promise<boolean> => {
      const assets = tabId === 'my-templates'
          ? this.filterAdminAssetsForBookMode(await this.loadMyTemplates())
          : this.filterAdminAssetsForBookMode(await this.loadPublishedTemplates());

      const match = assets.find((asset) => asset.templateId === this.initialTemplateId);
      if (!match) {
        return false;
      }

      this.currentLibraryEntry = tabId;
      this.isLibraryPanelOpen = true;
      this.libraryAssets = assets;
      await this.applyLibraryAsset(match);
      this.hasAppliedInitialBookTemplate = true;
      return true;
    };

    if (await findAndApply('my-templates')) {
      return;
    }

    await findAndApply('published');
  }

  private async applyTemplateSceneToCurrentBookFormat(
    sceneString: string,
    family: string,
    metadataJson?: string
  ): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    const targetMetrics = this.buildLayoutMetricsForFamily(family);
    await this.cesdk.engine.scene.loadFromString(sceneString);
    this.configureCurrentSceneForPrint();

    const normalizedFamily = this.normalizeManagedFamily(family);
    const actualLoadedPage = this.readCurrentFirstPageSize();
    const sourceMetricsFromMetadata = this.readLayoutMetricsFromMetadata(metadataJson);
    const isWrapFamily = normalizedFamily === 'WRAP_1P' || normalizedFamily === 'WRAP_2P';

    if (isWrapFamily && actualLoadedPage && actualLoadedPage.width < targetMetrics.pageWidth * 0.85) {
      const pages = this.getScenePages();
      if (sourceMetricsFromMetadata) {
        if (pages[0]) {
          this.resizeFlatPageContent(
            pages[0],
            actualLoadedPage.width,
            actualLoadedPage.height,
            sourceMetricsFromMetadata.pageWidth,
            sourceMetricsFromMetadata.pageHeight
          );
        }
        if (normalizedFamily === 'WRAP_2P' && pages[1]) {
          this.resizeFlatPageContent(
            pages[1],
            actualLoadedPage.width,
            actualLoadedPage.height,
            sourceMetricsFromMetadata.pageWidth,
            sourceMetricsFromMetadata.pageHeight
          );
        }
      } else {
        if (pages[0]) {
          this.resizeFlatPageContent(
            pages[0],
            actualLoadedPage.width,
            actualLoadedPage.height,
            targetMetrics.pageWidth,
            targetMetrics.pageHeight
          );
        }
        if (normalizedFamily === 'WRAP_2P' && pages[1]) {
          this.resizeFlatPageContent(
            pages[1],
            actualLoadedPage.width,
            actualLoadedPage.height,
            targetMetrics.pageWidth,
            targetMetrics.pageHeight
          );
        }
        await this.applyBookDimensionsToCurrentScene(family, { resizeContentAware: false });
        return;
      }
    }

    const sourceMetricsFromSceneString = isWrapFamily && normalizedFamily
      ? this.deriveWrapSourceMetricsFromSceneString(sceneString, normalizedFamily, targetMetrics)
      : null;
    const sourceMetrics = sourceMetricsFromMetadata
      ?? sourceMetricsFromSceneString
      ?? (isWrapFamily && normalizedFamily
        ? this.deriveWrapSourceMetricsFromLoadedScene(normalizedFamily, targetMetrics)
        : null);

    if (!isWrapFamily || !sourceMetrics) {
      // Keep existing global behavior for FLAT families and fallback for legacy
      // WRAP templates without stored layout metrics.
      await this.applyBookDimensionsToCurrentScene(family);
      return;
    }

    const appliedSemanticWrapResize = await this.resizeLoadedTemplateToTargetDimensions(sourceMetrics, targetMetrics, family);
    if (!appliedSemanticWrapResize) {
      await this.applyBookDimensionsToCurrentScene(family);
      return;
    }

    await this.applyBookDimensionsToCurrentScene(family, { resizeContentAware: false });
  }

  private canOverwriteCurrentTemplateInPlace(): boolean {
    if (!this.currentTemplate?.templateId) {
      return false;
    }

    if (this.currentTemplateSource !== 'myTemplate' && this.currentTemplateSource !== 'published') {
      return false;
    }

    if (this.authService.isAdmin()) {
      return true;
    }

    const userId = this.getCurrentUserId();
    return typeof userId === 'number'
        && typeof this.currentTemplate.creationAuthorId === 'number'
        && this.currentTemplate.creationAuthorId === userId;
  }

  private resetSaveDecisionState(): void {
    this.isProcessingSaveDecision = false;
    this.saveDecisionMode = 'createOnly';
    this.saveDecisionMessage = '';
    this.saveDecisionLinkedBooksCount = 0;
  }

  private closeSaveDecisionDialog(): void {
    if (this.cesdk && this.saveDecisionDialogId) {
      const dialogId = this.saveDecisionDialogId;
      this.saveDecisionDialogId = null;
      try {
        this.cesdk.ui.closeDialog(dialogId);
      } catch {
        // no-op
      }
    }

    this.resetSaveDecisionState();
    this.configureNativeNavigationBar();
    this.cdr.markForCheck();
  }

  private openSaveDecisionDialog(): void {
    if (!this.cesdk) {
      return;
    }

    if (this.saveDecisionDialogId) {
      const previousDialogId = this.saveDecisionDialogId;
      this.saveDecisionDialogId = null;
      try {
        this.cesdk.ui.closeDialog(previousDialogId);
      } catch {
        // no-op
      }
    }

    const dialogId = this.cesdk.ui.showDialog({
      type: 'info',
      size: 'regular',
      clickOutsideToClose: !this.isProcessingSaveDecision,
      content: {
        title: 'Save Template',
        message: this.saveDecisionMessage
      },
      cancel: this.isProcessingSaveDecision
          ? undefined
          : {
            label: 'Cancel',
            onClick: ({ id }) => {
              this.cesdk?.ui.closeDialog(id);
            }
          },
      actions: this.buildSaveDecisionDialogActions(),
      onClose: () => {
        if (this.saveDecisionDialogId === dialogId) {
          this.saveDecisionDialogId = null;
        }
        this.resetSaveDecisionState();
        this.configureNativeNavigationBar();
        this.cdr.markForCheck();
      }
    });

    this.saveDecisionDialogId = dialogId;
  }

  private buildSaveDecisionDialogActions(): Array<{
    label: string;
    variant: 'regular' | 'plain';
    color?: 'accent' | 'danger';
    onClick: (context: { id: string }) => void;
  }> {
    if (this.isProcessingSaveDecision) {
      return [];
    }

    const actions: Array<{
      label: string;
      variant: 'regular' | 'plain';
      color?: 'accent' | 'danger';
      onClick: (context: { id: string }) => void;
    }> = [];

    if (this.saveDecisionMode === 'choice') {
      actions.push({
        label: 'Save changes',
        variant: 'regular',
        color: 'accent',
        onClick: () => {
          if (this.isProcessingSaveDecision) {
            return;
          }
          void this.confirmSaveChangesFromDialog();
        }
      });
    }

    actions.push({
      label: 'Create new template',
      variant: 'regular',
      color: 'accent',
      onClick: () => {
        if (this.isProcessingSaveDecision) {
          return;
        }
        void this.confirmCreateNewTemplateFromDialog();
      }
    });

    return actions;
  }

  private setSaveDecisionDialogLoading(message: string): void {
    if (!this.cesdk || !this.saveDecisionDialogId) {
      return;
    }

    this.cesdk.ui.updateDialog(this.saveDecisionDialogId, {
      type: 'loading',
      clickOutsideToClose: false,
      cancel: undefined,
      actions: [],
      content: {
        title: 'Save Template',
        message
      }
    });
  }

  private async handleSaveTemplateRequested(): Promise<void> {
    if (this.isBookCreationMode()) {
      await this.saveCurrentAsMyTemplate();
      return;
    }

    if (!this.cesdk || !this.currentTemplate) {
      this.libraryError = 'No template loaded. Please select a template first.';
      return;
    }

    if (!this.currentTemplate.templateId) {
      await this.saveCurrentAsMyTemplate();
      return;
    }

    this.isCheckingTemplateUsage = true;
    this.libraryError = '';
    this.configureNativeNavigationBar();

    try {
      const usage = await this.coverTemplatesApi.getTemplateUsage(this.currentTemplate.templateId);
      this.prepareSaveDecisionModal(usage);
      this.openSaveDecisionDialog();
    } catch (error) {
      console.error('Error while checking template usage:', error);
      this.libraryError = 'Unable to check template usage right now.';
    } finally {
      this.isCheckingTemplateUsage = false;
      this.configureNativeNavigationBar();
      this.cdr.markForCheck();
    }
  }

  private prepareSaveDecisionModal(usage: CoverTemplateUsageApiModel): void {
    this.saveDecisionLinkedBooksCount = usage.linkedBooksCount;
    const canOverwrite = this.canOverwriteCurrentTemplateInPlace() && usage.canOverwrite;

    if (usage.linkedToBooks) {
      this.saveDecisionMode = 'linked';
      const linkedCount = usage.linkedBooksCount;
      this.saveDecisionMessage = linkedCount > 1
          ? `This template is linked to ${linkedCount} books. A new template instance will be created to keep existing books unchanged.`
          : 'This template is already linked to a book. A new template instance will be created to keep existing books unchanged.';
      return;
    }

    if (canOverwrite) {
      this.saveDecisionMode = 'choice';
      this.saveDecisionMessage = 'Do you want to save the changes on this template, or create a new template instance?';
      return;
    }

    this.saveDecisionMode = 'createOnly';
    this.saveDecisionMessage = 'You are not allowed to overwrite this template. A new template instance will be created.';
  }

  private async exportCurrentTemplateThumbnailDataUrl(): Promise<string | undefined> {
    if (!this.cesdk) {
      return undefined;
    }

    const page = this.getScenePages()[0];
    if (typeof page !== 'number' || !this.cesdk.engine.block.isValid(page)) {
      return undefined;
    }

    try {
      const blob = await this.cesdk.engine.block.export(page, 'image/png', {
        pngCompressionLevel: 6
      });
      if (!(blob instanceof Blob) || blob.size === 0) {
        return undefined;
      }
      return await this.blobToDataUrl(blob);
    } catch (error) {
      console.warn('Template thumbnail export failed:', error);
      return undefined;
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Unable to convert blob to data URL.'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
      reader.readAsDataURL(blob);
    });
  }

  private async buildCurrentTemplateSavePayload(sceneString: string): Promise<{
    name: string;
    description?: string;
    family: string;
    sourceBlankCode: string;
    sceneString: string;
    thumbnailUrl?: string;
    metadataJson?: string;
  }> {
    if (!this.currentTemplate) {
      throw new Error('No template loaded.');
    }

    const layoutMetrics = this.buildCurrentLayoutMetricsForTemplate(this.currentTemplate.family);
    const metadataJson = this.mergeLayoutMetricsIntoMetadata(this.currentTemplate.metadataJson, layoutMetrics);
    const thumbnailUrl = await this.exportCurrentTemplateThumbnailDataUrl();
    this.currentTemplate.metadataJson = metadataJson;
    if (thumbnailUrl) {
      this.currentTemplate.meta.thumbUri = thumbnailUrl;
    }

    return {
      name: this.currentTemplate.label,
      description: this.currentTemplate.description,
      family: this.currentTemplate.family,
      sourceBlankCode: this.currentTemplate.sourceBlankCode ?? this.currentTemplate.id,
      sceneString,
      thumbnailUrl: thumbnailUrl ?? this.currentTemplate.meta.thumbUri ?? undefined,
      metadataJson
    };
  }

  private async saveCurrentTemplateInPlace(): Promise<AdminTemplate | null> {
    if (!this.cesdk || !this.currentTemplate?.templateId) {
      this.libraryError = 'No template selected for in-place save.';
      return null;
    }

    try {
      const sceneString = await this.cesdk.engine.scene.saveToString();
      const payload = await this.buildCurrentTemplateSavePayload(sceneString);
      const saved = await this.coverTemplatesApi.saveChanges(this.currentTemplate.templateId, payload);

      this.currentTemplate = this.fromApiTemplate(saved);
      this.currentTemplateSource = saved.status === 'PUBLISHED' ? 'published' : 'myTemplate';
      this.libraryNotice = 'Template changes saved.';

      if (this.currentLibraryEntry === 'my-templates') {
        this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadMyTemplates());
      } else if (this.currentLibraryEntry === 'published') {
        this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadPublishedTemplates());
      }

      this.cdr.markForCheck();
      return this.currentTemplate;
    } catch (error) {
      console.error('Error while saving template changes:', error);
      const status = typeof error === 'object' && error && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : 0;

      if (status === 409) {
        this.saveDecisionMode = 'linked';
        this.saveDecisionMessage = 'This template became linked to existing books. Please create a new template instance.';
        this.openSaveDecisionDialog();
        this.libraryError = 'Template is linked to books and cannot be overwritten.';
      } else {
        this.libraryError = 'Unable to save changes on the current template.';
      }
      return null;
    }
  }

  async confirmCreateNewTemplateFromDialog(): Promise<void> {
    this.isProcessingSaveDecision = true;
    this.libraryError = '';
    this.cdr.markForCheck();
    this.configureNativeNavigationBar();
    this.setSaveDecisionDialogLoading('Creating a new template...');

    let result: AdminTemplate | null = null;
    try {
      result = await this.saveCurrentAsMyTemplate();
      if (result) {
        this.closeSaveDecisionDialog();
      }
    } finally {
      this.isProcessingSaveDecision = false;
      this.configureNativeNavigationBar();
      if (!result && this.saveDecisionDialogId) {
        this.openSaveDecisionDialog();
      }
      this.cdr.markForCheck();
    }
  }

  async confirmSaveChangesFromDialog(): Promise<void> {
    this.isProcessingSaveDecision = true;
    this.libraryError = '';
    this.cdr.markForCheck();
    this.configureNativeNavigationBar();
    this.setSaveDecisionDialogLoading('Saving changes on this template...');

    let result: AdminTemplate | null = null;
    try {
      result = await this.saveCurrentTemplateInPlace();
      if (result) {
        this.closeSaveDecisionDialog();
      }
    } finally {
      this.isProcessingSaveDecision = false;
      this.configureNativeNavigationBar();
      if (!result && this.saveDecisionDialogId) {
        this.openSaveDecisionDialog();
      }
      this.cdr.markForCheck();
    }
  }

  getActiveTab(tabId = this.currentLibraryEntry): LibraryTab {
    return this.libraryTabs.find((tab) => tab.id === tabId) ?? this.libraryTabs[0];
  }

  async selectLibraryTab(tabId: string): Promise<void> {
    if (tabId === this.currentLibraryEntry) {
      if (this.isLibraryPanelOpen) {
        this.isLibraryPanelOpen = false;
        return;
      }

      this.isLibraryPanelOpen = true;

      if (this.libraryAssets.length > 0) {
        return;
      }
    } else {
      this.currentLibraryEntry = tabId;
      this.isLibraryPanelOpen = true;
      await this.loadLibraryAssets(tabId);
      return;
    }

    await this.loadLibraryAssets(tabId);
  }

  closeLibraryPanel(): void {
    this.isLibraryPanelOpen = false;
  }

  isTabActive(tabId: string): boolean {
    return this.isLibraryPanelOpen && this.currentLibraryEntry === tabId;
  }

  async loadLibraryAssets(tabId: string): Promise<void> {
    const tab = this.getActiveTab(tabId);
    this.isLibraryLoading = true;
    this.libraryError = '';
    this.libraryNotice = '';
    this.libraryAssets = [];

    try {
      if (tab.category === 'admin') {
        if (this.isBookCreationMode() && !this.resolveRequiredBookTemplateFamily()) {
          this.libraryAssets = [];
          this.libraryNotice = 'Select Binding Type and Cover Color to load compatible templates.';
          return;
        }

        if (tab.id === 'system-blanks') {
          this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadSystemBlanks(), tab.id);
        } else if (tab.id === 'my-templates') {
          this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadMyTemplates(), tab.id);
        } else {
          this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadPublishedTemplates(), tab.id);
        }

        if (this.isBookCreationMode() && this.libraryAssets.length === 0) {
          const family = this.resolveRequiredBookTemplateFamily();
          this.libraryNotice = family
              ? (tab.id === 'published'
                ? `No published templates match ${family} with the current book dimensions.`
                : `No compatible templates found for ${family}.`)
              : this.libraryNotice;
        }
      } else if (tab.sourceId && this.cesdk) {
        const result = await this.cesdk.engine.asset.findAssets(tab.sourceId, {
          page: 0,
          perPage: 24,
          locale: 'en'
        });

        this.libraryAssets = (result.assets ?? []).map((asset) =>
            this.normalizeCesdkAsset(asset, tab.sourceId as string)
        );
      }
    } catch (error) {
      console.error(`❌ Erreur chargement ${tab.title}:`, error);
      this.libraryError = `Unable to load ${tab.title.toLowerCase()}.`;
    } finally {
      this.isLibraryLoading = false;
    }
  }

  private async loadSystemBlanks(): Promise<AdminTemplate[]> {
    if (this.blankAssetsCache) {
      return this.blankAssetsCache;
    }

    if (!this.blankAssetsPromise) {
      this.blankAssetsPromise = (async () => {
        try {
          const response = await fetch(this.systemBlanksPath, { cache: 'force-cache' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = asRecord(await response.json());
          const normalized = await normalizeBlankAssets(data['assets']);
          this.blankAssetsCache = normalized.length > 0 ? normalized : createFallbackBlanks();
          return this.blankAssetsCache;
        } catch (error) {
          console.warn('⚠️ Impossible de charger les system blanks, fallback local utilisé.', error);
          this.blankAssetsCache = createFallbackBlanks();
          return this.blankAssetsCache;
        }
      })();
    }

    return this.blankAssetsPromise;
  }

  private async loadMyTemplates(): Promise<AdminTemplate[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Authenticated user is required to load my templates.');
    }

    const templates = await this.coverTemplatesApi.getMyTemplates(userId);
    return templates.map((template) => this.fromApiTemplate(template));
  }

  private async loadPublishedTemplates(): Promise<AdminTemplate[]> {
    const templates = await this.coverTemplatesApi.getPublished();
    return templates.map((template) => this.fromApiTemplate(template));
  }

  private fromApiTemplate(template: CoverTemplateApiModel): AdminTemplate {
    const family = hasText(template.family) ? template.family : 'CUSTOM';
    const sourceBlankCode = hasText(template.sourceBlankCode) ? template.sourceBlankCode : `template-${template.templateId}`;
    const mappedStatus = template.status === 'PUBLISHED'
        ? 'PUBLISHED'
        : (template.status === 'MY_TEMPLATE' ? 'MY_TEMPLATE' : 'DRAFT');

    return {
      id: `template-${template.templateId}`,
      templateId: template.templateId,
      sourceBlankCode,
      label: hasText(template.name) ? template.name : sourceBlankCode,
      description: template.description ?? '',
      family,
      type: this.inferTemplateType(family),
      pages: this.inferTemplatePages(family),
      status: mappedStatus,
      sceneString: template.sceneString,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      metadataJson: template.metadataJson ?? undefined,
      creationAuthorId: template.creationAuthorId ?? null,
      meta: {
        uri: '',
        thumbUri: template.thumbnailUrl ?? '',
        width: DEFAULT_BLANK_WIDTH,
        height: DEFAULT_BLANK_HEIGHT
      }
    };
  }

  private inferTemplateType(family: string): AdminTemplate['type'] {
    if (family.startsWith('WRAP_')) {
      return 'wrap';
    }
    if (family.startsWith('FLAT_')) {
      return 'flat';
    }
    return 'blank';
  }

  private inferTemplatePages(family: string): number {
    if (family.endsWith('4P')) {
      return 4;
    }
    if (family.endsWith('2P')) {
      return 2;
    }
    return 1;
  }

  private getCurrentUserId(): number | null {
    const userId = this.authService.userId();
    if (typeof userId !== 'number' || !Number.isFinite(userId)) {
      return null;
    }
    return userId;
  }

  private normalizeCesdkAsset(asset: unknown, sourceId: string): CesdkLibraryAsset {
    const source = asRecord(asset);
    const meta = asRecord(source['meta']);
    const id = hasText(source['id']) ? source['id'].trim() : `${sourceId}-${Date.now()}`;

    return {
      id,
      label: resolveLabel(source['label'], id),
      description: resolveDescription(source['label']),
      family: sourceId,
      meta: {
        uri: hasText(meta['uri']) ? meta['uri'].trim() : '',
        thumbUri: hasText(meta['thumbUri']) ? meta['thumbUri'].trim() : '',
        width: toPositiveNumber(meta['width'], DEFAULT_BLANK_WIDTH),
        height: toPositiveNumber(meta['height'], DEFAULT_BLANK_HEIGHT)
      },
      sourceId,
      rawAsset: asset
    };
  }

  async applyLibraryAsset(asset: LibraryAsset): Promise<void> {
    const tab = this.getActiveTab();
    this.libraryError = '';
    this.libraryNotice = '';

    try {
      if (tab.category === 'admin') {
        await this.applyAdminAsset(asset as AdminTemplate, tab.id);
      } else {
        await this.applyCesdkAsset(asset as CesdkLibraryAsset);
      }
      this.schedulePreviewTextureRefresh();
    } catch (error) {
      console.error('❌ Erreur application asset:', error);
      this.libraryError = `Unable to apply ${(asset.label ?? asset.id).toString()}.`;
    }
  }

  private async applyAdminAsset(asset: AdminTemplate, tabId: string): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    if (this.isBookCreationMode()) {
      const requiredFamily = this.resolveRequiredBookTemplateFamily();
      const assetFamily = this.normalizeManagedFamily(asset.family);
      if (requiredFamily && assetFamily && requiredFamily !== assetFamily) {
        this.libraryError = `Only ${requiredFamily} templates are allowed for this book configuration.`;
        return;
      }
    }

    if (tabId === 'my-templates' || tabId === 'published') {
      if (hasText(asset.sceneString)) {
        this.currentTemplateSource = tabId === 'published' ? 'published' : 'myTemplate';
        if (this.isBookCreationMode()) {
          await this.applyTemplateSceneToCurrentBookFormat(asset.sceneString, asset.family, asset.metadataJson);
        } else {
          await this.cesdk.engine.scene.loadFromString(asset.sceneString);
        }
        this.currentTemplate = { ...asset };
        if (tabId === 'published') {
          this.applyPublishedTemplateRules();
        } else {
          this.applyFullEditingRules();
        }
        if (this.isBookCreationMode()) {
          await this.fitDocument();
        } else {
          await this.fitCurrentPage();
        }
      }
      return;
    }

    this.currentTemplateSource = 'system';
    this.currentTemplate = { ...asset };

    if (this.isGeneratedBlank(asset)) {
      await this.generateManagedBlankScene(asset);
      this.applyFullEditingRules();
      if (this.isBookCreationMode()) {
        await this.applyBookDimensionsToCurrentScene(asset.family);
      }
      return;
    }

    if (hasText(asset.meta.uri)) {
      await this.loadBlankSceneAsString(asset);
      this.applyFullEditingRules();
      if (this.isBookCreationMode()) {
        await this.applyBookDimensionsToCurrentScene(asset.family);
        await this.fitDocument();
      }
      return;
    }

    if (this.isBookCreationMode()) {
      const dimensions = this.resolveBookDimensionsForFamily(this.resolveRequiredBookTemplateFamily() ?? asset.family);
      await this.createEmptyScene(dimensions.pageWidth, dimensions.pageHeight);
    } else {
      await this.createEmptyScene(asset.meta.width, asset.meta.height);
    }
    this.applyFullEditingRules();
  }

  private isGeneratedBlank(asset: AdminTemplate): boolean {
    return ['WRAP_1P', 'WRAP_2P', 'FLAT_2P', 'FLAT_4P'].includes(asset.family);
  }

  private async applyCesdkAsset(asset: CesdkLibraryAsset): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    if (asset.sourceId === 'ly.img.template' && hasText(asset.meta.uri)) {
      this.currentTemplateSource = 'cesdk';
      await this.cesdk.engine.scene.loadFromURL(asset.meta.uri);
      this.applyFullEditingRules();
      await this.fitCurrentPage();
      return;
    }

    const blockId = await this.cesdk.engine.asset.apply(asset.sourceId, asset.rawAsset as never);
    if (blockId && this.cesdk.engine.block.isValid(blockId)) {
      this.cesdk.engine.block.setSelected(blockId, true);
    }
  }

  private async loadBlankSceneAsString(asset: AdminTemplate): Promise<void> {
    if (!this.cesdk || !hasText(asset.meta.uri)) {
      await this.createEmptyScene(asset.meta.width, asset.meta.height);
      return;
    }

    try {
      const response = await fetch(asset.meta.uri, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const sceneText = await response.text();
      if (this.isCesdkSceneString(sceneText)) {
        if (this.isBookCreationMode()) {
          await this.applyTemplateSceneToCurrentBookFormat(sceneText, asset.family, asset.metadataJson);
          await this.fitDocument();
        } else {
          await this.cesdk.engine.scene.loadFromString(sceneText);
          await this.fitCurrentPage();
        }
        return;
      }

      await this.loadCustomSceneDefinition(sceneText, asset);
    } catch (error) {
      console.error(`❌ Erreur chargement du fichier ${asset.meta.uri}:`, error);
      await this.createEmptyScene(asset.meta.width, asset.meta.height);
    }
  }

  private async loadCustomSceneDefinition(sceneText: string, asset: AdminTemplate): Promise<void> {
    let parsedScene: CustomSceneDefinition | null = null;

    try {
      parsedScene = JSON.parse(sceneText) as CustomSceneDefinition;
    } catch {
      await this.createEmptyScene(asset.meta.width, asset.meta.height);
      return;
    }

    const firstPage = Array.isArray(parsedScene.pages) ? parsedScene.pages[0] : undefined;
    if (this.isBookCreationMode()) {
      const dimensions = this.resolveBookDimensionsForFamily(this.normalizeManagedFamily(asset.family));
      await this.createEmptyScene(dimensions.pageWidth, dimensions.pageHeight);
    } else {
      const width = toPositiveNumber(firstPage?.width, asset.meta.width);
      const height = toPositiveNumber(firstPage?.height, asset.meta.height);
      await this.createEmptyScene(width, height);
    }

    if (!this.cesdk || !firstPage || !Array.isArray(firstPage.blocks)) {
      return;
    }

    // Reconstitue au moins les placeholders textuels utiles du blank custom.
    for (const block of firstPage.blocks) {
      if (block.type !== 'text' || !hasText(block.text)) {
        continue;
      }

      try {
        const textBlock = this.cesdk.engine.block.create('text');
        this.cesdk.engine.block.setString(textBlock, 'text/text', block.text);
        this.cesdk.engine.block.setWidth(textBlock, toPositiveNumber(block.width, 120));
        this.cesdk.engine.block.setHeight(textBlock, toPositiveNumber(block.height, 24));
        this.cesdk.engine.block.setPositionX(textBlock, typeof block.x === 'number' ? block.x : 0);
        this.cesdk.engine.block.setPositionY(textBlock, typeof block.y === 'number' ? block.y : 0);
        this.cesdk.engine.block.appendChild(this.cesdk.engine.scene.getCurrentPage(), textBlock);
      } catch (error) {
        console.warn('⚠️ Placeholder texte non reconstruit:', error);
      }
    }

    await this.fitCurrentPage();
  }

  private isCesdkSceneString(sceneText: string): boolean {
    try {
      const parsed = JSON.parse(sceneText) as Record<string, unknown>;
      return hasText(parsed['format']);
    } catch {
      return false;
    }
  }

  private async generateManagedBlankScene(asset: AdminTemplate): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    const dimensions = this.isBookCreationMode()
        ? this.resolveBookDimensionsForFamily(this.normalizeManagedFamily(asset.family))
        : {
          trimWidth: toPositiveNumber(asset.meta.width, DEFAULT_BLANK_WIDTH),
          trimHeight: toPositiveNumber(asset.meta.height, DEFAULT_BLANK_HEIGHT),
          thickness: toPositiveNumber(asset.meta.thickness, 20),
          pageWidth: 0,
          pageHeight: 0
        };

    const trimWidth = dimensions.trimWidth;
    const trimHeight = dimensions.trimHeight;
    const thickness = dimensions.thickness;
    const wrapSpreadWidth = trimWidth * 2 + thickness;

    if (asset.family === 'WRAP_1P') {
      const [page] = await this.createDocumentPages(1, wrapSpreadWidth, trimHeight);
      this.addWrapSpread(page, trimWidth, trimHeight, thickness, 'Scene 1');
      await this.fitDocument();
      return;
    }

    if (asset.family === 'WRAP_2P') {
      const pages = await this.createDocumentPages(2, wrapSpreadWidth, trimHeight);
      this.addWrapSpread(pages[0], trimWidth, trimHeight, thickness, 'Scene 1');
      this.addWrapSpread(pages[1], trimWidth, trimHeight, thickness, 'Scene 2');
      await this.fitDocument();
      return;
    }

    if (asset.family === 'FLAT_2P') {
      const pages = await this.createDocumentPages(2, trimWidth, trimHeight);
      this.addPortraitPage(pages[0], trimWidth, trimHeight, 'Scene 1');
      this.addPortraitPage(pages[1], trimWidth, trimHeight, 'Scene 2');
      await this.fitDocument();
      return;
    }

    if (asset.family === 'FLAT_4P') {
      const pages = await this.createDocumentPages(4, trimWidth, trimHeight);
      this.addPortraitPage(pages[0], trimWidth, trimHeight, 'Scene 1');
      this.addPortraitPage(pages[1], trimWidth, trimHeight, 'Scene 2');
      this.addPortraitPage(pages[2], trimWidth, trimHeight, 'Scene 3');
      this.addPortraitPage(pages[3], trimWidth, trimHeight, 'Scene 4');
      await this.fitDocument();
      return;
    }

    await this.createEmptyScene(trimWidth, trimHeight);
  }

  private async createDocumentPages(count: number, width: number, height: number): Promise<number[]> {
    if (!this.cesdk) {
      return [];
    }

    await this.createEmptyScene(width, height, 'Free');

    const scene = this.cesdk.engine.scene.get();
    if (!scene || !this.cesdk.engine.block.isValid(scene)) {
      throw new Error('No valid scene available in CE.SDK.');
    }

    const pages = this.getScenePages();

    if (pages[0]) {
      this.cesdk.engine.block.setString(pages[0], 'name', 'Scene 1');
    } else {
      throw new Error('No initial page available in CE.SDK.');
    }

    while (pages.length < count) {
      const page = this.cesdk.engine.block.create('page');
      this.cesdk.engine.block.setWidth(page, width);
      this.cesdk.engine.block.setHeight(page, height);
      this.cesdk.engine.block.setString(page, 'name', `Scene ${pages.length + 1}`);
      this.cesdk.engine.block.appendChild(scene, page);
      pages.push(page);
    }

    this.positionPagesInColumn(pages, height);

    return pages;
  }

  private positionPagesInColumn(pages: number[], pageHeight: number): void {
    if (!this.cesdk) {
      return;
    }

    const gap = Math.max(Math.round(pageHeight * 0.08), 24);
    pages.forEach((page, index) => {
      this.cesdk!.engine.block.setPositionX(page, 0);
      this.cesdk!.engine.block.setPositionY(page, index * (pageHeight + gap));
    });
  }

  private getScenePages(): number[] {
    if (!this.cesdk) {
      return [];
    }

    const pages = this.cesdk.engine.scene.getPages().filter((page) => this.cesdk!.engine.block.isValid(page));
    const currentPage = this.cesdk.engine.scene.getCurrentPage();

    if (currentPage && this.cesdk.engine.block.isValid(currentPage) && !pages.includes(currentPage)) {
      pages.unshift(currentPage);
    }

    return pages;
  }

  private async createEmptyScene(
      width: number,
      height: number,
      layout: 'Free' | 'VerticalStack' = 'Free'
  ): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    this.cesdk.engine.scene.create(layout, {
      page: {
        size: {
          width,
          height
        }
      }
    });
    this.configureCurrentSceneForPrint();

    const page = this.cesdk.engine.scene.getCurrentPage();
    if (!page || !this.cesdk.engine.block.isValid(page)) {
      throw new Error('No valid page available in CE.SDK.');
    }

    this.cesdk.engine.block.setWidth(page, width);
    this.cesdk.engine.block.setHeight(page, height);
    await this.fitCurrentPage();
    this.schedulePreviewTextureRefresh();
  }

  private applyPublishedTemplateRules(): void {
    if (!this.cesdk) {
      return;
    }

    const blockApi = this.cesdk.engine.block;
    const allScopes = this.getAllScopes();
    const placeholderIds = new Set<number>();
    const detectedPlaceholders = this.safeFindAllPlaceholders();
    detectedPlaceholders.forEach((blockId) => placeholderIds.add(blockId));
    const sceneBlocks = this.collectSceneBlocks().filter((blockId) => !this.isSceneOrPageBlock(blockId));
    const editableBlocks = sceneBlocks.filter((blockId) =>
        placeholderIds.has(blockId) || this.isBlockMarkedAsPlaceholder(blockId)
    );

    if (editableBlocks.length === 0) {
      this.applyFullEditingRules();
      this.libraryNotice = 'No placeholder rules found in this published template; full editing enabled.';
      return;
    }

    for (const blockId of sceneBlocks) {
      if (!blockApi.isValid(blockId) || this.isSceneOrPageBlock(blockId)) {
        continue;
      }

      const isEditablePlaceholder = placeholderIds.has(blockId) || this.isBlockMarkedAsPlaceholder(blockId);
      if (isEditablePlaceholder) {
        this.setSelectionEnabled(blockId, true);
        this.setTransformLocked(blockId, true);
        this.setBlockScopes(blockId, allScopes, false);
        this.setBlockScopes(blockId, PLACEHOLDER_EDITABLE_SCOPES, true);
        this.enablePlaceholderVisualControls(blockId);
        continue;
      }

      this.setSelectionEnabled(blockId, false);
      this.setTransformLocked(blockId, true);
      this.setBlockScopes(blockId, allScopes, false);
    }

    this.libraryNotice = 'Published template rules applied (only placeholders are editable).';
  }

  private applyFullEditingRules(): void {
    if (!this.cesdk) {
      return;
    }

    const allScopes = this.getAllScopes();
    for (const blockId of this.collectSceneBlocks()) {
      if (!this.cesdk.engine.block.isValid(blockId) || this.isSceneOrPageBlock(blockId)) {
        continue;
      }

      this.setSelectionEnabled(blockId, true);
      this.setTransformLocked(blockId, false);
      this.setBlockScopes(blockId, allScopes, true);
    }
  }

  private safeFindAllPlaceholders(): number[] {
    if (!this.cesdk) {
      return [];
    }

    try {
      return this.cesdk.engine.block.findAllPlaceholders();
    } catch {
      return [];
    }
  }

  private collectSceneBlocks(): number[] {
    if (!this.cesdk) {
      return [];
    }

    const scene = this.cesdk.engine.scene.get();
    if (!scene || !this.cesdk.engine.block.isValid(scene)) {
      return [];
    }

    return this.collectBlockTree(scene);
  }

  private collectBlockTree(root: number): number[] {
    if (!this.cesdk) {
      return [];
    }

    const blockApi = this.cesdk.engine.block;
    const result: number[] = [];
    const stack: number[] = [root];

    while (stack.length > 0) {
      const current = stack.pop();
      if (typeof current !== 'number' || !blockApi.isValid(current)) {
        continue;
      }

      result.push(current);
      const children = blockApi.getChildren(current);
      for (const child of children) {
        stack.push(child);
      }
    }

    return result;
  }

  private isSceneOrPageBlock(blockId: number): boolean {
    if (!this.cesdk) {
      return false;
    }

    try {
      const type = this.cesdk.engine.block.getType(blockId).toLowerCase();
      return type.includes('/scene') || type.includes('/page') || type.includes('/stack');
    } catch {
      return false;
    }
  }

  private isBlockMarkedAsPlaceholder(blockId: number): boolean {
    if (!this.cesdk) {
      return false;
    }

    const blockApi = this.cesdk.engine.block;

    try {
      if (blockApi.isPlaceholderEnabled(blockId) || blockApi.isPlaceholderBehaviorEnabled(blockId)) {
        return true;
      }
    } catch {
      // noop
    }

    if (this.safeGetBool(blockId, 'placeholder/enabled') || this.safeGetBool(blockId, 'placeholderBehavior/enabled')) {
      return true;
    }

    const blockName = this.safeGetString(blockId, 'name').toLowerCase();
    return blockName.includes('placeholder') || blockName.includes('editable') || blockName.includes('slot');
  }

  private enablePlaceholderVisualControls(blockId: number): void {
    if (!this.cesdk) {
      return;
    }

    const blockApi = this.cesdk.engine.block;
    try {
      if (blockApi.supportsPlaceholderBehavior(blockId)) {
        blockApi.setPlaceholderBehaviorEnabled(blockId, true);
      }
      if (blockApi.supportsPlaceholderControls(blockId)) {
        blockApi.setPlaceholderControlsButtonEnabled(blockId, true);
        blockApi.setPlaceholderControlsOverlayEnabled(blockId, true);
      }
    } catch {
      // noop
    }
  }

  private setBlockScopes(blockId: number, scopes: string[], enabled: boolean): void {
    if (!this.cesdk) {
      return;
    }

    for (const scope of scopes) {
      try {
        this.cesdk.engine.block.setScopeEnabled(blockId, scope as never, enabled);
      } catch {
        // ignore unsupported scopes for specific blocks
      }
    }
  }

  private setSelectionEnabled(blockId: number, enabled: boolean): void {
    if (!this.cesdk) {
      return;
    }

    try {
      this.cesdk.engine.block.setBool(blockId, 'selectionEnabled', enabled);
    } catch {
      // noop
    }
  }

  private setTransformLocked(blockId: number, locked: boolean): void {
    if (!this.cesdk) {
      return;
    }

    try {
      this.cesdk.engine.block.setBool(blockId, 'transformLocked', locked);
    } catch {
      // noop
    }
  }

  private safeGetBool(blockId: number, key: string): boolean {
    if (!this.cesdk) {
      return false;
    }

    try {
      return this.cesdk.engine.block.getBool(blockId, key as never);
    } catch {
      return false;
    }
  }

  private safeGetString(blockId: number, key: string): string {
    if (!this.cesdk) {
      return '';
    }

    try {
      return this.cesdk.engine.block.getString(blockId, key as never);
    } catch {
      return '';
    }
  }

  private getAllScopes(): string[] {
    if (!this.cesdk) {
      return FALLBACK_SCOPES;
    }

    try {
      const scopes = this.cesdk.engine.editor.findAllScopes();
      return Array.isArray(scopes) && scopes.length > 0 ? scopes : FALLBACK_SCOPES;
    } catch {
      return FALLBACK_SCOPES;
    }
  }

  private addWrapSpread(
      page: number,
      trimWidth: number,
      trimHeight: number,
      thickness: number,
      sceneLabel: string
  ): void {
    this.assertValidPage(page, sceneLabel);
    this.addPanel(page, 'Back Cover', 0, 0, trimWidth, trimHeight, { r: 0.96, g: 0.97, b: 1, a: 1 });
    this.addPanel(page, 'Spine', trimWidth, 0, thickness, trimHeight, { r: 0.9, g: 0.93, b: 0.98, a: 1 });
    this.addPanel(page, 'Front Cover', trimWidth + thickness, 0, trimWidth, trimHeight, { r: 0.98, g: 0.95, b: 0.92, a: 1 });
    this.addCaption(page, `${sceneLabel} • spread wrap`, 16, 12, 240);
  }

  private addPortraitPage(
      page: number,
      trimWidth: number,
      trimHeight: number,
      sceneLabel: string
  ): void {
    this.assertValidPage(page, sceneLabel);
    this.addPanel(page, 'Portrait Page', 0, 0, trimWidth, trimHeight, { r: 0.95, g: 0.98, b: 1, a: 1 });
    this.addCaption(page, `${sceneLabel} • portrait`, 16, 12, Math.max(trimWidth - 32, 80));
  }

  private assertValidPage(page: number | undefined, label: string): asserts page is number {
    if (!this.cesdk || typeof page !== 'number' || !this.cesdk.engine.block.isValid(page)) {
      throw new Error(`Blank page "${label}" could not be created in CE.SDK.`);
    }
  }

  private addPanel(
        page: number,
        label: string,
        x: number,
      y: number,
      width: number,
      height: number,
      color: { r: number; g: number; b: number; a: number }
  ): void {
    if (!this.cesdk) {
      return;
    }

    const panel = this.cesdk.engine.block.create('graphic');
    const shape = this.cesdk.engine.block.createShape('rect');
    const fill = this.cesdk.engine.block.createFill('color');

    this.cesdk.engine.block.setString(panel, 'name', `BLANK_PANEL:${label}`);
    this.cesdk.engine.block.setShape(panel, shape);
    this.cesdk.engine.block.setColor(fill, 'fill/color/value', color);
    this.cesdk.engine.block.setFill(panel, fill);
    this.cesdk.engine.block.setWidth(panel, width);
    this.cesdk.engine.block.setHeight(panel, height);
    this.cesdk.engine.block.setPositionX(panel, x);
    this.cesdk.engine.block.setPositionY(panel, y);
    this.cesdk.engine.block.appendChild(page, panel);

    this.addCaption(page, label, x + 16, y + 18, Math.max(width - 32, 40));
  }

  private addCaption(page: number, text: string, x: number, y: number, width: number): void {
    if (!this.cesdk || !hasText(text)) {
      return;
    }

    const caption = this.cesdk.engine.block.create('text');
    this.cesdk.engine.block.setString(caption, 'name', `BLANK_CAPTION:${text}`);
    this.cesdk.engine.block.setString(caption, 'text/text', text);
    this.cesdk.engine.block.setWidth(caption, width);
    this.cesdk.engine.block.setHeight(caption, 28);
    this.cesdk.engine.block.setPositionX(caption, x);
    this.cesdk.engine.block.setPositionY(caption, y);
    this.cesdk.engine.block.appendChild(page, caption);
  }

  private async fitCurrentPage(page: 'current' | number = 'current'): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    try {
      await this.cesdk.actions.run('zoomToPage', {
        page,
        autoFit: true
      });
    } catch {
      // Le zoom n'est pas critique pour le fonctionnement.
    }
  }

  private async fitDocument(): Promise<void> {
    if (!this.cesdk) {
      return;
    }

    const scene = this.cesdk.engine.scene.get();
    if (!scene || !this.cesdk.engine.block.isValid(scene)) {
      await this.fitCurrentPage();
      return;
    }

    try {
      await this.cesdk.actions.run('zoomToBlock', scene, {
        autoFit: true
      });
    } catch {
      await this.fitCurrentPage();
    }
  }

  async saveCurrentAsMyTemplate(): Promise<AdminTemplate | null> {
    if (!this.cesdk || !this.currentTemplate) {
      this.libraryError = 'No template loaded. Please select a blank first.';
      return null;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      this.libraryError = 'Authenticated user required to save a template.';
      return null;
    }

    try {
      const sceneString = await this.cesdk.engine.scene.saveToString();
      const sourceBlankCode = this.currentTemplate.sourceBlankCode ?? this.currentTemplate.id;
      const templateName = this.currentTemplateSource === 'myTemplate'
          ? this.currentTemplate.label
          : `${this.currentTemplate.label} - ${new Date().toLocaleString()}`;
      const payload = await this.buildCurrentTemplateSavePayload(sceneString);

      const saved = await this.coverTemplatesApi.saveMyTemplate(userId, {
        ...payload,
        name: templateName,
      });

      this.currentTemplate = this.fromApiTemplate(saved);
      this.currentTemplateSource = 'myTemplate';
      this.applyFullEditingRules();
      this.libraryNotice = 'Template saved to MyTemplates.';

      if (this.currentLibraryEntry === 'my-templates') {
        this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadMyTemplates());
      }
      this.cdr.markForCheck();
      this.configureNativeNavigationBar();
      return this.currentTemplate;
    } catch (error) {
      console.error('❌ Erreur sauvegarde draft:', error);
      this.libraryError = 'Failed to save template.';
      this.configureNativeNavigationBar();
      return null;
    }
  }

  async publishCurrentTemplate(): Promise<void> {
    if (!this.currentTemplate) {
      this.libraryError = 'No template loaded. Please select a blank first.';
      return;
    }

    if (!this.currentTemplate.templateId) {
      await this.saveCurrentAsMyTemplate();
    }

    if (!this.currentTemplate?.templateId) {
      this.libraryError = 'Draft must be saved before publish.';
      return;
    }

    try {
      const published = await this.coverTemplatesApi.publish(this.currentTemplate.templateId);
      this.currentTemplate = this.fromApiTemplate(published);
    } catch (error) {
      console.error('❌ Erreur publication template:', error);
      this.libraryError = 'Failed to publish template.';
      return;
    }

    if (this.currentLibraryEntry === 'published') {
      this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadPublishedTemplates());
      this.cdr.markForCheck();
    } else if (this.currentLibraryEntry === 'my-templates') {
      this.libraryAssets = this.filterAdminAssetsForBookMode(await this.loadMyTemplates());
      this.cdr.markForCheck();
    }

    this.configureNativeNavigationBar();
  }

  async saveAndAssociateToBook(): Promise<void> {
    if (!this.isBookCreationMode()) {
      return;
    }

    if (!this.cesdk || !this.currentTemplate) {
      this.libraryError = 'No template loaded. Please select a compatible template first.';
      return;
    }

    this.isAssociatingTemplateToBook = true;
    this.libraryError = '';
    this.configureNativeNavigationBar();

    try {
      const savedTemplate = await this.saveCurrentAsMyTemplate();
      if (!savedTemplate?.templateId) {
        this.libraryError = 'Unable to associate template to this book.';
        return;
      }

      const sceneString = await this.cesdk.engine.scene.saveToString();
      this.templateAssociated.emit({
        templateId: savedTemplate.templateId,
        templateName: savedTemplate.label,
        templateFamily: savedTemplate.family,
        sceneString
      });

      this.libraryNotice = `Template "${savedTemplate.label}" saved and associated to the current book.`;
    } catch (error) {
      console.error('Error while associating template to book:', error);
      this.libraryError = 'Failed to save and associate template.';
    } finally {
      this.isAssociatingTemplateToBook = false;
      this.configureNativeNavigationBar();
    }
  }

  canPublishTemplates(): boolean {
    return this.authService.isAdmin();
  }

  async exportCurrentAsPdf(): Promise<void> {
    if (!this.cesdk) {
      this.libraryError = 'Editor is not ready yet.';
      return;
    }

    this.isExportingPdf = true;
    this.libraryError = '';
    this.configureNativeNavigationBar();

    try {
      const scene = this.cesdk.engine.scene.get();
      if (!scene || !this.cesdk.engine.block.isValid(scene)) {
        throw new Error('No valid scene available for PDF export.');
      }

      const pdfBlob = await this.cesdk.engine.block.export(scene, 'application/pdf', {
        exportPdfWithHighCompatibility: true
      });
      if (!(pdfBlob instanceof Blob)) {
        throw new Error('No PDF blob returned by CE.SDK.');
      }

      this.downloadBlob(pdfBlob, `${this.createExportFileName()}.pdf`);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      this.libraryError = 'Failed to export PDF.';
    } finally {
      this.isExportingPdf = false;
      this.cdr.markForCheck();
      this.configureNativeNavigationBar();
    }
  }

  private createExportFileName(): string {
    const baseName = this.currentTemplate?.label || this.currentTemplate?.id || 'template';
    const normalized = baseName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || 'template';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }

  private registerPreviewInteractionListeners(): void {
    if (this.isEditorDestroying || typeof window === 'undefined') {
      return;
    }

    this.clearPreviewInteractionListeners();
    const target = document.getElementById('editor');
    if (!target) {
      return;
    }

    this.previewInteractionTarget = target;
    const scheduleRefresh = () => this.schedulePreviewTextureRefresh();
    const eventTypes = ['pointerup', 'keyup', 'paste', 'drop'];

    for (const type of eventTypes) {
      const listener: EventListener = () => scheduleRefresh();
      this.previewInteractionListeners.push({ type, listener });
      target.addEventListener(type, listener);
    }
  }

  private clearPreviewInteractionListeners(): void {
    if (!this.previewInteractionTarget) {
      this.previewInteractionListeners.length = 0;
      return;
    }

    for (const { type, listener } of this.previewInteractionListeners) {
      this.previewInteractionTarget.removeEventListener(type, listener);
    }
    this.previewInteractionListeners.length = 0;
    this.previewInteractionTarget = null;
  }

  private schedulePreviewTextureRefresh(): void {
    if (this.isEditorDestroying || !this.cesdk || typeof window === 'undefined') {
      return;
    }

    if (this.previewRefreshInFlight) {
      this.previewRefreshQueued = true;
      return;
    }

    void this.refreshPreviewTexturesNow();
  }

  private resolvePreviewTextureFamily(): BookPreviewFamily {
    const managedFamily = this.normalizeManagedFamily(this.currentTemplate?.family);
    if (managedFamily === 'WRAP_1P' || managedFamily === 'WRAP_2P' || managedFamily === 'FLAT_2P' || managedFamily === 'FLAT_4P') {
      return managedFamily;
    }

    const templateFamily = (this.currentTemplate?.family ?? '').trim().toUpperCase();
    if (templateFamily.startsWith('SADDLESTITCH')) {
      return 'SADDLESTITCH';
    }

    return computeFamilyFromBindingTypeAndCoverColor(this.bookBindingType, this.bookCoverColor);
  }

  private requiredPreviewExportPageCount(family: BookPreviewFamily): number {
    if (family === 'WRAP_1P') {
      return 1;
    }
    if (family === 'WRAP_2P' || family === 'FLAT_2P' || family === 'SADDLESTITCH') {
      return 2;
    }
    if (family === 'FLAT_4P') {
      return 4;
    }
    return 1;
  }

  private async refreshPreviewTexturesNow(): Promise<void> {
    if (this.isEditorDestroying || !this.cesdk || this.previewRefreshInFlight) {
      if (this.previewRefreshInFlight) {
        this.previewRefreshQueued = true;
      }
      return;
    }

    this.previewRefreshInFlight = true;
    this.previewRefreshQueued = false;

    try {
      this.syncTemplateDimensionsFromCurrentScene();
      const family = this.resolvePreviewTextureFamily();
      const dims = this.resolveBookDimensionsForFamily(family);
      const pageHandles = this.getScenePages();
      const exportTargets = pageHandles.slice(0, this.requiredPreviewExportPageCount(family));
      const blobs: Blob[] = [];

      for (const handle of exportTargets) {
        if (!this.cesdk.engine.block.isValid(handle)) {
          continue;
        }

        const blob = await this.cesdk.engine.block.export(handle, 'image/png', {
          pngCompressionLevel: 6
        });
        blobs.push(blob);
      }

      if (blobs.length === 0) {
        const scene = this.cesdk.engine.scene.get();
        if (scene && this.cesdk.engine.block.isValid(scene)) {
          const sceneBlob = await this.cesdk.engine.block.export(scene, 'image/png', {
            pngCompressionLevel: 6
          });
          blobs.push(sceneBlob);
        }
      }

      if (blobs.length === 0) {
        return;
      }

      const extraction = await extractSemanticTextureMap({
        family,
        pageBlobs: blobs,
        trimWidth: dims.trimWidth,
        thickness: dims.thickness,
        revision: Date.now()
      });

      this.revokePreviewTextureUrls();
      this.previewObjectUrls = extraction.urlsToRevoke;
      this.previewTextures = extraction.textureMap;
      this.cdr.markForCheck();
    } catch (error) {
      console.warn('Preview texture export failed:', error);
    } finally {
      this.previewRefreshInFlight = false;
      if (!this.isEditorDestroying && this.previewRefreshQueued) {
        this.previewRefreshQueued = false;
        void this.refreshPreviewTexturesNow();
      }
    }
  }

  private syncTemplateDimensionsFromCurrentScene(): void {
    if (this.isBookCreationMode() || !this.currentTemplate) {
      return;
    }

    const metrics = this.buildCurrentLayoutMetricsForTemplate(this.currentTemplate.family);
    const pages = this.getScenePages();
    for (const page of pages) {
      if (!this.cesdk?.engine.block.isValid(page)) {
        continue;
      }
      this.cesdk.engine.block.setWidth(page, metrics.pageWidth);
      this.cesdk.engine.block.setHeight(page, metrics.pageHeight);
    }
    this.positionPagesInColumn(pages, metrics.pageHeight);
    this.relayoutManagedBlankPanels(metrics);
    this.bookWidth = metrics.trimWidth / MILLIMETERS_PER_CENTIMETER;
    this.bookHeight = metrics.trimHeight / MILLIMETERS_PER_CENTIMETER;
    this.bookThickness = metrics.thickness / MILLIMETERS_PER_CENTIMETER;
    this.currentTemplate.metadataJson = this.mergeLayoutMetricsIntoMetadata(this.currentTemplate.metadataJson, metrics);
    this.currentTemplate.meta.width = metrics.pageWidth;
    this.currentTemplate.meta.height = metrics.pageHeight;
    this.cdr.markForCheck();
  }

  private relayoutManagedBlankPanels(metrics: TemplateLayoutMetrics): void {
    if (!this.cesdk) {
      return;
    }

    const family = this.normalizeManagedFamily(this.currentTemplate?.family);
    if (!family) {
      return;
    }

    const pages = this.getScenePages();
    if (family === 'WRAP_1P' || family === 'WRAP_2P') {
      for (const page of pages) {
        this.relayoutWrapPanels(page, metrics);
      }
      return;
    }

    if (family === 'FLAT_2P' || family === 'FLAT_4P') {
      for (const page of pages) {
        this.relayoutFlatPanels(page, metrics);
      }
    }
  }

  private relayoutWrapPanels(pageId: number, metrics: TemplateLayoutMetrics): void {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(pageId)) {
      return;
    }

    const panels = this.getGraphicChildren(pageId);
    const back = this.findNamedPanel(panels, 'Back Cover') ?? panels[0];
    const spine = this.findNamedPanel(panels, 'Spine') ?? panels[1];
    const front = this.findNamedPanel(panels, 'Front Cover') ?? panels[2];

    if (typeof back === 'number') {
      this.writeBlockFrame(back, {
        x: 0,
        y: 0,
        width: metrics.trimWidth,
        height: metrics.trimHeight
      });
    }

    if (typeof spine === 'number') {
      this.writeBlockFrame(spine, {
        x: metrics.trimWidth,
        y: 0,
        width: metrics.thickness,
        height: metrics.trimHeight
      });
    }

    if (typeof front === 'number') {
      this.writeBlockFrame(front, {
        x: metrics.trimWidth + metrics.thickness,
        y: 0,
        width: metrics.trimWidth,
        height: metrics.trimHeight
      });
    }
  }

  private relayoutFlatPanels(pageId: number, metrics: TemplateLayoutMetrics): void {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(pageId)) {
      return;
    }

    const panels = this.getGraphicChildren(pageId);
    const portrait = this.findNamedPanel(panels, 'Portrait Page') ?? panels[0];

    if (typeof portrait === 'number') {
      this.writeBlockFrame(portrait, {
        x: 0,
        y: 0,
        width: metrics.trimWidth,
        height: metrics.trimHeight
      });
    }
  }

  private getGraphicChildren(pageId: number): number[] {
    if (!this.cesdk || !this.cesdk.engine.block.isValid(pageId)) {
      return [];
    }

    return this.cesdk.engine.block
      .getChildren(pageId)
      .filter((blockId) => {
        if (!this.cesdk!.engine.block.isValid(blockId)) {
          return false;
        }

        try {
          return this.cesdk!.engine.block.getType(blockId).toLowerCase().includes('graphic');
        } catch {
          return false;
        }
      })
      .sort((left, right) => {
        const leftFrame = this.readBlockFrame(left);
        const rightFrame = this.readBlockFrame(right);
        return (leftFrame?.x ?? 0) - (rightFrame?.x ?? 0);
      });
  }

  private findNamedPanel(blockIds: number[], label: string): number | undefined {
    if (!this.cesdk) {
      return undefined;
    }

    return blockIds.find((blockId) => {
      try {
        return this.cesdk!.engine.block.getString(blockId, 'name') === `BLANK_PANEL:${label}`;
      } catch {
        return false;
      }
    });
  }

  private revokePreviewTextureUrls(): void {
    for (const url of this.previewObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.previewObjectUrls = [];
  }

  ngOnDestroy(): void {
    this.isEditorDestroying = true;
    this.previewRefreshQueued = false;
    this.clearPreviewInteractionListeners();
    this.revokePreviewTextureUrls();
    this.closeSaveDecisionDialog();
    const cesdkInstance = this.cesdk;
    this.cesdk = null;
    if (!cesdkInstance) {
      return;
    }

    try {
      // CE.SDK dispose already tears down the engine internals.
      // Calling engine.dispose afterwards can trigger null-reference errors.
      cesdkInstance.dispose?.();
    } catch (error) {
      console.warn('CE.SDK dispose warning:', error);
    }
  }
}
