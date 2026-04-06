import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import { BackofficeDataTableColumn } from '../shared/backoffice-data-table.models';
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
  readonly errorMessage = signal<string | null>(null);
  readonly details = signal<AdminUserOrdersDetailsApiModel | null>(null);

  readonly orderColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'reference', label: 'Reference', sortable: true, monospace: true },
    { key: 'orderDate', label: 'Order date', type: 'date', sortable: true },
    { key: 'status', label: 'Status', type: 'status', sortable: true },
    { key: 'priority', label: 'Priority', type: 'priority', sortable: true },
    { key: 'items', label: 'Items', type: 'numeric', sortable: true, align: 'right' },
    { key: 'totalAmount', label: 'Total', type: 'currency', sortable: true, align: 'right' },
  ];

  readonly orderRows = computed(() =>
    (this.details()?.orders ?? []).map((order) => ({
      id: String(order.orderId),
      reference: order.reference,
      orderDate: order.orderDate,
      status: order.status,
      priority: order.priority,
      items: order.items,
      totalAmount: order.totalAmount,
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
}
