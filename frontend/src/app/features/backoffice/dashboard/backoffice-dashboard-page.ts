import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { BackofficeDataService } from '../core/backoffice.data.service';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  private readonly shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  readonly backofficeData = inject(BackofficeDataService);
  readonly isLoading = signal(true);

  readonly readinessScore = computed(() => {
    const inventoryPenalty = this.backofficeData.lowStockItems() * 6;
    const delayPenalty = this.backofficeData.delayedOrders() * 9;
    return Math.max(58, 96 - inventoryPenalty - delayPenalty);
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

  readonly focusAreas = computed(() => [
    {
      label: 'Prepress',
      value: `${this.backofficeData.orders().filter((order) => order.status === 'Prepress').length} jobs`,
      hint: 'Pending approval',
    },
    {
      label: 'Ready to ship',
      value: `${this.backofficeData.orders().filter((order) => order.status === 'Ready to Ship').length} jobs`,
      hint: 'Can move today',
    },
    {
      label: 'Live operators',
      value: `${this.backofficeData.activeEmployees()}`,
      hint: 'Across ops and support',
    },
  ]);

  readonly deliveryMix = computed(() => [
    {
      label: 'Express',
      value: this.backofficeData.orders().filter((order) => order.shippingMethod === 'Express').length,
    },
    {
      label: 'Standard',
      value: this.backofficeData.orders().filter((order) => order.shippingMethod === 'Standard').length,
    },
    {
      label: 'Pickup',
      value: this.backofficeData.orders().filter((order) => order.shippingMethod === 'Pickup').length,
    },
  ]);

  readonly attentionItems = computed(() => this.backofficeData.attentionItems().slice(0, 3));

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
      meta: `${this.backofficeData.activeOrders()} active`,
      route: '/backoffice/orders',
      icon: 'fa-receipt',
    },
    {
      label: 'Inventory',
      meta:
        this.backofficeData.lowStockItems() > 0
          ? `${this.backofficeData.lowStockItems()} need attention`
          : 'All materials covered',
      route: '/backoffice/inventory',
      icon: 'fa-boxes-stacked',
    },
    {
      label: 'Team',
      meta: `${this.backofficeData.activeEmployees()} on shift`,
      route: '/backoffice/employees',
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
    const timer = setTimeout(() => this.isLoading.set(false), 420);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
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

    if (normalized.includes('delayed')) {
      return 'bg-brand-pink/12 text-brand-pink border-brand-pink/20';
    }

    if (normalized.includes('ready') || normalized.includes('completed')) {
      return 'bg-brand-teal/12 text-brand-navy border-brand-teal/20';
    }

    if (normalized.includes('prepress') || normalized.includes('production')) {
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
