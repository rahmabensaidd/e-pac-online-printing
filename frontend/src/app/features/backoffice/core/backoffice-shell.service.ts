import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BackofficeDataService } from './backoffice.data.service';
import { BackofficePageMeta } from './backoffice.models';

@Injectable()
export class BackofficeShellService {
  private readonly router = inject(Router);
  private readonly backofficeData = inject(BackofficeDataService);

  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly profileMenuOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly currentPage = computed<BackofficePageMeta>(() =>
    this.resolvePageMeta(this.router.routerState.snapshot.root),
  );
  readonly navItems = computed(() => this.backofficeData.navItems());
  readonly alerts = computed(() => this.backofficeData.attentionItems());
  readonly notificationCount = computed(() => this.alerts().length);

  constructor() {
    effect(() => {
      this.currentUrl();
      this.mobileSidebarOpen.set(false);
      this.closeHeaderOverlays();
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  toggleNavigation(): void {
    const isDesktop =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

    if (isDesktop) {
      this.toggleSidebar();
      return;
    }

    this.toggleMobileSidebar();
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        this.profileMenuOpen.set(false);
      }

      return nextOpen;
    });
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        this.notificationsOpen.set(false);
      }

      return nextOpen;
    });
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  closeHeaderOverlays(): void {
    this.notificationsOpen.set(false);
    this.profileMenuOpen.set(false);
  }

  private resolvePageMeta(route: ActivatedRouteSnapshot): BackofficePageMeta {
    let current: ActivatedRouteSnapshot | null = route;

    while (current?.firstChild) {
      current = current.firstChild;
    }

    const title = current?.data['title'];
    const description = current?.data['description'];

    return {
      title: typeof title === 'string' ? title : 'Backoffice',
      description:
        typeof description === 'string'
          ? description
          : 'Manage orders, team workflows, and workspace settings.',
    };
  }
}
