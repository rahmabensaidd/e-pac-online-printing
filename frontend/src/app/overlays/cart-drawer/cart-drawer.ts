import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../core/services/ui.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  imports: [CurrencyPipe],
  templateUrl: './cart-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  @ViewChild('drawerRoot') private drawerRoot?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly ui = inject(UiService);
  readonly cart = inject(CartService);
  private previousFocusedElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const isOpen = this.ui.cartOpen();

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.previousFocusedElement = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

        queueMicrotask(() => this.closeButton?.nativeElement.focus());
        return;
      }

      this.previousFocusedElement?.focus();
      this.previousFocusedElement = null;
    });

    this.destroyRef.onDestroy(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = '';
      }
    });
  }

  close(): void {
    this.ui.closeCart();
  }

  onDrawerKeydown(event: KeyboardEvent): void {
    if (!this.ui.cartOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const root = this.drawerRoot?.nativeElement;
    if (!root) {
      return;
    }

    const focusableElements = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  checkout(): void {
    if (this.cart.items().length === 0) {
      return;
    }

    this.ui.closeCart();
    this.router.navigate(['/checkout']);
  }
}
