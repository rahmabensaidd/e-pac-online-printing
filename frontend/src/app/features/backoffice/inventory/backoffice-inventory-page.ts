import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BookService, BookRequestDto } from '../../../core/services/book.service';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { Bookstable } from './Components/bookstable/bookstable';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-backoffice-inventory-page',
  imports: [
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
    Bookstable,
    ReactiveFormsModule
  ],
  templateUrl: './backoffice-inventory-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class BackofficeInventoryPageComponent implements OnInit {
  readonly backofficeData = inject(BackofficeDataService);
  readonly bookService = inject(BookService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);
  readonly editingBookId = signal<number | null>(null);
  readonly submitted = signal(false);

  private readonly baseCreationSteps = [
    { id: 'attributes', label: 'Attributes' },
    { id: 'content', label: 'Content' },
    { id: 'pnl', label: 'PNL' },
    { id: 'template', label: 'Templates' },
  ] as const;

  readonly currentStep = signal(0);

  bookForm: FormGroup;

  readonly bookColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'authors', label: 'Authors', sortable: true, secondaryKey: 'description' },
    { key: 'quantity', label: 'Stock', type: 'numeric', sortable: true, align: 'right' },
    { key: 'salePrice', label: 'Price', type: 'currency', sortable: true, align: 'right' },
    { key: 'bindingType', label: 'Binding', sortable: true },
    { key: 'stock_status', label: 'Status', type: 'status', sortable: true },
  ];

  readonly bookActions: readonly BackofficeDataTableAction[] = [
    { id: 'restock', label: 'Mark incoming replenishment', icon: 'fa-truck-ramp-box' },
    { id: 'edit', label: 'Edit book', icon: 'fa-pen', tone: 'default' },
    { id: 'delete', label: 'Delete book', icon: 'fa-trash', tone: 'danger' },
  ];

  readonly inventoryColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'sku', label: 'SKU', sortable: true, monospace: true },
    { key: 'name', label: 'Material', sortable: true, secondaryKey: 'category' },
    { key: 'stock', label: 'In stock', type: 'numeric', sortable: true, align: 'right' },
    { key: 'coverageDays', label: 'Coverage', type: 'numeric', sortable: true, align: 'right' },
    { key: 'incomingUnits', label: 'Incoming', type: 'numeric', sortable: true, align: 'right' },
    { key: 'status', label: 'Status', type: 'status', sortable: true },
  ];

  readonly inventoryActions: readonly BackofficeDataTableAction[] = [
    { id: 'restock', label: 'Mark incoming replenishment', icon: 'fa-truck-ramp-box' },
  ];

  readonly lowStockBooks = computed(() => this.bookService.lowStockBooks());
  readonly totalBooksValue = computed(() => this.bookService.totalBooksValue());
  readonly averageBookStock = computed(() => this.bookService.averageStock());
  readonly bookRows = computed(() => this.bookService.bookRows());

  readonly lowStockProducts = computed(() =>
      this.backofficeData.inventory().filter((product) => product.status !== 'Healthy'),
  );

  readonly inventoryRows = computed(() =>
      this.backofficeData.inventory().map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        coverageDays: product.coverageDays,
        incomingUnits: product.incomingUnits,
        status: product.status,
      })),
  );

  readonly incomingUnitsTotal = computed(() =>
      this.backofficeData.inventory().reduce((total, product) => total + product.incomingUnits, 0),
  );

  readonly warehouseCoverage = computed(() => {
    const totalCoverage = this.backofficeData.inventory().reduce(
        (total, product) => total + product.coverageDays,
        0,
    );
    return Math.round(totalCoverage / this.backofficeData.inventory().length);
  });

  constructor() {
    this.bookForm = this.initBookForm();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'new') {
        this.openCreateDrawer(false);
      } else if (params['mode'] === 'edit' && params['bookId']) {
        this.openEditDrawer(Number(params['bookId']), false);
      }
    });
  }

  private initBookForm(): FormGroup {
    return this.fb.group({
      // STEP 1 : BOOK
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      authors: ['', [Validators.required]],
      bindingType: ['', [Validators.required]],

      quantity: [0, [Validators.required, Validators.min(0)]],
      salePrice: [0, [Validators.required, Validators.min(0)]],

      productionPage: [1, [Validators.required, Validators.min(1)]],
      height: [0, [Validators.required, Validators.min(0.1)]],
      width: [0, [Validators.required, Validators.min(0.1)]],
      thickness: [0, [Validators.required, Validators.min(0.1)]],

      textPaperType: ['NONE', [Validators.required]],
      textColor: ['FOUR_FOUR', [Validators.required]],
      coverPaperType: ['NONE', [Validators.required]],
      coverFinishType: ['MATT', [Validators.required]],
      coverColor: ['FOUR_ZERO', [Validators.required]],
      coverSize: ['XXL', [Validators.required]],

      priorityLevel: ['NORMAL', [Validators.required]],
      headAndTail: ['NONE', [Validators.required]],

      securityLabel: [false],
      hasCoil: [false],
      hasInsert: [false],
      hasTab: [false],
      hasBackcover: [false],
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

      // STEP 2 : COVER
      cover: this.fb.group({
        mode: ['manual'], // manual | pdf
        title: [''],
        barcodeId: [''],
        images: this.fb.array([]),
        texts: this.fb.array([]),
        pdfFileName: [''],
        pdfFileType: ['application/pdf'],
        pdfFilePath: [''],
        coverTemplateId: [null],
      }),

      // STEP 2 : CONTENT
      content: this.fb.group({
        mode: ['text'], // text | pdf
        textContent: [''],
        fileName: [''],
        fileType: ['application/pdf'],
        filePath: [''],
        textTemplateId: [null],
      }),

      // STEP 3 : PNL
      pnl: this.fb.group({
        pnlPageNumber: [1, [Validators.min(1)]],
        pnlPrintingNumber: [1, [Validators.min(1)]],
        pnlHorizontalMargin: [0],
        pnlVerticalMargin: [0],
        pnlLineSpacing: [0],
        pnlFontType: ['Arial'],
        pnlFontSize: [12, [Validators.min(1)]],
        pnlExcluded: [false],
        lines: this.fb.array([])
      }),

      // STEP 4 : TEMPLATE UI
      template: this.fb.group({
        action: ['select'] // select | edit
      })
    });
  }

  get coverGroup(): FormGroup {
    return this.bookForm.get('cover') as FormGroup;
  }

  get contentGroup(): FormGroup {
    return this.bookForm.get('content') as FormGroup;
  }

  get pnlGroup(): FormGroup {
    return this.bookForm.get('pnl') as FormGroup;
  }

  get templateGroup(): FormGroup {
    return this.bookForm.get('template') as FormGroup;
  }

  get visibleCreationSteps(): ReadonlyArray<{ id: string; label: string }> {
    return this.baseCreationSteps.filter((step) => {
      if (step.id === 'pnl') {
        return this.shouldShowPnlTab();
      }

      if (step.id === 'template') {
        return this.shouldShowTemplateTab();
      }

      return true;
    });
  }

  get totalVisibleSteps(): number {
    return this.visibleCreationSteps.length;
  }

  get coverImages(): FormArray<FormControl<string | null>> {
    return this.coverGroup.get('images') as FormArray<FormControl<string | null>>;
  }

  get coverTexts(): FormArray<FormControl<string | null>> {
    return this.coverGroup.get('texts') as FormArray<FormControl<string | null>>;
  }

  get pnlLines(): FormArray<FormGroup> {
    return this.pnlGroup.get('lines') as FormArray<FormGroup>;
  }

  showError(controlName: string): boolean {
    const control = this.bookForm.get(controlName);
    return control ? (control.invalid && (control.dirty || control.touched || this.submitted())) : false;
  }

  nextStep(): void {
    this.ensureCurrentStepInBounds();
    if (this.currentStep() < this.totalVisibleSteps - 1) {
      this.currentStep.update(step => step + 1);
    }
  }

  prevStep(): void {
    this.ensureCurrentStepInBounds();
    if (this.currentStep() > 0) {
      this.currentStep.update(step => step - 1);
    }
  }

  goToStep(index: number): void {
    this.currentStep.set(Math.max(0, Math.min(index, this.totalVisibleSteps - 1)));
  }

  isCurrentStep(stepId: string): boolean {
    return this.visibleCreationSteps[this.currentStep()]?.id === stepId;
  }

  addCoverImage(value: string = ''): void {
    this.coverImages.push(this.fb.control(value));
  }

  removeCoverImage(index: number): void {
    this.coverImages.removeAt(index);
  }

  addCoverText(value: string = ''): void {
    this.coverTexts.push(this.fb.control(value));
  }

  removeCoverText(index: number): void {
    this.coverTexts.removeAt(index);
  }

  createPnlLineGroup(data?: any): FormGroup {
    return this.fb.group({
      lineId: [data?.lineId ?? null],
      ordering: [data?.ordering ?? this.pnlLines.length + 1],
      value: [data?.value ?? ''],
      pnlFontType: [data?.pnlFontType ?? 'Arial'],
      pnlFontSize: [data?.pnlFontSize ?? 12],
      pnlFontBold: [data?.pnlFontBold ?? false],
      pnlFontItalic: [data?.pnlFontItalic ?? false],
    });
  }

  addPnlLine(): void {
    this.pnlLines.push(this.createPnlLineGroup());
  }

  removePnlLine(index: number): void {
    this.pnlLines.removeAt(index);
    this.pnlLines.controls.forEach((ctrl, i) => {
      ctrl.get('ordering')?.setValue(i + 1);
    });
  }

  private clearFormArray(formArray: FormArray): void {
    while (formArray.length > 0) {
      formArray.removeAt(0);
    }
  }

  onCoverModeChange(mode: 'manual' | 'pdf'): void {
    this.coverGroup.get('mode')?.setValue(mode);

    if (mode === 'pdf') {
      this.coverGroup.patchValue({
        title: '',
      });
      this.clearFormArray(this.coverImages);
      this.clearFormArray(this.coverTexts);
    } else {
      this.coverGroup.patchValue({
        pdfFileName: '',
        pdfFileType: 'application/pdf',
        pdfFilePath: '',
      });
    }
  }

  onContentModeChange(mode: 'text' | 'pdf'): void {
    this.contentGroup.get('mode')?.setValue(mode);

    if (mode === 'pdf') {
      this.contentGroup.patchValue({
        textContent: '',
      });
    } else {
      this.contentGroup.patchValue({
        fileName: '',
        fileType: 'application/pdf',
        filePath: '',
      });
    }

    this.ensureCurrentStepInBounds();
  }

  onPnlOptionsChange(): void {
    this.ensureCurrentStepInBounds();
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

    this.onContentModeChange('pdf');
    this.contentGroup.patchValue({
      fileName: file.name,
      fileType: file.type || 'application/pdf',
      filePath: file.name,
    });
  }

  openCreateDrawer(syncQuery: boolean = true): void {
    this.bookForm.reset({
      title: '',
      description: '',
      authors: '',
      bindingType: '',

      quantity: 0,
      salePrice: 0,

      productionPage: 1,
      height: 0,
      width: 0,
      thickness: 0,

      textPaperType: 'NONE',
      textColor: 'FOUR_FOUR',
      coverPaperType: 'NONE',
      coverFinishType: 'MATT',
      coverColor: 'FOUR_ZERO',
      coverSize: 'XXL',

      priorityLevel: 'NORMAL',
      headAndTail: 'NONE',

      securityLabel: false,
      hasCoil: false,
      hasInsert: false,
      hasTab: false,
      hasBackcover: false,
      perf: false,
      doubleSidedCover: false,
      shrinkwrap: false,
      threeHoleDrill: false,
      pnlCover: false,
      pnlText: false,

      coilType: '',
      tabColor: '',
      insertPaperType: '',
      caseFinishType: '',
      spineType: '',
      labelType: '',

      cover: {
        mode: 'manual',
        title: '',
        barcodeId: '',
        pdfFileName: '',
        pdfFileType: 'application/pdf',
        pdfFilePath: '',
        coverTemplateId: null,
      },

      content: {
        mode: 'text',
        textContent: '',
        fileName: '',
        fileType: 'application/pdf',
        filePath: '',
        textTemplateId: null,
      },

      pnl: {
        pnlPageNumber: 1,
        pnlPrintingNumber: 1,
        pnlHorizontalMargin: 0,
        pnlVerticalMargin: 0,
        pnlLineSpacing: 0,
        pnlFontType: 'Arial',
        pnlFontSize: 12,
        pnlExcluded: false,
      },

      template: {
        action: 'select'
      }
    });

    this.clearFormArray(this.coverImages);
    this.clearFormArray(this.coverTexts);
    this.clearFormArray(this.pnlLines);

    this.currentStep.set(0);
    this.drawerOpen.set(true);
    this.editingBookId.set(null);
    this.submitted.set(false);

    if (syncQuery) {
      this.updateQuery('new');
    }
  }

  async openEditDrawer(bookId: number, syncQuery: boolean = true): Promise<void> {
    try {
      const book = await this.bookService.getBookById(bookId);
      if (!book) return;

      const bookAny = book as any;

      this.bookForm.patchValue({
        title: bookAny.title ?? '',
        description: bookAny.description ?? '',
        authors: Array.isArray(bookAny.authors) ? bookAny.authors.join(', ') : '',
        bindingType: bookAny.bindingType ?? '',
        quantity: bookAny.quantity ?? 0,
        salePrice: bookAny.salePrice ?? 0,
        productionPage: bookAny.productionPage ?? 1,
        height: bookAny.height ?? 0,
        width: bookAny.width ?? 0,
        thickness: bookAny.thickness ?? 0,
        textPaperType: bookAny.textPaperType ?? 'NONE',
        textColor: bookAny.textColor ?? 'FOUR_FOUR',
        coverPaperType: bookAny.coverPaperType ?? 'NONE',
        coverFinishType: bookAny.coverFinishType ?? 'MATT',
        coverColor: bookAny.coverColor ?? 'FOUR_ZERO',
        coverSize: bookAny.coverSize ?? 'XXL',
        priorityLevel: bookAny.priorityLevel ?? 'NORMAL',
        headAndTail: bookAny.headAndTail ?? 'NONE',
        securityLabel: bookAny.securityLabel ?? false,
        hasCoil: bookAny.hasCoil ?? false,
        hasInsert: bookAny.hasInsert ?? false,
        hasTab: bookAny.hasTab ?? false,
        hasBackcover: bookAny.hasBackcover ?? false,
        perf: bookAny.perf ?? false,
        doubleSidedCover: bookAny.doubleSidedCover ?? false,
        shrinkwrap: bookAny.shrinkwrap ?? false,
        threeHoleDrill: bookAny.threeHoleDrill ?? false,
        pnlCover: bookAny.pnlCover ?? false,
        pnlText: bookAny.pnlText ?? false,
        coilType: bookAny.coilType ?? '',
        tabColor: bookAny.tabColor ?? '',
        insertPaperType: bookAny.insertPaperType ?? '',
        caseFinishType: bookAny.caseFinishType ?? '',
        spineType: bookAny.spineType ?? '',
        labelType: bookAny.labelType ?? '',
      });

      this.clearFormArray(this.coverImages);
      this.clearFormArray(this.coverTexts);
      this.clearFormArray(this.pnlLines);

      const cover = bookAny.cover ?? null;
      if (cover) {
        const hasCoverPdf = !!cover.pdfFilePath;
        this.coverGroup.patchValue({
          mode: hasCoverPdf ? 'pdf' : 'manual',
          title: cover.title ?? '',
          barcodeId: cover.barcodeId ?? '',
          pdfFileName: cover.pdfFileName ?? '',
          pdfFileType: cover.pdfFileType ?? 'application/pdf',
          pdfFilePath: cover.pdfFilePath ?? '',
          coverTemplateId: cover.coverTemplate?.coverTemplateId ?? cover.coverTemplateId ?? null,
        });

        (cover.images ?? []).forEach((img: string) => this.addCoverImage(img));
        (cover.texts ?? []).forEach((txt: string) => this.addCoverText(txt));
      }

      const content = bookAny.content ?? null;
      if (content) {
        const hasContentPdf = !!content.filePath;
        this.contentGroup.patchValue({
          mode: hasContentPdf ? 'pdf' : 'text',
          textContent: content.textContent ?? '',
          fileName: content.fileName ?? '',
          fileType: content.fileType ?? 'application/pdf',
          filePath: content.filePath ?? '',
          textTemplateId: content.textTemplate?.textTemplateId ?? content.textTemplateId ?? null,
        });
      }

      const pnlInformations = Array.isArray(bookAny.pnlInformations) ? bookAny.pnlInformations : [];
      const firstPnlInfo = pnlInformations[0];

      if (firstPnlInfo) {
        this.pnlGroup.patchValue({
          pnlPageNumber: firstPnlInfo.pnlPageNumber ?? 1,
          pnlPrintingNumber: firstPnlInfo.pnlPrintingNumber ?? 1,
          pnlHorizontalMargin: firstPnlInfo.pnlHorizontalMargin ?? 0,
          pnlVerticalMargin: firstPnlInfo.pnlVerticalMargin ?? 0,
          pnlLineSpacing: firstPnlInfo.pnlLineSpacing ?? 0,
          pnlFontType: firstPnlInfo.pnlFontType ?? 'Arial',
          pnlFontSize: firstPnlInfo.pnlFontSize ?? 12,
          pnlExcluded: firstPnlInfo.pnlExcluded ?? false,
        });

        const lines = Array.isArray(firstPnlInfo?.pnlLines)
          ? firstPnlInfo.pnlLines
          : Array.isArray(firstPnlInfo?.lines)
            ? firstPnlInfo.lines
            : [];

        lines.forEach((line: any) => this.pnlLines.push(this.createPnlLineGroup(line)));
      }

      this.templateGroup.patchValue({
        action: 'select'
      });

      this.currentStep.set(0);
      this.drawerOpen.set(true);
      this.editingBookId.set(bookId);
      this.submitted.set(false);

      if (syncQuery) {
        this.updateQuery('edit', bookId.toString());
      }
    } catch (error) {
      console.error('Error loading book for edit:', error);
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (this.bookForm.invalid) {
      Object.keys(this.bookForm.controls).forEach(key => {
        const control = this.bookForm.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors, 'Value:', control.value);
        }
      });
      return;
    }

    const formValue = this.bookForm.getRawValue();
    const shouldIncludePnl = !!formValue.pnlCover || !!formValue.pnlText;
    const shouldIncludeTemplates = this.shouldShowTemplateTab();

    const bookData: BookRequestDto = {
      title: formValue.title,
      description: formValue.description,
      authors: formValue.authors
          .split(',')
          .map((a: string) => a.trim())
          .filter((a: string) => a),
      quantity: formValue.quantity,
      productionPage: formValue.productionPage,
      height: formValue.height,
      thickness: formValue.thickness,
      width: formValue.width,
      securityLabel: formValue.securityLabel,
      hasCoil: formValue.hasCoil,
      hasInsert: formValue.hasInsert,
      hasTab: formValue.hasTab,
      hasBackcover: formValue.hasBackcover,
      perf: formValue.perf,
      doubleSidedCover: formValue.doubleSidedCover,
      shrinkwrap: formValue.shrinkwrap,
      threeHoleDrill: formValue.threeHoleDrill,
      pnlCover: formValue.pnlCover,
      pnlText: formValue.pnlText,
      textPaperType: formValue.textPaperType,
      textColor: formValue.textColor,
      coverFinishType: formValue.coverFinishType,
      coverColor: formValue.coverColor,
      coverSize: formValue.coverSize,
      coverPaperType: formValue.coverPaperType,
      headAndTail: formValue.headAndTail,
      priorityLevel: formValue.priorityLevel,
      bindingType: formValue.bindingType,
      coilType: formValue.coilType || undefined,
      tabColor: formValue.tabColor || undefined,
      insertPaperType: formValue.insertPaperType || undefined,
      caseFinishType: formValue.caseFinishType || undefined,
      spineType: formValue.spineType || undefined,
      labelType: formValue.labelType || undefined,
      salePrice: formValue.salePrice,
      cover: {
        title: formValue.cover.title || undefined,
        images: (formValue.cover.images ?? []).filter((v: string) => !!v?.trim()),
        texts: (formValue.cover.texts ?? []).filter((v: string) => !!v?.trim()),
        pdfFileName: formValue.cover.pdfFileName || undefined,
        pdfFileType: undefined,
        pdfFilePath: undefined,
        coverTemplateId: shouldIncludeTemplates ? (formValue.cover.coverTemplateId ?? undefined) : undefined,
      },
      content: {
        textContent: formValue.content.textContent || undefined,
        fileName: formValue.content.fileName || undefined,
        fileType: undefined,
        filePath: undefined,
        textTemplateId: shouldIncludeTemplates ? (formValue.content.textTemplateId ?? undefined) : undefined,
      },
      pnlInformations: shouldIncludePnl
        ? [
          {
            pnlPageNumber: formValue.pnl.pnlPageNumber ?? 1,
            pnlPrintingNumber: formValue.pnl.pnlPrintingNumber ?? 1,
            pnlHorizontalMargin: formValue.pnl.pnlHorizontalMargin ?? 0,
            pnlVerticalMargin: formValue.pnl.pnlVerticalMargin ?? 0,
            pnlLineSpacing: formValue.pnl.pnlLineSpacing ?? 0,
            pnlFontType: formValue.pnl.pnlFontType || 'Arial',
            pnlFontSize: formValue.pnl.pnlFontSize ?? 12,
            pnlExcluded: !!formValue.pnl.pnlExcluded,
            pnlLines: (formValue.pnl.lines ?? []).map((line: any, index: number) => ({
              ...line,
              ordering: line?.ordering ?? index + 1,
            })),
          },
        ]
        : [],
    };

    console.log('Sending book data:', bookData);

    try {
      if (this.editingBookId()) {
        await this.bookService.updateBook(this.editingBookId()!, bookData);
        console.log('Book updated successfully');
      } else {
        await this.bookService.createBook(bookData);
        console.log('Book created successfully');
      }

      this.bookService.refreshData();
      this.closeDrawer();
    } catch (error) {
      console.error('Error saving book:', error);
    }
  }

  closeDrawer(syncQuery: boolean = true): void {
    this.drawerOpen.set(false);
    this.editingBookId.set(null);
    this.submitted.set(false);
    this.currentStep.set(0);
    this.bookForm.reset();

    if (syncQuery) {
      this.updateQuery(null);
    }
  }

  handleRowAction(event: BackofficeDataTableRowActionEvent): void {
    if (event.actionId === 'restock') {
      this.backofficeData.markInventoryIncoming(event.rowId);
    }
  }

  handleBookRowAction(event: BackofficeDataTableRowActionEvent): void {
    switch (event.actionId) {
      case 'restock':
        this.bookService.markBookIncoming(event.rowId);
        break;
      case 'edit':
        this.openEditDrawer(Number(event.rowId));
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this book?')) {
          this.bookService.deleteBook(Number(event.rowId)).then(() => {
            this.bookService.refreshData();
          });
        }
        break;
    }
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized.includes('reorder')) {
      return 'bg-brand-pink/12 text-brand-pink border-brand-pink/20';
    }

    if (normalized.includes('low')) {
      return 'bg-brand-orange/12 text-brand-orange border-brand-orange/20';
    }

    if (normalized.includes('incoming')) {
      return 'bg-brand-teal/12 text-brand-navy border-brand-teal/20';
    }

    return 'bg-brand-cream text-brand-navy border-slate-200';
  }

  private updateQuery(mode: 'new' | 'edit' | null, bookId?: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mode,
        bookId: mode === 'edit' ? bookId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private ensureCurrentStepInBounds(): void {
    const maxIndex = Math.max(0, this.totalVisibleSteps - 1);
    if (this.currentStep() > maxIndex) {
      this.currentStep.set(maxIndex);
    }
  }

  shouldShowPnlTab(): boolean {
    return !!this.bookForm.get('pnlCover')?.value || !!this.bookForm.get('pnlText')?.value;
  }

  shouldShowTemplateTab(): boolean {
    return this.contentGroup.get('mode')?.value !== 'pdf';
  }

  shouldShowTabColor(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('TAB') : false;
  }

  shouldShowInsertPaperType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('INS') : false;
  }

  shouldShowCoilType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('COIL') : false;
  }

  shouldShowCaseFinishType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    const caseFinishTypes = ['COILHARD', 'COILHARD_TAB', 'COILHARD_INS'];
    return caseFinishTypes.includes(bindingType);
  }
}
