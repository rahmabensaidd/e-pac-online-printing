import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderResponse, OrderService, OrderTrackingResponse } from '../../core/services/order.service';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './order-tracking-page.html',
  styleUrl: './order-tracking-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingPageComponent {
  private readonly ordersApi = inject(OrderService);

  readonly loading = signal(true);
  readonly loadingTracking = signal(false);
  readonly downloadingInvoice = signal(false);
  readonly error = signal<string | null>(null);
  readonly refreshInfo = signal<string | null>(null);
  readonly lastRefreshAt = signal<Date | null>(null);
  readonly orders = signal<OrderResponse[]>([]);
  readonly selectedOrderId = signal<number | null>(null);
  readonly tracking = signal<OrderTrackingResponse | null>(null);

  readonly selectedOrder = computed(() =>
      this.orders().find((order) => order.orderId === this.selectedOrderId()) ?? null,
  );

  readonly productionLines = computed(() => this.tracking()?.productionLines ?? []);
  readonly shippingLines = computed(() => this.tracking()?.shippingLines ?? []);
  readonly trackingUrl = computed(() => {
    const apiUrl = this.tracking()?.trackingUrl || this.selectedOrder()?.trackingUrl;
    return apiUrl ?? null;
  });

  constructor() {
    void this.loadOrders();
  }

  async loadOrders(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.refreshInfo.set(null);
    this.lastRefreshAt.set(null);
    try {
      const orders = await this.ordersApi.getMyOrders();
      this.orders.set(orders ?? []);
      if ((orders ?? []).length > 0) {
        const firstId = orders[0]?.orderId ?? null;
        this.selectedOrderId.set(firstId);
        if (firstId) {
          await this.loadTracking(firstId);
        }
      }
    } catch (error) {
      console.error('Unable to load user orders', error);
      this.error.set('Unable to load your orders right now.');
      this.orders.set([]);
      this.tracking.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async onOrderChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement | null;
    const orderId = Number(target?.value ?? NaN);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return;
    }
    this.selectedOrderId.set(orderId);
    this.refreshInfo.set(null);
    this.lastRefreshAt.set(null);
    await this.loadTracking(orderId);
  }

  async loadTracking(orderId: number): Promise<void> {
    this.loadingTracking.set(true);
    this.error.set(null);
    try {
      this.tracking.set(await this.ordersApi.getOrderTracking(orderId));
    } catch (error) {
      console.error('Unable to load order tracking', error);
      this.error.set('Unable to load tracking details for this order.');
      this.tracking.set(null);
    } finally {
      this.loadingTracking.set(false);
    }
  }

  async onDownloadInvoice(): Promise<void> {
    const order = this.selectedOrder();
    if (!order?.orderId) {
      return;
    }

    this.downloadingInvoice.set(true);
    this.error.set(null);

    try {
      const blob = await this.ordersApi.downloadInvoice(order.orderId);
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${order.reference || order.orderId}.pdf`;
      anchor.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unable to download invoice', error);
      this.error.set('Unable to download invoice for this order.');
    } finally {
      this.downloadingInvoice.set(false);
    }
  }

  async refreshTracking(): Promise<void> {
    const orderId = this.selectedOrderId();
    if (!orderId) {
      return;
    }
    this.loadingTracking.set(true);
    this.error.set(null);
    this.refreshInfo.set(null);
    try {
      const previousTracking = this.tracking();
      const refreshedTracking = await this.ordersApi.refreshOrderTracking(orderId);
      this.tracking.set(refreshedTracking);
      const orders = await this.ordersApi.getMyOrders();
      this.orders.set(orders ?? []);
      this.lastRefreshAt.set(new Date());
      this.refreshInfo.set(this.buildRefreshInfoMessage(previousTracking, refreshedTracking));
    } catch (error) {
      console.error('Unable to refresh live tracking', error);
      this.error.set('Unable to refresh tracking now.');
    } finally {
      this.loadingTracking.set(false);
    }
  }

  readonly lastRefreshLabel = computed(() => {
    const value = this.lastRefreshAt();
    if (!value) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  });

  private buildRefreshInfoMessage(previous: OrderTrackingResponse | null, current: OrderTrackingResponse | null): string {
    const currentStatus = current?.shippingStatus || 'unknown';
    const changed = previous?.shippingStatus !== current?.shippingStatus
      || previous?.carrier !== current?.carrier
      || previous?.trackingUrl !== current?.trackingUrl
      || previous?.trackingNumber !== current?.trackingNumber;

    if (changed) {
      return `Tracking refreshed. Current shipping status: ${currentStatus}.`;
    }

    return `Tracking checked. Shippo still reports ${currentStatus}.`;
  }
}
