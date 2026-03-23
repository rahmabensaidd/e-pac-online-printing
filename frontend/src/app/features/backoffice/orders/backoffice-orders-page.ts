import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { OrderPriority, OrderStatus, PaymentStatus } from '../core/backoffice.models';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeDataTableComponent } from '../shared/backoffice-data-table';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn,
  BackofficeDataTableEmptyState,
  BackofficeDataTableRow,
  BackofficeDataTableRowActionEvent,
} from '../shared/backoffice-data-table.models';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';

type OrderFilter = 'All' | OrderStatus;
type OrderFormField =
  | 'reference'
  | 'customerName'
  | 'companyName'
  | 'channel'
  | 'submittedAt'
  | 'dueDate'
  | 'total'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'items'
  | 'shippingMethod'
  | 'paymentStatus';

interface OrderTableRow extends BackofficeDataTableRow {
  reference: string;
  customerName: string;
  companyName: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatus;
  priority: OrderPriority;
  assignee: string;
  items: number;
  paymentStatus: PaymentStatus;
}

@Component({
  selector: 'app-backoffice-orders-page',
  imports: [
    ReactiveFormsModule,
    BackofficeCardComponent,
    BackofficeDataTableComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
  ],
  templateUrl: './backoffice-orders-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeOrdersPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly backofficeData = inject(BackofficeDataService);
  readonly isLoading = signal(true);
  readonly selectedFilter = signal<OrderFilter>('All');
  readonly drawerOpen = signal(false);
  readonly editingOrderId = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly statusFilters: readonly OrderFilter[] = [
    'All',
    'Pending Review',
    'Prepress',
    'In Production',
    'Ready to Ship',
    'Delayed',
    'Completed',
  ];
  readonly priorityOptions: readonly OrderPriority[] = ['Low', 'Normal', 'High', 'Critical'];
  readonly paymentOptions: readonly PaymentStatus[] = ['Pending', 'Partial', 'Paid'];
  readonly shippingOptions = ['Express', 'Standard', 'Pickup'];
  readonly channelOptions = ['B2B Portal', 'Marketplace', 'Sales Assisted', 'Account Manager'];

  readonly orderColumns: readonly BackofficeDataTableColumn[] = [
    { key: 'reference', label: 'Reference', sortable: true, monospace: true },
    { key: 'customerName', label: 'Customer', sortable: true, secondaryKey: 'companyName' },
    { key: 'submittedAt', label: 'Submitted', type: 'date', sortable: true },
    { key: 'dueDate', label: 'Due date', type: 'date', sortable: true },
    { key: 'total', label: 'Total', type: 'currency', sortable: true, align: 'right' },
    { key: 'status', label: 'Status', type: 'status', sortable: true },
    { key: 'priority', label: 'Priority', type: 'priority', sortable: true },
    { key: 'assignee', label: 'Owner', sortable: true },
  ];
  readonly orderActions: readonly BackofficeDataTableAction[] = [
    { id: 'edit', label: 'Edit order', icon: 'fa-pen-to-square' },
    { id: 'delete', label: 'Delete order', icon: 'fa-trash', tone: 'danger' },
  ];
  readonly emptyState: BackofficeDataTableEmptyState = {
    icon: 'fa-inbox',
    title: 'No orders match this view',
    description: 'Adjust the status filter or create a new production order to populate the queue.',
    actionLabel: 'Create order',
  };

  readonly form = this.fb.group({
    reference: ['', [Validators.required, Validators.minLength(8)]],
    customerName: ['', [Validators.required]],
    companyName: ['', [Validators.required]],
    channel: ['B2B Portal', [Validators.required]],
    submittedAt: [this.todayIso(), [Validators.required]],
    dueDate: [this.datePlusDays(5), [Validators.required]],
    total: [520, [Validators.required, Validators.min(50)]],
    status: ['Pending Review' as OrderStatus, [Validators.required]],
    priority: ['Normal' as OrderPriority, [Validators.required]],
    assignee: ['', [Validators.required]],
    items: [1, [Validators.required, Validators.min(1)]],
    shippingMethod: ['Express', [Validators.required]],
    paymentStatus: ['Pending' as PaymentStatus, [Validators.required]],
    notes: [''],
  });

  readonly assigneeOptions = computed(() =>
    this.backofficeData.employees().map((employee) => employee.name),
  );
  readonly filteredOrders = computed(() => {
    const filter = this.selectedFilter();
    const orders = this.backofficeData.orders();

    if (filter === 'All') {
      return orders;
    }

    return orders.filter((order) => order.status === filter);
  });
  readonly tableRows = computed<OrderTableRow[]>(() =>
    this.filteredOrders().map((order) => ({
      id: order.id,
      reference: order.reference,
      customerName: order.customerName,
      companyName: order.companyName,
      submittedAt: order.submittedAt,
      dueDate: order.dueDate,
      total: order.total,
      status: order.status,
      priority: order.priority,
      assignee: order.assignee,
      items: order.items,
      paymentStatus: order.paymentStatus,
    })),
  );
  readonly productionValue = computed(() =>
    this.filteredOrders().reduce((total, order) => total + order.total, 0),
  );
  readonly delayedCount = computed(
    () => this.filteredOrders().filter((order) => order.status === 'Delayed').length,
  );
  readonly readyToShipCount = computed(
    () => this.filteredOrders().filter((order) => order.status === 'Ready to Ship').length,
  );
  readonly currentEditingOrder = computed(
    () => this.backofficeData.orders().find((order) => order.id === this.editingOrderId()) ?? null,
  );

  constructor() {
    const timer = setTimeout(() => this.isLoading.set(false), 520);
    this.destroyRef.onDestroy(() => clearTimeout(timer));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const mode = params.get('mode');
      const orderId = params.get('orderId');

      if (mode === 'new') {
        this.openCreateDrawer(false);
        return;
      }

      if (mode === 'edit' && orderId) {
        this.openEditDrawer(orderId, false);
        return;
      }

      if (this.drawerOpen()) {
        this.drawerOpen.set(false);
        this.editingOrderId.set(null);
      }
    });
  }

  setFilter(filter: OrderFilter): void {
    this.selectedFilter.set(filter);
  }

  filterButtonClass(filter: OrderFilter): string {
    return this.selectedFilter() === filter
      ? 'admin-focus-ring inline-flex items-center rounded-full bg-brand-navy px-3 py-1.5 text-[0.78rem] font-semibold text-white'
      : 'admin-focus-ring inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-600 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy';
  }

  openCreateDrawer(syncQuery = true): void {
    this.drawerOpen.set(true);
    this.editingOrderId.set(null);
    this.submitted.set(false);
    this.form.reset({
      reference: `ORD-26-${String(this.backofficeData.orders().length + 1044)}`,
      customerName: '',
      companyName: '',
      channel: 'B2B Portal',
      submittedAt: this.todayIso(),
      dueDate: this.datePlusDays(this.backofficeData.settings().defaultDueWindowDays),
      total: 520,
      status: 'Pending Review',
      priority: 'Normal',
      assignee: this.assigneeOptions()[0] ?? '',
      items: 1,
      shippingMethod: 'Express',
      paymentStatus: 'Pending',
      notes: '',
    });

    if (syncQuery) {
      this.updateQuery('new');
    }
  }

  openEditDrawer(id: string, syncQuery = true): void {
    const order = this.backofficeData.orders().find((candidate) => candidate.id === id);

    if (!order) {
      return;
    }

    this.drawerOpen.set(true);
    this.editingOrderId.set(id);
    this.submitted.set(false);
    this.form.reset({
      reference: order.reference,
      customerName: order.customerName,
      companyName: order.companyName,
      channel: order.channel,
      submittedAt: order.submittedAt,
      dueDate: order.dueDate,
      total: order.total,
      status: order.status,
      priority: order.priority,
      assignee: order.assignee,
      items: order.items,
      shippingMethod: order.shippingMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
    });

    if (syncQuery) {
      this.updateQuery('edit', id);
    }
  }

  closeDrawer(syncQuery = true): void {
    this.drawerOpen.set(false);
    this.editingOrderId.set(null);
    this.submitted.set(false);

    if (syncQuery) {
      this.updateQuery(null);
    }
  }

  handleRowAction(event: BackofficeDataTableRowActionEvent): void {
    if (event.actionId === 'edit') {
      this.openEditDrawer(event.rowId);
      return;
    }

    this.backofficeData.deleteOrder(event.rowId);

    if (this.editingOrderId() === event.rowId) {
      this.closeDrawer();
    }
  }

  showError(field: OrderFormField): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.invalid;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const draft = this.form.getRawValue();

    if (this.editingOrderId()) {
      this.backofficeData.updateOrder(this.editingOrderId()!, draft);
    } else {
      this.backofficeData.createOrder(draft);
    }

    this.closeDrawer();
  }

  private updateQuery(mode: 'new' | 'edit' | null, orderId?: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mode,
        orderId: mode === 'edit' ? orderId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private datePlusDays(days: number): string {
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  }
}
