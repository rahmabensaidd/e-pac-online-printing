import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
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
} from './orders.models';

@Component({
  selector: 'app-backoffice-orders-page',
  imports: [
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
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
  readonly selectedFilter = signal<OrderFilter>('All');
  readonly detailsModalOpen = signal(false);
  readonly selectedOrderId = signal<string | null>(null);
  readonly statusDraft = signal<OrderStatusUi>('Printing');
  readonly statusUpdating = signal(false);
  readonly lineUpdating = signal<string | null>(null);
  readonly ordersSignal = signal<OrderViewModel[]>([]);
  readonly statsSignal = signal<AdminOrderStatsApiModel | null>(null);

  readonly statusFilters: readonly OrderFilter[] = [
    'All',
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
    if (filter === 'All') {
      return orders;
    }
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
  readonly rejectedCount = computed(() => this.statsSignal()?.deliveredOrders ?? 0);
  readonly shippedCount = computed(() => this.statsSignal()?.shippedOrders ?? 0);
  readonly selectedOrder = computed(
    () => this.ordersSignal().find((order) => order.id === this.selectedOrderId()) ?? null,
  );
  readonly printableCustomLines = computed(() =>
    (this.selectedOrder()?.orderLines ?? []).filter((line) => line.itemSource === 'Custom'),
  );

  constructor() {
    void this.refreshOrdersAndStats();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const mode = params.get('mode');
      const orderId = params.get('orderId');

      if (mode === 'details' && orderId) {
        this.openDetailsModal(orderId, false);
        return;
      }

      if (this.detailsModalOpen()) {
        this.closeDetailsModal(false);
      }
    });
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
      const current = this.selectedOrderId();
      if (current) {
        const next = (ordersResponse.content || []).map(mapApiOrderToViewModel).find((o) => o.id === current);
        if (next) {
          this.statusDraft.set(next.status);
        }
      }
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

  openDetailsModal(orderId: string, syncQuery = true): void {
    const order = this.ordersSignal().find((candidate) => candidate.id === orderId);
    if (!order) {
      return;
    }

    this.selectedOrderId.set(orderId);
    this.statusDraft.set(order.status);
    this.detailsModalOpen.set(true);

    if (syncQuery) {
      this.updateQuery('details', orderId);
    }
  }

  closeDetailsModal(syncQuery = true): void {
    this.detailsModalOpen.set(false);
    this.selectedOrderId.set(null);
    this.statusUpdating.set(false);

    if (syncQuery) {
      this.updateQuery(null);
    }
  }

  onStatusDraftChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    this.statusDraft.set(target.value as OrderStatusUi);
  }

  async updateStatus(): Promise<void> {
    const orderId = this.selectedOrderId();
    if (!orderId) {
      return;
    }

    this.statusUpdating.set(true);
    try {
      await this.ordersApi.updateOrder(orderId, {
        status: mapUiStatusToApi(this.statusDraft()),
      });
      await this.refreshOrdersAndStats();
    } catch (error) {
      console.error('Unable to update order status', error);
    } finally {
      this.statusUpdating.set(false);
    }
  }

  async handleRowAction(event: BackofficeDataTableRowActionEvent): Promise<void> {
    if (event.actionId === 'details' || event.actionId === 'status') {
      this.openDetailsModal(event.rowId);
      return;
    }

    try {
      await this.ordersApi.deleteOrder(event.rowId);
      await this.refreshOrdersAndStats();
    } catch (error) {
      console.error('Unable to delete order', error);
    }

    if (this.selectedOrderId() === event.rowId) {
      this.closeDetailsModal();
    }
  }

  async setLineValidation(orderId: string, orderLineId: string, action: 'VALIDATED' | 'REJECTED'): Promise<void> {
    this.lineUpdating.set(orderLineId);
    try {
      await this.ordersApi.updateOrderLineValidation(orderId, orderLineId, { validationStatus: action });
      await this.refreshOrdersAndStats();
    } catch (error) {
      console.error('Unable to update line validation', error);
    } finally {
      this.lineUpdating.set(null);
    }
  }

  async setLineProductionStatus(
    orderId: string,
    orderLineId: string,
    lineStatus: 'PRINTING' | 'READY_TO_SHIP' | 'SHIPPED',
  ): Promise<void> {
    this.lineUpdating.set(orderLineId);
    try {
      await this.ordersApi.updateOrderLineProductionStatus(orderId, orderLineId, { lineStatus });
      await this.refreshOrdersAndStats();
    } catch (error) {
      console.error('Unable to update line production status', error);
    } finally {
      this.lineUpdating.set(null);
    }
  }

  private updateQuery(mode: 'details' | null, orderId?: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mode,
        orderId: mode === 'details' ? orderId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
