// backoffice-orders-page.component.ts - Version nettoyée

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BackofficeOrdersApiService, AdminOrderStatsApiModel } from '../core/backoffice-orders-api.service';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableEmptyState,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { mapApiOrderToViewModel, mapUiStatusToApi } from './orders.mappers';
import {
  OrderFilter,
  OrderStatusUi,
  OrderTableRow,
  OrderViewModel,
} from '../core/orders.models';

@Component({
  selector: 'app-backoffice-orders-page',
  imports: [
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
    CurrencyPipe,
  ],
  templateUrl: './backoffice-orders-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeOrdersPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ordersApi = inject(BackofficeOrdersApiService);

  readonly backofficeData = inject(BackofficeDataService);
  readonly isLoading = signal(true);
  readonly selectedFilter = signal<OrderFilter>('Pending');
  readonly ordersSignal = signal<OrderViewModel[]>([]);
  readonly statsSignal = signal<AdminOrderStatsApiModel | null>(null);

  readonly statusFilters: readonly OrderFilter[] = [
    'Pending',
    'Printing',
    'Ready to ship',
    'Shipped',
    'Rejected',
    'Cancelled',
  ];

  readonly orderColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'reference', label: 'Reference', sortable: true, monospace: true },
    { key: 'customerName', label: 'Customer', sortable: true, secondaryKey: 'companyName' },
    { key: 'submittedAt', label: 'Submitted', type: 'date', sortable: true },
    { key: 'dueDate', label: 'Due date', type: 'date', sortable: true },
    { key: 'total', label: 'Total', type: 'currency', sortable: true, align: 'right' },
    { key: 'status', label: 'Status', type: 'status', sortable: true },
    { key: 'validationStatus', label: 'Validation', type: 'status', sortable: true },
    { key: 'priority', label: 'Priority', type: 'priority', sortable: true },
    { key: 'assignee', label: 'Owner', sortable: true },
  ];

  readonly orderActions: readonly BackofficeDataTableAction[] = [
    { id: 'details', label: 'Order details', icon: 'fa-eye' },
    { id: 'delete', label: 'Delete order', icon: 'fa-trash', tone: 'danger' },
  ];

  readonly emptyState: BackofficeDataTableEmptyState = {
    icon: 'fa-inbox',
    title: 'No orders match this view',
    description: 'Adjust the status filter to view matching orders.',
    actionLabel: '',
  };

  readonly filteredOrders = computed(() => {
    const filter = this.selectedFilter();
    const orders = this.ordersSignal();
    return orders.filter((order) => order.status === filter);
  });

  readonly tableRows = computed<OrderTableRow[]>(() =>
      this.filteredOrders().map((order) => ({
        id: order.id,
        reference: order.reference,
        customerName: order.customerName,
        companyName: order.companyName,
        submittedAt: order.submittedAt,
        dueDate: order.dueDate,
        total: order.total,
        status: order.status,
        validationStatus: order.validationStatus,
        priority: order.priority,
        assignee: order.assignee,
        items: order.items,
        paymentStatus: order.paymentStatus,
      })),
  );

  readonly productionValue = computed(() => this.statsSignal()?.productionValue ?? 0);
  readonly rejectedCount = computed(() => this.statsSignal()?.rejectedOrders ?? 0);
  readonly shippedCount = computed(() => this.statsSignal()?.shippedOrders ?? 0);

  constructor() {
    void this.refreshOrdersAndStats();
  }

  async refreshOrdersAndStats(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [ordersResponse, stats] = await Promise.all([
        this.ordersApi.getOrders({ page: 0, size: 500 }),
        this.ordersApi.getStats(),
      ]);
      this.ordersSignal.set((ordersResponse.content || []).map(mapApiOrderToViewModel));
      this.statsSignal.set(stats);
    } catch (error) {
      console.error('Unable to load orders or order stats', error);
      this.ordersSignal.set([]);
      this.statsSignal.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilter(filter: OrderFilter): void {
    this.selectedFilter.set(filter);
  }

  filterButtonClass(filter: OrderFilter): string {
    return this.selectedFilter() === filter
        ? 'admin-focus-ring inline-flex items-center rounded-full bg-brand-navy px-3 py-1.5 text-[0.78rem] font-semibold text-white'
        : 'admin-focus-ring inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-600 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy';
  }
// backoffice-orders-page.component.ts - Modifiez la méthode handleRowAction

  async handleRowAction(event: BackofficeDataTableRowActionEvent): Promise<void> {
    if (event.actionId === 'details' || event.actionId === 'status') {
      // Au lieu d'ouvrir le modal, on navigue vers la page de détails
      this.router.navigate(['/backoffice/order-details', event.rowId]);
      return;
    }

    if (event.actionId === 'delete') {
      try {
        await this.ordersApi.deleteOrder(event.rowId);
        await this.refreshOrdersAndStats();
      } catch (error) {
        console.error('Unable to delete order', error);
      }
    }
  }
}
