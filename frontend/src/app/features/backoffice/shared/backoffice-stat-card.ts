import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BackofficeTone } from '../core/backoffice.models';

@Component({
  selector: 'app-backoffice-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <article [class]="containerClass()">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-[0.76rem] font-medium text-slate-500">{{ label() }}</p>
          <p class="mt-2 text-[1.45rem] font-semibold leading-none tracking-tight text-brand-navy">
            {{ value() }}
          </p>
        </div>

        <div [class]="iconClass()">
          <i class="fas" [class]="icon()"></i>
        </div>
      </div>

      @if (change() || hint()) {
        <div class="mt-4 flex flex-wrap items-center gap-2">
          @if (change()) {
            <span [class]="badgeClass()">{{ change() }}</span>
          }
          @if (hint()) {
            <p class="text-[0.72rem] text-slate-400">{{ hint() }}</p>
          }
        </div>
      }
    </article>
  `,
})
export class BackofficeStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly change = input('');
  readonly hint = input('');
  readonly icon = input('fa-chart-line');
  readonly tone = input<BackofficeTone>('neutral');

  readonly containerClass = computed(
    () =>
      'admin-panel rounded-[1rem] p-4 transition duration-200 hover:border-slate-300/70',
  );
  readonly iconClass = computed(() => {
    switch (this.tone()) {
      case 'positive':
        return 'grid h-9 w-9 place-items-center rounded-[0.9rem] bg-brand-teal/12 text-brand-teal';
      case 'warning':
        return 'grid h-9 w-9 place-items-center rounded-[0.9rem] bg-brand-orange/12 text-brand-orange';
      case 'danger':
        return 'grid h-9 w-9 place-items-center rounded-[0.9rem] bg-brand-pink/12 text-brand-pink';
      case 'neutral':
      default:
        return 'grid h-9 w-9 place-items-center rounded-[0.9rem] bg-brand-navy/[0.08] text-brand-navy';
    }
  });
  readonly badgeClass = computed(() => {
    switch (this.tone()) {
      case 'positive':
        return 'rounded-full bg-brand-teal/12 px-2 py-1 text-[0.7rem] font-semibold text-brand-navy';
      case 'warning':
        return 'rounded-full bg-brand-orange/12 px-2 py-1 text-[0.7rem] font-semibold text-brand-orange';
      case 'danger':
        return 'rounded-full bg-brand-pink/12 px-2 py-1 text-[0.7rem] font-semibold text-brand-pink';
      case 'neutral':
      default:
        return 'rounded-full bg-brand-cream px-2 py-1 text-[0.7rem] font-semibold text-brand-navy';
    }
  });
}
