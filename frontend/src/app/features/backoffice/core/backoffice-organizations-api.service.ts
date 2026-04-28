import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type AdminOrganizationStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface AdminOrganizationApiModel {
  id: number;
  name: string;
  siren: string;
  status: AdminOrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrganizationCreateRequest {
  name: string;
  siren: string;
  status: AdminOrganizationStatus;
}

export interface OrganizationVerificationTokenApiModel {
  organizationId: number;
  organizationName: string;
  siren: string;
  rawToken: string;
  expiresAt: string;
}

export interface AdminOrganizationClientFeaturesApiModel {
  siren: string;
  clientNbOrders: number | null;
  clientAvgPriceHt: number | null;
  clientPriceStdHt: number | null;
  clientAvgQuantity: number | null;
  clientPriceVolatility: number | null;
  clientRelativePrice: number | null;
  clientFirstOrder: string | null;
  clientLastOrder: string | null;
  clientSeniorityYears: number | null;
  clientRecencyDays: number | null;
  clientPriceElasticity: number | null;
  elasticityStatus: string | null;
}

export interface AdminOrganizationClientTrendsApiModel {
  organizationId: number;
  organizationName: string;
  siren: string;
  found: boolean;
  note: string;
  features: AdminOrganizationClientFeaturesApiModel | null;
}

@Injectable({ providedIn: 'root' })
export class BackofficeOrganizationsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/admin/organizations';

  async getOrganizations(): Promise<AdminOrganizationApiModel[]> {
    return await firstValueFrom(this.http.get<AdminOrganizationApiModel[]>(this.apiUrl));
  }

  async createOrganization(payload: AdminOrganizationCreateRequest): Promise<AdminOrganizationApiModel> {
    return await firstValueFrom(this.http.post<AdminOrganizationApiModel>(this.apiUrl, payload));
  }

  async generateVerificationToken(
    organizationId: number,
  ): Promise<OrganizationVerificationTokenApiModel> {
    return await firstValueFrom(
      this.http.post<OrganizationVerificationTokenApiModel>(
        `${this.apiUrl}/${organizationId}/verification-token`,
        {},
      ),
    );
  }

  async getClientTrends(organizationId: number): Promise<AdminOrganizationClientTrendsApiModel> {
    return await firstValueFrom(
      this.http.get<AdminOrganizationClientTrendsApiModel>(`${this.apiUrl}/${organizationId}/client-trends`),
    );
  }

  async deleteOrganization(organizationId: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${organizationId}`));
  }
}
