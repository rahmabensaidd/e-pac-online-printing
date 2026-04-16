import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface JwtClaims {
  exp?: number;
  sub?: string;
  user_id?: number | string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
  user_type?: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  role: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

export interface OrganizationSignupRequest {
  email: string;
  password: string;
  organizationName: string;
  siren: string;
  verificationToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly accessTokenKey = 'epac_access_token';

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly profileSignal = signal<JwtClaims | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  readonly isAuthenticated = computed(() => {
    const token = this.accessTokenSignal();
    const profile = this.profileSignal();
    if (!token || !profile?.exp) {
      return false;
    }
    return profile.exp * 1000 > Date.now();
  });
  getUserSiren():string{
    return '';
  }
  readonly userEmail = computed(
    () => this.profileSignal()?.email ?? this.profileSignal()?.preferred_username ?? null,
  );

  readonly userDisplayName = computed(() => {
    const profile = this.profileSignal();
    const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ').trim();
    return fullName || profile?.preferred_username || profile?.email || null;
  });

  readonly userRoles = computed(() => this.profileSignal()?.roles ?? []);
  readonly userType = computed(() => this.profileSignal()?.user_type ?? 'simple');
  readonly userId = computed(() => {
    const value = this.profileSignal()?.user_id;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const accessToken =
      window.localStorage.getItem(this.accessTokenKey) ||
      window.sessionStorage.getItem(this.accessTokenKey);

    if (accessToken) {
      this.accessTokenSignal.set(accessToken);
      this.profileSignal.set(this.decodeJwt(accessToken));
    }

    if (this.accessTokenSignal() && !this.isAuthenticated()) {
      this.clearSession();
    }
  }

  async login(identifier: string, password: string, remember = true): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorMessageSignal.set(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const rawBody = await response.text();
        const message = this.parseErrorMessage(rawBody, 'Invalid credentials');
        throw new Error(message);
      }

      const payload = (await response.json()) as LoginResponse;
      this.persistToken(payload.accessToken, remember);
    } catch (error) {
      this.errorMessageSignal.set(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signup(payload: SignupRequest): Promise<void> {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return;
    }

    const rawBody = await response.text();
    const message = this.parseErrorMessage(rawBody, 'Unable to create account');
    throw new Error(message);
  }

  async signupOrganization(payload: OrganizationSignupRequest): Promise<void> {
    const response = await fetch('/api/auth/register-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return;
    }

    const rawBody = await response.text();
    const message = this.parseErrorMessage(rawBody, 'Unable to create organization account');
    throw new Error(message);
  }

  logout(): void {
    this.clearSession();
  }

  getBearerToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    const token = this.accessTokenSignal();
    return token ? `Bearer ${token}` : null;
  }

  hasRole(role: string): boolean {
    const target = role.trim().toLowerCase();
    return this.userRoles().some((candidate) => candidate.toLowerCase() === target);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isUser(): boolean {
    return this.hasRole('user') || this.hasRole('organization') || this.userType().toLowerCase() === 'organization';
  }
  isOrganization(): boolean {
    return this.hasRole('organization') ;
  }

  private persistToken(accessToken: string, remember: boolean): void {
    const storage = remember ? window.localStorage : window.sessionStorage;
    const otherStorage = remember ? window.sessionStorage : window.localStorage;

    otherStorage.removeItem(this.accessTokenKey);
    storage.setItem(this.accessTokenKey, accessToken);

    this.accessTokenSignal.set(accessToken);
    this.profileSignal.set(this.decodeJwt(accessToken));
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.removeItem(this.accessTokenKey);
      window.sessionStorage.removeItem(this.accessTokenKey);
    }

    this.accessTokenSignal.set(null);
    this.profileSignal.set(null);
    this.errorMessageSignal.set(null);
  }

  private decodeJwt(token: string): JwtClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      if (!payload) {
        return null;
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(normalized)
          .split('')
          .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      return JSON.parse(decoded) as JwtClaims;
    } catch {
      return null;
    }
  }

  private parseErrorMessage(rawBody: string, fallback: string): string {
    try {
      const parsed = JSON.parse(rawBody) as {
        message?: string;
        error?: string;
        detail?: string;
        title?: string;
      };
      return parsed.message || parsed.detail || parsed.error || parsed.title || fallback;
    } catch {
      return rawBody.trim().length > 0 ? rawBody : fallback;
    }
  }
}
