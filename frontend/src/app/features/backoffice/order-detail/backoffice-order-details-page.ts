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
import {
  AdminShipmentActionResponseApiModel,
  BackofficeOrdersApiService,
  BatchOrderLineUpdateDto,
  OrderLineUpdateDto,
  ShippingRateApiModel,
} from '../core/backoffice-orders-api.service';
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
  readonly shippingBusy = signal(false);
  readonly shippingRates = signal<ShippingRateApiModel[]>([]);
  readonly selectedRateId = signal<string>('');
  readonly shippingRatesEnabled = signal(true);
  readonly shippingModeMessage = signal<string>('');
  readonly shippingSelectionMessage = signal<string | null>(null);
  readonly lastShippingAction = signal<AdminShipmentActionResponseApiModel | null>(null);
  readonly statusDraft = signal<OrderStatusUi>('Shipped');
  readonly canShipWithSelectedRate = computed(() => Boolean(this.findSelectedRateForShipping()?.rateId));

  readonly orderStatusUpdateOptions: readonly OrderStatusUi[] = ['Shipped', 'Rejected', 'Cancelled'];

  readonly customLineStatusOptions: readonly { value: OrderLineStatusUi; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'VALIDATED', label: 'Validated' },
    { value: 'PRINTING', label: 'Printing' },
    { value: 'READY_TO_SHIP', label: 'Ready to ship' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly marketplaceLineStatusOptions: readonly { value: OrderLineStatusUi; label: string }[] = [
    { value: 'READY', label: 'Ready' },
    { value: 'READY_TO_SHIP', label: 'Ready to ship' },
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
      await this.loadShippingRates(orderId);
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
    this.errorMessage.set(null);

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
      this.errorMessage.set('Unable to update order line status. Please try again.');
    } finally {
      this.lineUpdating.set(null);
      this.priorityUpdating.set(null);
    }
  }

  async loadShippingRates(orderId: string): Promise<void> {
    try {
      const rates = await this.ordersApi.getShippingRates(orderId);
      this.shippingRatesEnabled.set(rates.ratesEnabled !== false);
      this.shippingModeMessage.set(rates.informationMessage ?? '');
      const availableRates = this.shippingRatesEnabled() ? (rates.rates ?? []) : [];
      const backendSelectedRateId = this.shippingRatesEnabled() ? (rates.selectedRateId ?? '') : '';
      const persistedSelectedRate = this.buildPersistedSelectedRate(backendSelectedRateId);
      const mergedRates = persistedSelectedRate && !availableRates.some((rate) => rate.rateId === persistedSelectedRate.rateId)
        ? [persistedSelectedRate, ...availableRates]
        : availableRates;
      const resolvedSelectedRateId = backendSelectedRateId || this.selectedRateId() || '';

      this.shippingRates.set(mergedRates);
      this.selectedRateId.set(resolvedSelectedRateId);
    } catch (error) {
      console.error('Unable to load shipping rates', error);
      this.shippingRates.set([]);
      this.shippingRatesEnabled.set(false);
      this.shippingModeMessage.set('Unable to load rates right now.');
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
        case 'PENDING':
          return `${baseClasses} bg-amber-500 text-white shadow-sm`;
        case 'VALIDATED':
          return `${baseClasses} bg-emerald-600 text-white shadow-sm`;
        case 'READY':
          return `${baseClasses} bg-emerald-500 text-white shadow-sm`;
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
      case 'PENDING':
        return `${baseClasses} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
      case 'VALIDATED':
        return `${baseClasses} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
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

  getStatusOptionsForLine(line: OrderLineViewModel): readonly { value: OrderLineStatusUi; label: string }[] {
    return this.isCustomLine(line) ? this.customLineStatusOptions : this.marketplaceLineStatusOptions;
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

  async createShipment(): Promise<void> {
    const orderId = this.order()?.id;
    if (!orderId) {
      return;
    }
    const selectedRate = this.findSelectedRateForShipping();
    if (!selectedRate?.rateId) {
      this.errorMessage.set('Please select a rate before creating shipment.');
      return;
    }

    this.shippingBusy.set(true);
    this.errorMessage.set(null);
    try {
      const payload = {
        rateId: selectedRate.rateId,
        carrier: selectedRate.carrier || selectedRate.carrierId,
        service: selectedRate.service,
        currency: selectedRate.currency,
        amount: selectedRate.amount,
        autoSelect: false,
      };
      const result = await this.ordersApi.createShipment(orderId, payload);
      this.lastShippingAction.set(result);
      this.shippingSelectionMessage.set('Shipment created with the selected rate.');
      await this.loadOrder(orderId);
    } catch (error) {
      console.error('Unable to create shipment', error);
      this.errorMessage.set(
        this.extractApiErrorMessage(
          error,
          'Unable to create shipment from Shippo. Please verify selected rate.',
        ),
      );
    } finally {
      this.shippingBusy.set(false);
    }
  }

  async refreshTracking(): Promise<void> {
    const orderId = this.order()?.id;
    if (!orderId) return;
    this.shippingBusy.set(true);
    this.errorMessage.set(null);
    try {
      const result = await this.ordersApi.refreshShipmentTracking(orderId);
      this.lastShippingAction.set(result);
      await this.loadOrder(orderId);
    } catch (error) {
      console.error('Unable to refresh tracking', error);
      this.errorMessage.set('Unable to refresh tracking now.');
    } finally {
      this.shippingBusy.set(false);
    }
  }

  async onRateSelected(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    const orderId = this.order()?.id;
    const selectedRateId = target.value ?? '';
    this.selectedRateId.set(selectedRateId);
    this.shippingSelectionMessage.set(null);

    if (!orderId || !selectedRateId) {
      return;
    }

    const selectedRate = this.shippingRates().find((rate) => rate.rateId === selectedRateId);
    if (!selectedRate) {
      return;
    }

    this.errorMessage.set(null);
    this.applySelectedRateToOrder(selectedRate);
    this.shippingSelectionMessage.set(`Selected rate: ${selectedRate.carrier || selectedRate.carrierId || 'Carrier'} ${selectedRate.service ? `· ${selectedRate.service}` : ''}`);
    try {
      const result = await this.ordersApi.selectShippingRate(orderId, {
        rateId: selectedRate.rateId,
        carrier: selectedRate.carrier || selectedRate.carrierId,
        service: selectedRate.service,
        currency: selectedRate.currency,
        amount: selectedRate.amount,
      });
      this.lastShippingAction.set(result);
      this.shippingSelectionMessage.set('Rate selected. You can now click "Ship with selected rate".');
      this.applyShipmentActionToOrder(result);
    } catch (error) {
      console.error('Unable to select shipping rate', error);
      this.errorMessage.set('Unable to save the selected shipping rate. Please try again.');
    }
  }

  private findSelectedRate(): ShippingRateApiModel | undefined {
    const selectedId = this.selectedRateId();
    if (!selectedId) {
      return undefined;
    }
    return this.shippingRates().find((rate) => rate.rateId === selectedId);
  }

  private findSelectedRateForShipping(): ShippingRateApiModel | undefined {
    const fromRates = this.findSelectedRate();
    if (fromRates?.rateId) {
      return fromRates;
    }

    const order = this.order();
    const persistedRateId = order?.selectedRateId || this.selectedRateId();
    if (!persistedRateId) {
      return undefined;
    }

    return {
      rateId: persistedRateId,
      carrier: order?.carrier,
      service: order?.selectedRateService,
      currency: order?.selectedRateCurrency,
      amount: order?.selectedRateAmount,
      selected: true,
    };
  }

  private buildPersistedSelectedRate(rateId: string): ShippingRateApiModel | undefined {
    const order = this.order();
    if (!rateId || !order) {
      return undefined;
    }

    return {
      rateId,
      carrier: order.carrier,
      service: order.selectedRateService,
      currency: order.selectedRateCurrency,
      amount: order.selectedRateAmount,
      selected: true,
    };
  }

  private applySelectedRateToOrder(selectedRate: ShippingRateApiModel): void {
    const currentOrder = this.order();
    if (!currentOrder) {
      return;
    }

    this.order.set({
      ...currentOrder,
      carrier: selectedRate.carrier || selectedRate.carrierId || currentOrder.carrier,
      selectedRateId: selectedRate.rateId || currentOrder.selectedRateId,
      selectedRateService: selectedRate.service || currentOrder.selectedRateService,
      selectedRateCurrency: selectedRate.currency || currentOrder.selectedRateCurrency,
      selectedRateAmount: selectedRate.amount ?? currentOrder.selectedRateAmount,
    });
  }

  private applyShipmentActionToOrder(result: AdminShipmentActionResponseApiModel): void {
    const currentOrder = this.order();
    if (!currentOrder || !result) {
      return;
    }

    this.order.set({
      ...currentOrder,
      carrier: result.carrier || currentOrder.carrier,
      shippingStatus: result.shippingStatus || currentOrder.shippingStatus,
      trackingNumber: result.trackingNumber || currentOrder.trackingNumber,
      trackingUrl: result.trackingUrl || currentOrder.trackingUrl,
      labelUrl: result.labelUrl || currentOrder.labelUrl,
      selectedRateId: result.selectedRateId || currentOrder.selectedRateId,
      selectedRateService: result.service || currentOrder.selectedRateService,
      selectedRateCurrency: result.rateCurrency || currentOrder.selectedRateCurrency,
      selectedRateAmount: result.rateAmount ?? currentOrder.selectedRateAmount,
      testShipment: result.testShipment ?? currentOrder.testShipment,
    });
  }

  private extractApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as { error?: unknown; message?: unknown };
    const responseBody = maybeError.error;
    if (responseBody && typeof responseBody === 'object') {
      const bodyAsRecord = responseBody as Record<string, unknown>;
      const backendMessage = bodyAsRecord['message'];
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
      const backendError = bodyAsRecord['error'];
      if (typeof backendError === 'string' && backendError.trim()) {
        return backendError;
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }
    return fallback;
  }
}
