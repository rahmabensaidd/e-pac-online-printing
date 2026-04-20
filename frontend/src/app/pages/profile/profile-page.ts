import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService, UpdateUserProfileRequest, UserProfile } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  private readonly profileApi = inject(ProfileService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly profile = signal<UserProfile | null>(null);

  readonly form = signal<UpdateUserProfileRequest>({
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  readonly profileName = computed(() => this.profile()?.fullName || this.profile()?.email || 'My account');
  readonly quickStats = computed(() => {
    const profile = this.profile();
    return {
      totalOrders: profile?.totalOrders ?? 0,
      lastOrderDate: profile?.lastOrderDate ?? null,
      memberSince: profile?.registrationDate ?? null,
    };
  });

  constructor() {
    void this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const profile = await this.profileApi.getProfile();
      this.profile.set(profile);
      this.form.set({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        company: profile.company ?? '',
        addressLine1: profile.addressLine1 ?? '',
        addressLine2: profile.addressLine2 ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        postalCode: profile.postalCode ?? '',
        country: profile.country ?? '',
      });
    } catch (error) {
      console.error('Unable to load profile', error);
      this.error.set('Unable to load your profile right now.');
    } finally {
      this.loading.set(false);
    }
  }

  updateField<K extends keyof UpdateUserProfileRequest>(field: K, value: UpdateUserProfileRequest[K]): void {
    this.form.update((current) => ({ ...current, [field]: value }));
    this.success.set(null);
  }

  async saveProfile(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const updated = await this.profileApi.updateProfile(this.form());
      this.profile.set(updated);
      this.form.set({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
        company: updated.company ?? '',
        addressLine1: updated.addressLine1 ?? '',
        addressLine2: updated.addressLine2 ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
        postalCode: updated.postalCode ?? '',
        country: updated.country ?? '',
      });
      this.success.set('Profile updated successfully.');
    } catch (error) {
      console.error('Unable to update profile', error);
      this.error.set('Unable to save your profile right now.');
    } finally {
      this.saving.set(false);
    }
  }
}
