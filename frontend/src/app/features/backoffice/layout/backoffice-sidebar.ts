import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BackofficeShellService } from '../core/backoffice-shell.service';

@Component({
  selector: 'app-backoffice-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './backoffice-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class BackofficeSidebarComponent {
  readonly shell = inject(BackofficeShellService);
  readonly backofficeData = inject(BackofficeDataService);

  readonly operationsItems = computed(() =>
    this.shell.navItems().filter((item) => item.group === 'Operations'),
  );
  readonly workspaceItems = computed(() =>
    this.shell.navItems().filter((item) => item.group === 'Workspace'),
  );

  navItemClass(isActive: boolean, collapsed: boolean): string {
    const stateClass = isActive
      ? 'bg-white text-brand-navy shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80'
      : 'text-slate-500 hover:bg-white/80 hover:text-brand-navy';

    const spacingClass = collapsed ? 'h-10 justify-center px-2' : 'h-10 justify-between px-3';

    return `admin-focus-ring group relative flex items-center gap-3 rounded-[0.9rem] transition-all duration-200 ${stateClass} ${spacingClass}`;
  }

  iconWrapClass(isActive: boolean): string {
    return isActive
      ? 'grid h-7 w-7 place-items-center rounded-[0.8rem] bg-brand-navy text-white'
      : 'grid h-7 w-7 place-items-center rounded-[0.8rem] bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-white group-hover:text-brand-navy';
  }

  indicatorClass(isActive: boolean): string {
    return isActive ? 'bg-brand-orange opacity-100' : 'bg-slate-300 opacity-0';
  }

  badgeClass(isActive: boolean): string {
    return isActive
      ? 'rounded-full bg-brand-cream px-1.5 py-0.5 text-[0.64rem] font-semibold text-brand-navy'
      : 'rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.64rem] font-semibold text-slate-500';
  }
}
