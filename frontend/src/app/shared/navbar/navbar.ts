import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiService } from '../../core/services/ui.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
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

  readonly primaryNav: NavItem[] = [
    { label: 'Home', path: '/', exact: true },
    { label: 'Marketplace', path: '/marketplace', exact: true },
    { label: 'Price Simulator', path: '/price-simulator', exact: true },
  ];
  readonly loginNav: NavItem = { label: 'Login', path: '/login', exact: true };

  readonly mobileOpen = signal(false);
  readonly cartCount = computed(() => this.cart.count());
  readonly authActionLabel = computed(() => this.auth.isAuthenticated() ? 'Logout' : 'Login');

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  onEscape(): void {
    this.mobileOpen.set(false);
  }

  onAuthAction(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.logout();
      this.closeMobile();
    }
  }
}
