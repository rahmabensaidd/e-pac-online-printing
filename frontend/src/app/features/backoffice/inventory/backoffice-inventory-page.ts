import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BackofficeDataService } from '../core/backoffice.data.service';
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

@Component({
  selector: 'app-backoffice-inventory-page',
  imports: [
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeEmptyStateComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
  ],
  templateUrl: './backoffice-inventory-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeInventoryPageComponent {
  readonly backofficeData = inject(BackofficeDataService);

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

  handleRowAction(event: BackofficeDataTableRowActionEvent): void {
    this.backofficeData.markInventoryIncoming(event.rowId);
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
