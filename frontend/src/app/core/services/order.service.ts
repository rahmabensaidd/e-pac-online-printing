import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CheckoutOrderRequest {
  cartId: number;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  shippingMethod: string;
  paymentMethod: string;
  confirmPriceUpdate?: boolean;
}

export interface OrderLineResponse {
  orderLineId: number;
  bookId: number;
  title: string;
  itemSource?: string;
  lineStatus?: string;
  priority?: string;
  validationStatus?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isEstimated?: boolean;
  currency?: string;
}

export interface OrderResponse {
  orderId: number;
  reference?: string;
  orderDate: string;
  status: string;
  priority?: string;
  validationStatus?: string;
  shippingMethod?: string;
  shippingStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  totalAmount: number;
  customerEmail: string;
  items: OrderLineResponse[];
}

export interface OrderTrackingResponse {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  priority: string;
  globalStatus: string;
  shippingMethod?: string;
  shippingStatus?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  productionLines: Array<{
    orderLineId: number;
    bookId: number;
    bookTitle: string;
    type: string;
    quantity: number;
    productionStatus: string;
  }>;
  shippingLines: Array<{
    orderLineId: number;
    bookId: number;
    bookTitle: string;
    type: string;
    quantity: number;
    productionStatus: string;
    unitPrice: number;
    totalPrice: number;
    estimatedPrice: boolean;
  }>;
}

export interface ShippingOption {
  code: string;
  label: string;
  price: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/orders';

  async checkout(request: CheckoutOrderRequest): Promise<OrderResponse> {
    return await firstValueFrom(this.http.post<OrderResponse>(`${this.apiUrl}/checkout`, request));
  }

  async getMyOrders(): Promise<OrderResponse[]> {
    return await firstValueFrom(this.http.get<OrderResponse[]>(`${this.apiUrl}/my`));
  }

  async getOrderTracking(orderId: number): Promise<OrderTrackingResponse> {
    return await firstValueFrom(this.http.get<OrderTrackingResponse>(`${this.apiUrl}/my/${orderId}/tracking`));
  }
  async refreshOrderTracking(orderId: number): Promise<OrderTrackingResponse> {
    return await firstValueFrom(
        this.http.post<OrderTrackingResponse>(`${this.apiUrl}/my/${orderId}/tracking/refresh`, {}),
    );
  }
  async getShippingOptions(subtotal: number): Promise<ShippingOption[]> {
    return await firstValueFrom(
        this.http.get<ShippingOption[]>(`${this.apiUrl}/shipping/options`, {
          params: { subtotal: String(subtotal) },
        }),
    );
  }
  async downloadInvoice(orderId: number): Promise<Blob> {
    return await firstValueFrom(
        this.http.get(`/api/invoices/${orderId}/download`, {
          responseType: 'blob',
        }),
    );
  }
}
