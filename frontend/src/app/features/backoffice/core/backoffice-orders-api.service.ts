// backoffice-orders-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface OrdersPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AdminOrderApiModel {
  orderId: number;
  reference: string;
  customerName: string;
  companyName?: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: string;
  validationStatus?: string;
  priority: string;
  assignee?: string;
  items: number;
  shippingMethod: string;
  shippingStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  labelUrl?: string;
  selectedRateId?: string;
  selectedRateService?: string;
  selectedRateCurrency?: string;
  selectedRateAmount?: number;
  testShipment?: boolean;
  paymentStatus: string;
  notes?: string;
  orderLines?: AdminOrderLineApiModel[];
}

export interface AdminOrderLineApiModel {
  orderLineId: number;
  bookId: number;
  title: string;
  itemSource: string;
  lineStatus?: string;
  priority?: string;
  validationStatus?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isEstimated?: boolean;
  currency?: string;
}

export interface AdminOrderStatsApiModel {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  readyToShipOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  productionValue: number;
}

// Nouveaux DTOs pour les updates batch
export interface OrderLineUpdateDto {
  orderLineId: number;
  status?: 'PENDING' | 'VALIDATED' | 'READY' | 'REJECTED' | 'PRINTING' | 'READY_TO_SHIP';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BatchOrderLineUpdateDto {
  updates: OrderLineUpdateDto[];
}

export interface OrderStatusUpdateDto {
  status: 'REJECTED' | 'CANCELLED' | 'SHIPPED';
}

export interface ShippingRateApiModel {
  rateId: string;
  carrierId?: string;
  carrier?: string;
  service?: string;
  currency?: string;
  amount?: number;
  estimatedDays?: number;
  selected?: boolean;
}

export interface AdminShippingRatesResponseApiModel {
  orderId: number;
  shippingMethod?: string;
  selectedRateId?: string;
  selectedService?: string;
  testMode?: boolean;
  ratesEnabled?: boolean;
  informationMessage?: string;
  rates: ShippingRateApiModel[];
}

export interface AdminCreateShipmentRequestDto {
  rateId?: string;
  carrier?: string;
  service?: string;
  currency?: string;
  amount?: number;
  autoSelect?: boolean;
  testShipment?: boolean;
}

export interface AdminSelectRateRequestDto {
  rateId: string;
  carrier?: string;
  service?: string;
  currency?: string;
  amount?: number;
}

export interface AdminShipmentActionResponseApiModel {
  orderId: number;
  carrier?: string;
  service?: string;
  shippingStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrierShipmentId?: string;
  labelUrl?: string;
  selectedRateId?: string;
  rateCurrency?: string;
  rateAmount?: number;
  testShipment?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BackofficeOrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/orders/admin';

  async getOrders(params?: {
    page?: number;
    size?: number;
    status?: string;
    search?: string;
  }): Promise<OrdersPageResponse<AdminOrderApiModel>> {
    const query: Record<string, string> = {
      page: String(params?.page ?? 0),
      size: String(params?.size ?? 250),
    };

    if (params?.status) {
      query.status = params.status;
    }
    if (params?.search) {
      query.search = params.search;
    }

    return await firstValueFrom(
        this.http.get<OrdersPageResponse<AdminOrderApiModel>>(this.apiUrl, { params: query }),
    );
  }

  async getStats(): Promise<AdminOrderStatsApiModel> {
    return await firstValueFrom(
        this.http.get<AdminOrderStatsApiModel>(`${this.apiUrl}/stats`),
    );
  }

  async getOrderById(orderId: string): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
        this.http.get<AdminOrderApiModel>(`${this.apiUrl}/${orderId}`),
    );
  }

  async createOrder(payload: AdminOrderUpsertRequest): Promise<AdminOrderApiModel> {
    return await firstValueFrom(this.http.post<AdminOrderApiModel>(this.apiUrl, payload));
  }

  async updateOrder(
      orderId: string,
      payload: Partial<AdminOrderUpsertRequest>,
  ): Promise<AdminOrderApiModel> {
    return await firstValueFrom(this.http.put<AdminOrderApiModel>(`${this.apiUrl}/${orderId}`, payload));
  }

  async deleteOrder(orderId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${orderId}`));
  }

  // NOUVEAU: Mise à jour du statut global de la commande
  async updateOrderStatus(orderId: string, payload: OrderStatusUpdateDto): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
        this.http.patch<AdminOrderApiModel>(`${this.apiUrl}/${orderId}/status`, payload),
    );
  }

  // NOUVEAU: Mise à jour batch des order lines (statut + priorité)
  async updateOrderLines(orderId: string, payload: BatchOrderLineUpdateDto): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
        this.http.patch<AdminOrderApiModel>(`${this.apiUrl}/${orderId}/orderlines`, payload),
    );
  }

  async getShippingRates(orderId: string): Promise<AdminShippingRatesResponseApiModel> {
    return await firstValueFrom(
        this.http.get<AdminShippingRatesResponseApiModel>(`${this.apiUrl}/${orderId}/shipping/rates`),
    );
  }

  async selectShippingRate(orderId: string, payload: AdminSelectRateRequestDto): Promise<AdminShipmentActionResponseApiModel> {
    return await firstValueFrom(
      this.http.post<AdminShipmentActionResponseApiModel>(`${this.apiUrl}/${orderId}/shipping/rate-selection`, payload),
    );
  }

  async createShipment(orderId: string, payload: AdminCreateShipmentRequestDto): Promise<AdminShipmentActionResponseApiModel> {
    return await firstValueFrom(
        this.http.post<AdminShipmentActionResponseApiModel>(`${this.apiUrl}/${orderId}/shipping/ship`, payload),
    );
  }

  async refreshShipmentTracking(orderId: string): Promise<AdminShipmentActionResponseApiModel> {
    return await firstValueFrom(
        this.http.post<AdminShipmentActionResponseApiModel>(`${this.apiUrl}/${orderId}/shipping/tracking/refresh`, {}),
    );
  }

  // @deprecated - Utiliser updateOrderLines à la place
  async updateOrderLineValidation(
      orderId: string,
      orderLineId: string,
      payload: OrderLineValidationUpdatePayload,
  ): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
        this.http.patch<AdminOrderApiModel>(`${this.apiUrl}/${orderId}/lines/${orderLineId}/validation`, payload),
    );
  }

  // @deprecated - Utiliser updateOrderLines à la place
  async updateOrderLineProductionStatus(
      orderId: string,
      orderLineId: string,
      payload: OrderLineProductionStatusUpdatePayload,
  ): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
        this.http.patch<AdminOrderApiModel>(`${this.apiUrl}/${orderId}/lines/${orderLineId}/production-status`, payload),
    );
  }
}

// Types pour les méthodes dépréciées (gardés pour compatibilité)
export interface OrderLineValidationUpdatePayload {
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
}

export interface OrderLineProductionStatusUpdatePayload {
  lineStatus: 'PRINTING' | 'READY_TO_SHIP';
}

export interface AdminOrderUpsertRequest {
  reference?: string;
  customerName: string;
  companyName?: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: string;
  priority: string;
  assignee: string;
  items: number;
  shippingMethod: string;
  paymentStatus: string;
  notes?: string;
}
