import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly cartOpen = signal(false);

  openCart(): void { this.cartOpen.set(true); }
  closeCart(): void { this.cartOpen.set(false); }
  toggleCart(): void { this.cartOpen.update((v) => !v); }
}
