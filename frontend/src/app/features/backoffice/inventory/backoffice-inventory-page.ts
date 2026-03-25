// backoffice-inventory-page.component.ts (extrait modifié)
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BookService } from '../bookstable/book.service'; // Ajouter cette importation
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
import { Bookstable } from "../bookstable/bookstable";

@Component({
  selector: 'app-backoffice-inventory-page',
  imports: [
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeEmptyStateComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
    Bookstable
  ],
  templateUrl: './backoffice-inventory-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class BackofficeInventoryPageComponent {
  readonly backofficeData = inject(BackofficeDataService);
  readonly bookService = inject(BookService); // Ajouter le service des livres

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

  // Colonnes pour l'inventaire (déjà existant)
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

  // Computed values pour l'inventaire (déjà existant)
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

  // Gestionnaires d'événements
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
        // Naviguer vers la page d'édition ou ouvrir un modal
        console.log('Edit book:', event.rowId);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this book?')) {
          this.bookService.deleteBook(Number(event.rowId));
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
}