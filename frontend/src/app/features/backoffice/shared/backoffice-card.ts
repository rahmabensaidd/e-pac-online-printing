import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-backoffice-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <section [class]="cardClass()">
      @if (hasHeader()) {
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            @if (eyebrow()) {
              <p class="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {{ eyebrow() }}
              </p>
            }
            @if (title()) {
              <h2 class="text-[0.95rem] font-semibold tracking-tight text-brand-navy">
                {{ title() }}
              </h2>
            }
            @if (description()) {
              <p class="max-w-2xl text-[0.78rem] leading-5 text-slate-500">{{ description() }}</p>
            }
          </div>

          <div class="shrink-0">
            <ng-content select="[card-actions]" />
          </div>
        </header>
      }

      <div [class]="contentClass()">
        <ng-content />
      </div>
    </section>
  `,
})
export class BackofficeCardComponent {
  readonly eyebrow = input('');
  readonly title = input('');
  readonly description = input('');
  readonly surface = input<'default' | 'muted' | 'contrast'>('default');
  readonly padded = input(true);

  readonly hasHeader = computed(() =>
    Boolean(this.eyebrow() || this.title() || this.description()),
  );
  readonly cardClass = computed(() => {
    const surfaceClass =
      this.surface() === 'contrast'
        ? 'admin-panel-strong text-white'
        : this.surface() === 'muted'
          ? 'admin-panel-muted'
          : 'admin-panel';

    return `${surfaceClass} rounded-[1rem] p-4`;
  });
  readonly contentClass = computed(() => {
    if (!this.padded()) {
      return this.hasHeader() ? 'mt-3.5' : '';
    }

    return this.hasHeader() ? 'mt-3.5 space-y-3.5' : 'space-y-3.5';
  });
}
