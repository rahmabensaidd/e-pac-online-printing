import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-backoffice-section-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      @if (breadcrumb().length > 0 || eyebrow()) {
        <div class="flex items-center gap-2 overflow-hidden text-[0.72rem] font-medium text-slate-400">
          @if (breadcrumb().length > 0) {
            @for (item of breadcrumb(); track $index; let last = $last) {
              <span class="truncate">{{ item }}</span>
              @if (!last) {
                <span aria-hidden="true">/</span>
              }
            }
          } @else {
            <span>{{ eyebrow() }}</span>
          }
        </div>
      }

      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0 max-w-3xl">
          <h1
            class="text-[1.25rem] font-semibold tracking-tight text-brand-navy sm:text-[1.45rem]"
          >
            {{ title() }}
          </h1>
          @if (description()) {
            <p class="mt-1.5 text-[0.85rem] leading-6 text-slate-500">{{ description() }}</p>
          }
        </div>

        <div class="flex shrink-0 flex-wrap gap-2">
          <ng-content select="[header-actions]" />
        </div>
      </div>
    </div>
  `,
})
export class BackofficeSectionHeaderComponent {
  readonly breadcrumb = input<readonly string[]>([]);
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
}
