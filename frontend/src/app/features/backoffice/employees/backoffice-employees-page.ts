import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';
import { BackofficeStatCardComponent } from '../shared/backoffice-stat-card';

@Component({
  selector: 'app-backoffice-employees-page',
  imports: [BackofficeCardComponent, BackofficeSectionHeaderComponent, BackofficeStatCardComponent],
  templateUrl: './backoffice-employees-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeEmployeesPageComponent {
  readonly backofficeData = inject(BackofficeDataService);

  readonly averageWorkload = computed(() => {
    const total = this.backofficeData.employees().reduce(
      (sum, employee) => sum + employee.workloadPercent,
      0,
    );
    return Math.round(total / this.backofficeData.employees().length);
  });
  readonly reviewingCount = computed(() =>
    this.backofficeData.employees().filter((employee) => employee.state === 'Reviewing').length,
  );
  readonly remoteCount = computed(() =>
    this.backofficeData.employees().filter((employee) => employee.state === 'Remote').length,
  );

  stateClass(state: string): string {
    const normalized = state.toLowerCase();

    if (normalized.includes('remote')) {
      return 'bg-brand-teal/12 text-brand-navy';
    }

    if (normalized.includes('review')) {
      return 'bg-brand-orange/12 text-brand-orange';
    }

    if (normalized.includes('offline')) {
      return 'bg-slate-100 text-slate-500';
    }

    return 'bg-brand-cream text-brand-navy';
  }
}
