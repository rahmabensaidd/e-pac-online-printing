import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import {
  AdminDashboardApiModel,
  BackofficeDashboardApiService,
} from '../core/backoffice-dashboard-api.service';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';

@Component({
  selector: 'app-backoffice-dashboard-page',
  imports: [
    RouterLink,
    BackofficeCardComponent,
    BackofficeSectionHeaderComponent,
    BackofficeStatCardComponent,
  ],
  templateUrl: './backoffice-dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeDashboardPageComponent {
  private readonly dashboardApi = inject(BackofficeDashboardApiService);
  private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  private readonly shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  readonly isLoading = signal(true);
  readonly dashboard = signal<AdminDashboardApiModel | null>(null);

  readonly readinessScore = computed(() => {
    const snapshot = this.dashboard();
    const inventoryPenalty = (snapshot?.lowStockItems ?? 0) * 6;
    const queuePenalty = ((snapshot?.pendingOrders ?? 0) + (snapshot?.rejectedOrders ?? 0)) * 5;
    const shippingPenalty = (snapshot?.cancelledOrders ?? 0) * 9;
    return Math.max(58, 96 - inventoryPenalty - queuePenalty - shippingPenalty);
  });

  readonly readinessLabel = computed(() => {
    if (this.readinessScore() >= 90) {
      return 'Stable';
    }

    if (this.readinessScore() >= 80) {
      return 'Watch';
    }

    return 'At risk';
  });

  readonly dashboardMetrics = computed(() => {
    const snapshot = this.dashboard();
    if (!snapshot) {
      return [];
    }

    return [
      {
        label: 'Open orders',
        value: `${snapshot.openOrders}`,
        change: `${snapshot.totalOrders} total`,
        hint: 'live production queue',
        icon: 'fa-layer-group',
        tone: 'positive' as const,
      },
      {
        label: 'Production value',
        value: this.formatCurrency(snapshot.productionValue),
        change: `${snapshot.processingOrders} printing`,
        hint: 'active pipeline',
        icon: 'fa-chart-line',
        tone: 'neutral' as const,
      },
      {
        label: 'Inventory alerts',
        value: `${snapshot.lowStockItems}`,
        change: snapshot.lowStockItems > 0 ? 'Needs action' : 'Healthy',
        hint: 'below target',
        icon: 'fa-boxes-stacked',
        tone: snapshot.lowStockItems > 0 ? ('warning' as const) : ('positive' as const),
      },
      {
        label: 'Team availability',
        value: `${snapshot.activeEmployees}/${snapshot.totalEmployees}`,
        change: snapshot.pendingOrders > 0 ? 'Watch queue' : 'On track',
        hint: 'backoffice operators',
        icon: 'fa-user-group',
        tone: snapshot.pendingOrders > 0 ? ('warning' as const) : ('positive' as const),
      },
    ];
  });

  readonly focusAreas = computed(() => this.dashboard()?.focusAreas ?? []);
  readonly deliveryMix = computed(() => this.dashboard()?.deliveryMix ?? []);
  readonly attentionItems = computed(() => (this.dashboard()?.attentionItems ?? []).slice(0, 3));
  readonly recentActivity = computed(() => this.dashboard()?.recentActivity ?? []);
  readonly recentOrders = computed(() => this.dashboard()?.recentOrders ?? []);

  readonly quickActions = computed<
    readonly {
      label: string;
      meta: string;
      route: string;
      icon: string;
      fragment?: string;
      queryParams?: Params;
    }[]
  >(() => [
    {
      label: 'Orders',
      meta: `${this.dashboard()?.openOrders ?? 0} active`,
      route: '/backoffice/orders',
      icon: 'fa-receipt',
    },
    {
      label: 'Inventory',
      meta:
        (this.dashboard()?.lowStockItems ?? 0) > 0
          ? `${this.dashboard()?.lowStockItems ?? 0} need attention`
          : 'All materials covered',
      route: '/backoffice/inventory',
      icon: 'fa-boxes-stacked',
    },
    {
      label: 'Team',
      meta: `${this.dashboard()?.activeEmployees ?? 0} online`,
      route: '/backoffice/users',
      icon: 'fa-user-group',
    },
    {
      label: 'Settings',
      meta: 'Workspace defaults',
      route: '/backoffice/settings',
      fragment: 'workspace-profile',
      icon: 'fa-sliders',
    },
  ]);

  constructor() {
    void this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.dashboard.set(await this.dashboardApi.getDashboard());
    } catch (error) {
      console.error('Unable to load dashboard data', error);
      this.dashboard.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  toneClass(tone: 'positive' | 'neutral' | 'warning' | 'danger'): string {
    switch (tone) {
      case 'positive':
        return 'bg-brand-teal/12 text-brand-navy';
      case 'warning':
        return 'bg-brand-orange/12 text-brand-orange';
      case 'danger':
        return 'bg-brand-pink/12 text-brand-pink';
      case 'neutral':
      default:
        return 'bg-brand-cream text-brand-navy';
    }
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized.includes('delayed') || normalized.includes('rejected') || normalized.includes('cancelled')) {
      return 'bg-brand-pink/12 text-brand-pink border-brand-pink/20';
    }

    if (normalized.includes('ready') || normalized.includes('completed') || normalized.includes('delivered')) {
      return 'bg-brand-teal/12 text-brand-navy border-brand-teal/20';
    }

    if (normalized.includes('production') || normalized.includes('ship')) {
      return 'bg-brand-orange/12 text-brand-orange border-brand-orange/20';
    }

    return 'bg-brand-cream text-brand-navy border-slate-200';
  }

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatShortDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : this.shortDateFormatter.format(date);
  }
}
