import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';
import {
  AdminOrganizationClientTrendsApiModel,
  BackofficeOrganizationsApiService,
} from '../core/backoffice-organizations-api.service';

@Component({
  selector: 'app-backoffice-organization-client-trends-page',
  imports: [
    DatePipe,
    BackofficeSectionHeaderComponent,
    BackofficeCardComponent,
    BackofficeStatCardComponent,
  ],
  templateUrl: './backoffice-organization-client-trends-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BackofficeOrganizationClientTrendsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organizationsApi = inject(BackofficeOrganizationsApiService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly details = signal<AdminOrganizationClientTrendsApiModel | null>(null);

  readonly overviewStats = computed(() => {
    const features = this.details()?.features;
    return [
      {
        label: 'Historical orders',
        value: this.formatInteger(features?.clientNbOrders),
        change: 'Order base',
        hint: 'used for trend calculation',
        icon: 'fa-box-open',
        tone: 'neutral' as const,
      },
      {
        label: 'Average price HT',
        value: this.formatCurrency(features?.clientAvgPriceHt),
        change: 'Average',
        hint: 'historical pricing',
        icon: 'fa-sack-dollar',
        tone: 'positive' as const,
      },
      {
        label: 'Average quantity',
        value: this.formatInteger(features?.clientAvgQuantity),
        change: 'Typical volume',
        hint: 'per order',
        icon: 'fa-layer-group',
        tone: 'warning' as const,
      },
      {
        label: 'Elasticity',
        value: this.formatDecimal(features?.clientPriceElasticity),
        change: features?.elasticityStatus || 'Status',
        hint: 'price sensitivity',
        icon: 'fa-chart-line',
        tone: 'neutral' as const,
      },
    ];
  });

  readonly featureItems = computed(() => {
    const features = this.details()?.features;
    if (!features) {
      return [];
    }

    return [
      { label: 'SIREN', value: features.siren || 'N/A' },
      { label: 'First order', value: this.formatDate(features.clientFirstOrder) },
      { label: 'Last order', value: this.formatDate(features.clientLastOrder) },
      { label: 'Seniority', value: `${this.formatDecimal(features.clientSeniorityYears)} years` },
      { label: 'Price standard deviation', value: this.formatCurrency(features.clientPriceStdHt) },
      { label: 'Price volatility', value: this.formatCurrency(features.clientPriceVolatility) },
      { label: 'Relative price', value: this.formatDecimal(features.clientRelativePrice) },
      { label: 'Elasticity status', value: features.elasticityStatus || 'N/A' },
    ];
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const organizationId = Number(this.route.snapshot.paramMap.get('organizationId'));
      if (!Number.isFinite(organizationId)) {
        throw new Error('Invalid organization id');
      }

      this.details.set(await this.organizationsApi.getClientTrends(organizationId));
    } catch (error) {
      console.error('Unable to load client trends', error);
      this.errorMessage.set('Unable to load client trends for this organization.');
      this.details.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async goBack(): Promise<void> {
    await this.router.navigate(['/backoffice/organizations']);
  }

  private formatCurrency(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'N/A';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatDecimal(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'N/A';
    }

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatInteger(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'N/A';
    }

    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDate(value: string | null | undefined): string {
    return value || 'N/A';
  }
}
