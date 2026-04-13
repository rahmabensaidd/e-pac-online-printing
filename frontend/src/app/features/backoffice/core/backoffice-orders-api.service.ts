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
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  productionValue: number;
}

export interface OrderLineValidationUpdatePayload {
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
}

export interface OrderLineProductionStatusUpdatePayload {
  lineStatus: 'PRINTING' | 'READY_TO_SHIP' | 'SHIPPED';
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

  async updateOrderLineValidation(
    orderId: string,
    orderLineId: string,
    payload: OrderLineValidationUpdatePayload,
  ): Promise<AdminOrderApiModel> {
    return await firstValueFrom(
      this.http.patch<AdminOrderApiModel>(`${this.apiUrl}/${orderId}/lines/${orderLineId}/validation`, payload),
    );
  }

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
