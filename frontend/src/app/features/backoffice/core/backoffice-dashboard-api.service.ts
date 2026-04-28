import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AdminDashboardFocusAreaApiModel {
  label: string;
  value: string;
  hint: string;
}

export interface AdminDashboardDeliveryLaneApiModel {
  label: string;
  value: number;
}

export interface AdminDashboardAlertApiModel {
  id: string;
  title: string;
  description: string;
  route: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
}

export interface AdminDashboardActivityApiModel {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  route: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
  icon: string;
}

export interface AdminDashboardRecentOrderApiModel {
  orderId: number;
  reference: string;
  customerName: string;
  companyName?: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: string;
  assignee?: string;
  items: number;
  shippingMethod: string;
}

export interface AdminDashboardApiModel {
  totalOrders: number;
  openOrders: number;
  pendingOrders: number;
  processingOrders: number;
  readyToShipOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  productionValue: number;
  lowStockItems: number;
  activeEmployees: number;
  totalEmployees: number;
  focusAreas: AdminDashboardFocusAreaApiModel[];
  deliveryMix: AdminDashboardDeliveryLaneApiModel[];
  attentionItems: AdminDashboardAlertApiModel[];
  recentActivity: AdminDashboardActivityApiModel[];
  recentOrders: AdminDashboardRecentOrderApiModel[];
}

@Injectable({ providedIn: 'root' })
export class BackofficeDashboardApiService {
  private readonly http = inject(HttpClient);

  async getDashboard(): Promise<AdminDashboardApiModel> {
    return await firstValueFrom(this.http.get<AdminDashboardApiModel>('/api/admin/dashboard'));
  }
}
