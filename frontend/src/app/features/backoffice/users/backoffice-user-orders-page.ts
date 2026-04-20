import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import {
  AdminUserOrdersDetailsApiModel,
  BackofficeUsersApiService,
} from '../core/backoffice-users-api.service';

@Component({
  selector: 'app-backoffice-user-orders-page',
  imports: [
    RouterLink,
    BackofficeSectionHeaderComponent,
    BackofficeCardComponent,
    BackofficeStatCardComponent,
    BackofficeDataTableComponent,
  ],
  templateUrl: './backoffice-user-orders-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeUserOrdersPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersApi = inject(BackofficeUsersApiService);

  readonly loading = signal(true);
  readonly downloadingInvoiceId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly details = signal<AdminUserOrdersDetailsApiModel | null>(null);

  readonly isOrganizationUser = computed(
    () => (this.details()?.userType ?? 'SIMPLE').toUpperCase() === 'ORGANIZATION',
  );

  readonly orderColumns = computed<readonly BackofficeDataTableColumn[]>(() => {
    const baseColumns: BackofficeDataTableColumn[] = [
      { key: 'reference', label: 'Reference', sortable: true, monospace: true },
      { key: 'orderDate', label: 'Order date', type: 'date', sortable: true },
      { key: 'orderType', label: 'Order type', sortable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: true },
      { key: 'priority', label: 'Priority', type: 'priority', sortable: true },
      { key: 'shippingStatus', label: 'Shipping status', type: 'status', sortable: true },
    ];

    if (this.isOrganizationUser()) {
      baseColumns.push({ key: 'shippingMethodLabel', label: 'Shipping type', sortable: true });
    }

    baseColumns.push(
      { key: 'items', label: 'Items', type: 'numeric', sortable: true, align: 'right' },
      { key: 'totalAmount', label: 'Total', type: 'currency', sortable: true, align: 'right' },
    );

    return baseColumns;
  });

  readonly orderActions = computed<readonly BackofficeDataTableAction[]>(() => [
    { id: 'downloadInvoice', label: 'Download invoice PDF', icon: 'fa-file-arrow-down' },
  ]);

  readonly orderRows = computed(() =>
    (this.details()?.orders ?? []).map((order) => ({
      id: String(order.orderId),
      reference: order.reference,
      orderDate: order.orderDate,
      orderType: this.formatOrderType(order.orderType),
      status: order.status,
      priority: order.priority,
      shippingStatus: order.shippingStatus ? this.formatStatus(order.shippingStatus) : 'N/A',
      shippingMethodLabel: order.shippingMethod ? this.formatShippingMethod(order.shippingMethod) : 'N/A',
      items: order.items,
      totalAmount: order.totalAmount,
      invoiceAvailable: order.invoiceAvailable,
    })),
  );

  readonly totalOrders = computed(() => this.details()?.totalOrders ?? 0);
  readonly totalAmount = computed(() =>
    (this.details()?.orders ?? []).reduce((sum, order) => sum + (order.totalAmount ?? 0), 0),
  );

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const userId = Number(this.route.snapshot.paramMap.get('userId'));
      if (!Number.isFinite(userId)) {
        throw new Error('Invalid user id');
      }
      this.details.set(await this.usersApi.getUserOrders(userId));
    } catch (error) {
      console.error('Unable to load user orders', error);
      this.errorMessage.set('Unable to load user orders.');
      this.details.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async goBack(): Promise<void> {
    await this.router.navigate(['/backoffice/users']);
  }

  async onOrderRowAction(event: BackofficeDataTableRowActionEvent): Promise<void> {
    if (event.actionId !== 'downloadInvoice') {
      return;
    }

    const orderId = Number(event.rowId);
    if (!Number.isFinite(orderId)) {
      return;
    }

    const order = this.details()?.orders.find((item) => item.orderId === orderId);
    if (!order?.invoiceAvailable) {
      this.errorMessage.set('Invoice PDF is not available for this order yet.');
      return;
    }

    this.downloadingInvoiceId.set(orderId);
    this.errorMessage.set(null);

    try {
      const blob = await this.usersApi.downloadInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${order.reference || orderId}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unable to download invoice PDF', error);
      this.errorMessage.set('Unable to download invoice PDF for this order.');
    } finally {
      this.downloadingInvoiceId.set(null);
    }
  }

  private formatOrderType(value: string | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }

    return value
      .replaceAll('_', ' ')
      .split(' + ')
      .map((part) =>
        part
          .toLowerCase()
          .split(' ')
          .filter(Boolean)
          .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
          .join(' '),
      )
      .join(' + ');
  }

  private formatStatus(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private formatShippingMethod(value: string): string {
    switch (value.toUpperCase()) {
      case 'FULLTRUCKLOAD_DHL':
        return 'Full Truck Load';
      case 'FREIGHTSHIPPING':
        return 'Freight Shipping';
      case 'STANDARD':
        return 'Standard';
      default:
        return this.formatStatus(value);
    }
  }
}
