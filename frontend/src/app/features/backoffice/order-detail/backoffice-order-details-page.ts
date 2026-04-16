// backoffice/order-details/backoffice-order-details-page.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackofficeOrdersApiService, BatchOrderLineUpdateDto, OrderLineUpdateDto } from '../core/backoffice-orders-api.service';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { mapApiOrderToViewModel, mapUiStatusToApi } from '../orders/orders.mappers';
import {
  OrderLinePriorityDisplay,
  OrderLineStatusUi,
  OrderLineViewModel,
  OrderStatusUi,
  OrderViewModel,
} from '../core/orders.models';

@Component({
  selector: 'app-backoffice-order-details-page',
  imports: [
    CurrencyPipe,
    BackofficeSectionHeaderComponent,
    BackofficeCardComponent,
  ],
  templateUrl: './backoffice-order-details-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeOrderDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersApi = inject(BackofficeOrdersApiService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly order = signal<OrderViewModel | null>(null);
  readonly statusUpdating = signal(false);
  readonly lineUpdating = signal<string | null>(null);
  readonly priorityUpdating = signal<string | null>(null);
  readonly statusDraft = signal<OrderStatusUi>('Shipped');

  readonly orderStatusUpdateOptions: readonly OrderStatusUi[] = ['Shipped', 'Rejected', 'Cancelled'];

  readonly lineStatusOptions: readonly { value: OrderLineStatusUi; label: string }[] = [
    { value: 'READY', label: 'Ready' },
    { value: 'PRINTING', label: 'Printing' },
    { value: 'READY_TO_SHIP', label: 'Ready to ship' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly priorityOptions: readonly { value: OrderLinePriorityDisplay; label: string }[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];

  readonly orderLines = computed(() => this.order()?.orderLines ?? []);

  constructor() {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      void this.loadOrder(orderId);
    }
  }

  async loadOrder(orderId: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const apiOrder = await this.ordersApi.getOrderById(orderId);
      const mappedOrder = mapApiOrderToViewModel(apiOrder);
      this.order.set(mappedOrder);
      const safeStatus = this.orderStatusUpdateOptions.includes(mappedOrder.status as OrderStatusUi)
          ? (mappedOrder.status as OrderStatusUi)
          : 'Shipped';
      this.statusDraft.set(safeStatus);
    } catch (error) {
      console.error('Unable to load order details', error);
      this.errorMessage.set('Unable to load order details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async updateStatus(): Promise<void> {
    const orderId = this.order()?.id;
    if (!orderId) return;

    this.statusUpdating.set(true);
    try {
      await this.ordersApi.updateOrderStatus(orderId, {
        status: mapUiStatusToApi(this.statusDraft()) as 'REJECTED' | 'CANCELLED' | 'SHIPPED',
      });
      await this.loadOrder(orderId);
    } catch (error) {
      console.error('Unable to update order status', error);
    } finally {
      this.statusUpdating.set(false);
    }
  }

  async updateLine(line: OrderLineViewModel, updates: { status?: OrderLineStatusUi; priority?: OrderLinePriorityDisplay }): Promise<void> {
    const orderId = this.order()?.id;
    if (!orderId) return;

    if (updates.status) this.lineUpdating.set(line.orderLineId);
    if (updates.priority) this.priorityUpdating.set(line.orderLineId);

    const updateDto: OrderLineUpdateDto = { orderLineId: Number(line.orderLineId) };
    if (updates.status) updateDto.status = updates.status;
    if (updates.priority) updateDto.priority = updates.priority;

    const batchUpdate: BatchOrderLineUpdateDto = { updates: [updateDto] };

    try {
      await this.ordersApi.updateOrderLines(orderId, batchUpdate);
      await this.loadOrder(orderId);
    } catch (error) {
      console.error('Unable to update line', error);
    } finally {
      this.lineUpdating.set(null);
      this.priorityUpdating.set(null);
    }
  }

  goBack(): void {
    this.router.navigate(['/backoffice/orders']);
  }

  getLineStatusButtonClass(currentStatus: OrderLineStatusUi, buttonStatus: OrderLineStatusUi): string {
    const baseClasses =
        'admin-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200';

    if (currentStatus === buttonStatus) {
      switch (buttonStatus) {
        case 'READY':
          return `${baseClasses} bg-emerald-600 text-white shadow-sm`;
        case 'REJECTED':
          return `${baseClasses} bg-rose-600 text-white shadow-sm`;
        case 'PRINTING':
          return `${baseClasses} bg-sky-600 text-white shadow-sm`;
        case 'READY_TO_SHIP':
          return `${baseClasses} bg-indigo-600 text-white shadow-sm`;
        default:
          return `${baseClasses} bg-brand-navy text-white shadow-sm`;
      }
    }

    switch (buttonStatus) {
      case 'READY':
        return `${baseClasses} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
      case 'REJECTED':
        return `${baseClasses} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
      case 'PRINTING':
        return `${baseClasses} border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`;
      case 'READY_TO_SHIP':
        return `${baseClasses} border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`;
      default:
        return `${baseClasses} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;
    }
  }
  getPriorityButtonClass(currentPriority: OrderLinePriorityDisplay, buttonPriority: OrderLinePriorityDisplay): string {
    const baseClasses = 'admin-focus-ring inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200';
    if (currentPriority === buttonPriority) {
      switch (buttonPriority) {
        case 'LOW': return `${baseClasses} bg-slate-600 text-white shadow-sm`;
        case 'MEDIUM': return `${baseClasses} bg-amber-600 text-white shadow-sm`;
        case 'HIGH': return `${baseClasses} bg-red-600 text-white shadow-sm`;
        default: return `${baseClasses} bg-brand-navy text-white shadow-sm`;
      }
    }
    switch (buttonPriority) {
      case 'LOW': return `${baseClasses} border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100`;
      case 'MEDIUM': return `${baseClasses} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
      case 'HIGH': return `${baseClasses} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`;
      default: return `${baseClasses} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;
    }
  }

  isCustomLine(line: OrderLineViewModel): boolean {
    return line.itemSource === 'CUSTOM';
  }

  async onStatusChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }

    const selected = target.value as OrderStatusUi;
    if (!this.orderStatusUpdateOptions.includes(selected)) {
      return;
    }

    this.statusDraft.set(selected);

    const orderId = this.order()?.id;
    if (!orderId) {
      return;
    }

    this.statusUpdating.set(true);

    try {
      await this.ordersApi.updateOrderStatus(orderId, {
        status: mapUiStatusToApi(selected) as 'REJECTED' | 'CANCELLED' | 'SHIPPED',
      });

      await this.loadOrder(orderId);
    } catch (error) {
      console.error('Unable to update order status', error);
      this.errorMessage.set('Unable to update order status. Please try again.');
    } finally {
      this.statusUpdating.set(false);
    }
  }
}