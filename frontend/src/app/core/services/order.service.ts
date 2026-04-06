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
  notes: string;
  shippingMethod: string;
  paymentMethod: string;
}

export interface OrderLineResponse {
  orderLineId: number;
  bookId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderResponse {
  orderId: number;
  orderDate: string;
  status: string;
  totalAmount: number;
  customerEmail: string;
  items: OrderLineResponse[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/orders';

  async checkout(request: CheckoutOrderRequest): Promise<OrderResponse> {
    return await firstValueFrom(this.http.post<OrderResponse>(`${this.apiUrl}/checkout`, request));
  }
}
