import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AdminUserApiModel {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  totalOrders: number;
}

export interface AdminUserCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

export interface AdminUserUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

export interface AdminUserOrderSummaryApiModel {
  orderId: number;
  reference: string;
  orderDate: string;
  status: string;
  priority: string;
  totalAmount: number;
  items: number;
}

export interface AdminUserOrdersDetailsApiModel {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  totalOrders: number;
  orders: AdminUserOrderSummaryApiModel[];
}

@Injectable({ providedIn: 'root' })
export class BackofficeUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/admin/users';

  async getUsers(): Promise<AdminUserApiModel[]> {
    return await firstValueFrom(this.http.get<AdminUserApiModel[]>(this.apiUrl));
  }

  async createUser(payload: AdminUserCreateRequest): Promise<AdminUserApiModel> {
    return await firstValueFrom(this.http.post<AdminUserApiModel>(this.apiUrl, payload));
  }

  async updateUser(userId: number, payload: AdminUserUpdateRequest): Promise<AdminUserApiModel> {
    return await firstValueFrom(this.http.put<AdminUserApiModel>(`${this.apiUrl}/${userId}`, payload));
  }

  async updateRole(userId: number, role: string): Promise<AdminUserApiModel> {
    return await firstValueFrom(
      this.http.put<AdminUserApiModel>(`${this.apiUrl}/${userId}/role`, { role }),
    );
  }

  async getUserOrders(userId: number): Promise<AdminUserOrdersDetailsApiModel> {
    return await firstValueFrom(
      this.http.get<AdminUserOrdersDetailsApiModel>(`${this.apiUrl}/${userId}/orders`),
    );
  }
}
