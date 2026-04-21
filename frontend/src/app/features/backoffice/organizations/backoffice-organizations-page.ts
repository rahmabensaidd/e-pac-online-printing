import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import {
  AdminOrganizationApiModel,
  AdminOrganizationStatus,
  BackofficeOrganizationsApiService,
  OrganizationVerificationTokenApiModel,
} from '../core/backoffice-organizations-api.service';

@Component({
  selector: 'app-backoffice-organizations-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    BackofficeSectionHeaderComponent,
    BackofficeCardComponent,
    BackofficeStatCardComponent,
  ],
  templateUrl: './backoffice-organizations-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeOrganizationsPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly organizationsApi = inject(BackofficeOrganizationsApiService);

  readonly loading = signal(false);
  readonly createLoading = signal(false);
  readonly tokenLoadingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly copyMessage = signal<string | null>(null);

  readonly createModalOpen = signal(false);
  readonly tokenModalOpen = signal(false);
  readonly tokenPayload = signal<OrganizationVerificationTokenApiModel | null>(null);

  readonly organizations = signal<AdminOrganizationApiModel[]>([]);

  readonly statuses: readonly AdminOrganizationStatus[] = ['ACTIVE', 'PENDING', 'INACTIVE'];

  readonly totalOrganizations = computed(() => this.organizations().length);
  readonly activeOrganizations = computed(
    () => this.organizations().filter((organization) => organization.status === 'ACTIVE').length,
  );
  readonly pendingOrganizations = computed(
    () => this.organizations().filter((organization) => organization.status === 'PENDING').length,
  );
  readonly inactiveOrganizations = computed(
    () => this.organizations().filter((organization) => organization.status === 'INACTIVE').length,
  );

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    siren: ['', [Validators.required]],
    status: ['ACTIVE' as AdminOrganizationStatus, [Validators.required]],
  });

  constructor() {
    void this.loadOrganizations();
  }

  async loadOrganizations(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.organizations.set(await this.organizationsApi.getOrganizations());
    } catch (error) {
      console.error('Unable to load organizations', error);
      this.errorMessage.set('Unable to load organizations.');
      this.organizations.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal(): void {
    this.createForm.reset({
      name: '',
      siren: '',
      status: 'ACTIVE',
    });
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  closeTokenModal(): void {
    this.tokenModalOpen.set(false);
    this.tokenPayload.set(null);
    this.copyMessage.set(null);
  }

  async createOrganization(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }

    this.createLoading.set(true);
    this.errorMessage.set(null);
    try {
      const value = this.createForm.getRawValue();
      await this.organizationsApi.createOrganization({
        name: value.name.trim(),
        siren: value.siren.trim(),
        status: value.status,
      });
      this.closeCreateModal();
      await this.loadOrganizations();
    } catch (error) {
      console.error('Unable to create organization', error);
      this.errorMessage.set('Unable to create organization. Check SIREN uniqueness and format.');
    } finally {
      this.createLoading.set(false);
    }
  }

  async generateToken(organization: AdminOrganizationApiModel): Promise<void> {
    this.tokenLoadingId.set(organization.id);
    this.errorMessage.set(null);
    try {
      const payload = await this.organizationsApi.generateVerificationToken(organization.id);
      this.tokenPayload.set(payload);
      this.copyMessage.set(null);
      this.tokenModalOpen.set(true);
    } catch (error) {
      console.error('Unable to generate verification token', error);
      this.errorMessage.set('Unable to generate verification token.');
    } finally {
      this.tokenLoadingId.set(null);
    }
  }

  async copyToken(): Promise<void> {
    const rawToken = this.tokenPayload()?.rawToken;
    if (!rawToken) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawToken);
        this.copyMessage.set('Token copied to clipboard.');
        return;
      }
      this.copyMessage.set('Clipboard unavailable. Copy token manually.');
    } catch {
      this.copyMessage.set('Unable to copy token automatically.');
    }
  }

  statusBadgeClass(status: AdminOrganizationStatus): string {
    if (status === 'ACTIVE') {
      return 'rounded-full bg-brand-teal/10 px-2.5 py-1 text-[0.68rem] font-semibold text-brand-teal';
    }
    if (status === 'PENDING') {
      return 'rounded-full bg-brand-orange/12 px-2.5 py-1 text-[0.68rem] font-semibold text-brand-orange';
    }
    return 'rounded-full bg-slate-200 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600';
  }

  isGeneratingToken(organizationId: number): boolean {
    return this.tokenLoadingId() === organizationId;
  }
}
