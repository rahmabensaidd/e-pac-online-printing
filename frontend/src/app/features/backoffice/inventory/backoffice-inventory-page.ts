// backoffice-inventory-page.component.ts (version corrigée)
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BookService, BookRequestDto } from '../core/book.service';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import { BackofficeEmptyStateComponent } from '../shared/backoffice-empty-state';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { Bookstable } from "./Components/bookstable/bookstable";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from "@angular/forms";
import { OrderPriority, OrderStatus, PaymentStatus } from "../core/backoffice.models";

@Component({
  selector: 'app-backoffice-inventory-page',
  imports: [
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeEmptyStateComponent,
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

  // Drawer state
  readonly drawerOpen = signal(false);
  readonly editingBookId = signal<number | null>(null);
  readonly submitted = signal(false);

  // Book form
  bookForm: FormGroup;

  // Colonnes pour le tableau des livres
  readonly bookColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'authors', label: 'Authors', sortable: true, secondaryKey: 'description' },
    { key: 'quantity', label: 'Stock', type: 'numeric', sortable: true, align: 'right' },
    { key: 'salePrice', label: 'Price', type: 'currency', sortable: true, align: 'right' },
    { key: 'bindingType', label: 'Binding', sortable: true },
    { key: 'stock_status', label: 'Status', type: 'status', sortable: true },
  ];

  // Actions pour le tableau des livres
  readonly bookActions: readonly BackofficeDataTableAction[] = [
    { id: 'restock', label: 'Mark incoming replenishment', icon: 'fa-truck-ramp-box' },
    { id: 'edit', label: 'Edit book', icon: 'fa-pen', tone: 'default' },
    { id: 'delete', label: 'Delete book', icon: 'fa-trash', tone: 'danger' },
  ];

  // Colonnes pour l'inventaire
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

  // Computed values pour les livres
  readonly lowStockBooks = computed(() => this.bookService.lowStockBooks());
  readonly totalBooksValue = computed(() => this.bookService.totalBooksValue());
  readonly averageBookStock = computed(() => this.bookService.averageStock());
  readonly bookRows = computed(() => this.bookService.bookRows());

  // Computed values pour l'inventaire
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
    // Check query params for opening drawer
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'new') {
        this.openCreateDrawer(false);
      } else if (params['mode'] === 'edit' && params['bookId']) {
        this.openEditDrawer(Number(params['bookId']), false);
      }
    });
  }

  // Dans backoffice-inventory-page.component.ts
  private initBookForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      authors: ['', [Validators.required]],
      bindingType: ['', [Validators.required]],

      // Stock & Pricing
      quantity: [0, [Validators.required, Validators.min(0)]],
      salePrice: [0, [Validators.required, Validators.min(0)]],

      // Physical Specifications
      productionPage: [1, [Validators.required, Validators.min(1)]],
      height: [0, [Validators.required, Validators.min(0)]],
      width: [0, [Validators.required, Validators.min(0)]],
      thickness: [0, [Validators.required, Validators.min(0)]],

      // Print Specifications
      textPaperType: ['NONE', [Validators.required]],
      textColor: ['FOUR_FOUR', [Validators.required]],
      coverPaperType: ['NONE', [Validators.required]],
      coverFinishType: ['MATT', [Validators.required]],
      coverColor: ['FOUR_ZERO', [Validators.required]],
      coverSize: ['XXL', [Validators.required]],

      // Options & Finishing
      priorityLevel: ['NORMAL', [Validators.required]],
      headAndTail: ['NONE', [Validators.required]],

      // Boolean options
      securityLabel: [false],
      hasCoil: [false],
      hasInsert: [false],
      hasTab: [false],
      hasBackcover: [false],
      perf: [false],
      doubleSidedCover: [false],
      shrinkwrap: [false],
      threeHoleDrill: [false],

      // Additional Options
      coilType: [''],
      tabColor: [''],
      insertPaperType: [''],
      caseFinishType: [''],
      spineType: [''],
      labelType: ['']
      // ❌ PAS de siren
    });
  }
  showError(controlName: string): boolean {
    const control = this.bookForm.get(controlName);
    return control ? (control.invalid && (control.dirty || control.touched || this.submitted())) : false;
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
      coilType: '',
      tabColor: '',
      insertPaperType: '',
      caseFinishType: '',
      spineType: '',
      labelType: ''
      // ❌ PAS de siren
    });

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
      if (book) {
        this.bookForm.patchValue({
          title: book.title,
          description: book.description,
          authors: Array.isArray(book.authors) ? book.authors.join(', ') : '',
          bindingType: book.bindingType,
          quantity: book.quantity,
          salePrice: book.salePrice,
          productionPage: book.productionPage,  // ✅ Changé de pageCount
          height: book.height,
          width: book.width,
          thickness: book.thickness,
          textPaperType: book.textPaperType,
          textColor: book.textColor,
          coverPaperType: book.coverPaperType,
          coverFinishType: book.coverFinishType,
          coverColor: book.coverColor,
          coverSize: book.coverSize,
          priorityLevel: book.priorityLevel,
          headAndTail: book.headAndTail,
          securityLabel: book.securityLabel,
          hasCoil: book.hasCoil,
          hasInsert: book.hasInsert,
          hasTab: book.hasTab,
          hasBackcover: book.hasBackcover,
          perf: book.perf,
          doubleSidedCover: book.doubleSidedCover,
          shrinkwrap: book.shrinkwrap,
          threeHoleDrill: book.threeHoleDrill,
          coilType: book.coilType || '',
          tabColor: book.tabColor || '',
          insertPaperType: book.insertPaperType || '',
          caseFinishType: book.caseFinishType || '',
          spineType: book.spineType || '',
          labelType: book.labelType || ''
        });

        this.drawerOpen.set(true);
        this.editingBookId.set(bookId);
        this.submitted.set(false);

        if (syncQuery) {
          this.updateQuery('edit', bookId.toString());
        }
      }
    } catch (error) {
      console.error('Error loading book for edit:', error);
    }
  }
  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (this.bookForm.invalid) {
      console.log('Form is invalid');
      Object.keys(this.bookForm.controls).forEach(key => {
        const control = this.bookForm.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors, 'Value:', control.value);
        }
      });
      return;
    }

    const formValue = this.bookForm.value;

    const bookData: BookRequestDto = {
      title: formValue.title,
      description: formValue.description,
      authors: formValue.authors.split(',').map((a: string) => a.trim()).filter((a: string) => a),
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
      // ❌ PAS de siren
      salePrice: formValue.salePrice
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

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private datePlusDays(days: number): string {
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  }
// Vérifie si le binding type contient "TAB" (pour afficher Tab Color)
  shouldShowTabColor(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('TAB') : false;
  }

// Vérifie si le binding type contient "INS" (pour afficher Insert Paper Type)
  shouldShowInsertPaperType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('INS') : false;
  }

// Vérifie si le binding type contient "COIL" (pour afficher Coil Type)
  shouldShowCoilType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    return bindingType ? bindingType.includes('COIL') : false;
  }
  // Vérifie si le binding type est COILHARD, COILHARD_TAB ou COILHARD_INS
  shouldShowCaseFinishType(): boolean {
    const bindingType = this.bookForm.get('bindingType')?.value;
    const caseFinishTypes = ['COILHARD', 'COILHARD_TAB', 'COILHARD_INS'];
    return caseFinishTypes.includes(bindingType);
  }
}