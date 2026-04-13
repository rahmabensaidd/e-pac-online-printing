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
}
