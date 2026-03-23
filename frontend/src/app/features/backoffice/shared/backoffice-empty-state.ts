import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-backoffice-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-[1rem] border border-dashed border-slate-300/80 bg-white/70 px-4 py-6 text-center"
    >
      <div
        class="mx-auto grid h-10 w-10 place-items-center rounded-[0.9rem] bg-brand-cream text-sm text-brand-navy"
      >
        <i class="fas" [class]="icon()"></i>
      </div>

      <h3 class="mt-3 text-[0.95rem] font-semibold text-brand-navy">{{ title() }}</h3>
      <p class="mx-auto mt-1.5 max-w-lg text-[0.8125rem] leading-6 text-slate-500">
        {{ description() }}
      </p>

      @if (actionLabel()) {
        <button
          type="button"
          class="admin-focus-ring admin-btn-primary mt-4"
          (click)="action.emit()"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class BackofficeEmptyStateComponent {
  readonly icon = input('fa-box-open');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input('');

  readonly action = output<void>();
}
