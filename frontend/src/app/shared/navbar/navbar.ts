import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UiService } from '../../core/services/ui.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  standalone: true
})
export class NavbarComponent {
  readonly ui = inject(UiService);
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly primaryNav: NavItem[] = [
    { label: 'Home', path: '/', exact: true },
    { label: 'Marketplace', path: '/marketplace', exact: true },
    { label: 'Price Simulator', path: '/price-simulator', exact: true },
    { label: 'Design Studio', path: '/design-studio', exact: true },
  ];
  readonly accountNav: NavItem[] = [
    { label: 'Profile', path: '/profile', exact: true },
    { label: 'My Custom Books', path: '/my-custom-books', exact: true },
    { label: 'My Orders', path: '/my-orders', exact: true },
  ];
  readonly loginNav: NavItem = { label: 'Login', path: '/login', exact: true };
  readonly visiblePrimaryNav = computed(() =>
    this.primaryNav.filter((item) => !item.requiresAuth || this.auth.isAuthenticated()),
  );

  readonly mobileOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly cartCount = computed(() => this.cart.count());
  readonly authActionLabel = computed(() => this.auth.isAuthenticated() ? 'Logout' : 'Login');
  readonly showBackofficeLink = computed(() => this.auth.isAuthenticated() && this.auth.isAdmin());

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((value) => !value);
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  onEscape(): void {
    this.mobileOpen.set(false);
    this.closeAccountMenu();
  }

  onAuthAction(): void {
    if (this.auth.isAuthenticated()) {
      const shouldRedirectHome = this.router.url.startsWith('/backoffice');
      this.auth.logout();
      this.closeMobile();
      this.closeAccountMenu();
      if (shouldRedirectHome) {
        void this.router.navigate(['/']);
      }
    }
  }
}
