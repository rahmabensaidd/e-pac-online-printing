import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import {
  AdminUserApiModel,
  BackofficeUsersApiService,
} from '../core/backoffice-users-api.service';

type UserRole = 'ADMIN' | 'USER' | 'VENDOR' | 'MODERATOR';
type UserRoleFilter = 'ALL' | UserRole;

@Component({
  selector: 'app-backoffice-users-page',
  imports: [
    BackofficeSectionHeaderComponent,
    BackofficeCardComponent,
    BackofficeStatCardComponent,
    BackofficeDataTableComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './backoffice-users-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeUsersPageComponent {
  private readonly usersApi = inject(BackofficeUsersApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saveLoading = signal(false);
  readonly roleSaveLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedFilter = signal<UserRoleFilter>('ALL');

  readonly usersSignal = signal<AdminUserApiModel[]>([]);
  readonly createModalOpen = signal(false);
  readonly editModalOpen = signal(false);
  readonly roleModalOpen = signal(false);
  readonly selectedUser = signal<AdminUserApiModel | null>(null);
  readonly roleDraft = signal<UserRole>('USER');

  readonly roles: readonly UserRole[] = ['ADMIN', 'USER', 'VENDOR', 'MODERATOR'];

  readonly tableColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'username', label: 'Username', sortable: true, monospace: true },
    { key: 'name', label: 'Name', sortable: true, secondaryKey: 'email' },
    { key: 'role', label: 'Role', type: 'priority', sortable: true },
    { key: 'totalOrders', label: 'Total orders', type: 'numeric', sortable: true, align: 'right' },
  ];

  readonly tableActions: readonly BackofficeDataTableAction[] = [
    { id: 'edit', label: 'Edit user', icon: 'fa-pen' },
    { id: 'role', label: 'Assign role', icon: 'fa-user-shield' },
    { id: 'orders', label: 'View orders', icon: 'fa-receipt' },
  ];

  readonly filteredUsers = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'ALL') {
      return this.usersSignal();
    }
    return this.usersSignal().filter((user) => (user.role || 'USER').toUpperCase() === filter);
  });

  readonly tableRows = computed(() =>
    this.filteredUsers().map((user) => ({
      id: String(user.userId),
      username: user.username,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: (user.role || 'USER').toUpperCase(),
      totalOrders: user.totalOrders ?? 0,
    })),
  );

  readonly totalUsers = computed(() => this.usersSignal().length);
  readonly adminUsers = computed(
    () => this.usersSignal().filter((user) => (user.role || '').toUpperCase() === 'ADMIN').length,
  );
  readonly usersWithOrders = computed(() => this.usersSignal().filter((user) => (user.totalOrders ?? 0) > 0).length);
  readonly allOrders = computed(() => this.usersSignal().reduce((sum, user) => sum + (user.totalOrders ?? 0), 0));

  readonly createForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['USER' as UserRole, [Validators.required]],
  });

  readonly editForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
  });

  constructor() {
    void this.loadUsers();
  }

  setFilter(filter: UserRoleFilter): void {
    this.selectedFilter.set(filter);
  }

  filterButtonClass(filter: UserRoleFilter): string {
    return this.selectedFilter() === filter
      ? 'admin-focus-ring inline-flex items-center rounded-full bg-brand-navy px-3 py-1.5 text-[0.78rem] font-semibold text-white'
      : 'admin-focus-ring inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-600 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy';
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.usersSignal.set(await this.usersApi.getUsers());
    } catch (error) {
      console.error('Unable to fetch admin users', error);
      this.errorMessage.set('Unable to load users.');
      this.usersSignal.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal(): void {
    this.createForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      role: 'USER',
    });
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  openEditModal(user: AdminUserApiModel): void {
    this.selectedUser.set(user);
    this.editForm.reset({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      username: user.username || '',
    });
    this.editModalOpen.set(true);
  }

  closeEditModal(): void {
    this.editModalOpen.set(false);
    this.selectedUser.set(null);
  }

  openRoleModal(user: AdminUserApiModel): void {
    this.selectedUser.set(user);
    this.roleDraft.set(this.normalizeRole(user.role));
    this.roleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.roleModalOpen.set(false);
    this.selectedUser.set(null);
  }

  onRoleDraftChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    this.roleDraft.set(this.normalizeRole(target.value));
  }

  async saveCreate(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }

    this.saveLoading.set(true);
    this.errorMessage.set(null);
    try {
      const value = this.createForm.getRawValue();
      await this.usersApi.createUser({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim().toLowerCase(),
        username: value.username.trim(),
        password: value.password,
        role: this.normalizeRole(value.role),
      });
      this.closeCreateModal();
      await this.loadUsers();
    } catch (error) {
      console.error('Unable to create user', error);
      this.errorMessage.set('Unable to create user. Check duplicate email/username.');
    } finally {
      this.saveLoading.set(false);
    }
  }

  async saveEdit(): Promise<void> {
    this.editForm.markAllAsTouched();
    const user = this.selectedUser();
    if (!user || this.editForm.invalid) {
      return;
    }

    this.saveLoading.set(true);
    this.errorMessage.set(null);
    try {
      const value = this.editForm.getRawValue();
      await this.usersApi.updateUser(user.userId, {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim().toLowerCase(),
        username: value.username.trim(),
      });
      this.closeEditModal();
      await this.loadUsers();
    } catch (error) {
      console.error('Unable to update user', error);
      this.errorMessage.set('Unable to update user.');
    } finally {
      this.saveLoading.set(false);
    }
  }

  async saveRole(): Promise<void> {
    const user = this.selectedUser();
    if (!user) {
      return;
    }
    this.roleSaveLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.usersApi.updateRole(user.userId, this.roleDraft());
      this.closeRoleModal();
      await this.loadUsers();
    } catch (error) {
      console.error('Unable to update role', error);
      this.errorMessage.set('Unable to assign role.');
    } finally {
      this.roleSaveLoading.set(false);
    }
  }

  async onRowAction(event: BackofficeDataTableRowActionEvent): Promise<void> {
    const user = this.usersSignal().find((candidate) => String(candidate.userId) === event.rowId);
    if (!user) return;

    if (event.actionId === 'edit') {
      this.openEditModal(user);
      return;
    }
    if (event.actionId === 'role') {
      this.openRoleModal(user);
      return;
    }
    if (event.actionId === 'orders') {
      await this.router.navigate(['/backoffice/users', user.userId, 'orders']);
    }
  }

  private normalizeRole(role: string | null | undefined): UserRole {
    const value = (role || 'USER').trim().toUpperCase();
    if (value === 'ADMIN') return 'ADMIN';
    if (value === 'VENDOR') return 'VENDOR';
    if (value === 'MODERATOR') return 'MODERATOR';
    return 'USER';
  }
}
