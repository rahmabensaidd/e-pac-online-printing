import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  username: string | null;
  phone: string | null;
  company: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  registrationDate: string | null;
  totalOrders: number;
  lastOrderDate: string | null;
}

export interface UpdateUserProfileRequest {
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/user/profile';

  async getProfile(): Promise<UserProfile> {
    return await firstValueFrom(this.http.get<UserProfile>(this.apiUrl));
  }

  async updateProfile(request: UpdateUserProfileRequest): Promise<UserProfile> {
    return await firstValueFrom(this.http.put<UserProfile>(this.apiUrl, request));
  }
}
