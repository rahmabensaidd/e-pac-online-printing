import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly cartOpen = signal(false);

  openCart(): void { this.cartOpen.set(true); }
  closeCart(): void { this.cartOpen.set(false); }
  toggleCart(): void { this.cartOpen.update((v) => !v); }
// src/app/core/services/ui.service.ts (ajoutez cette méthode)
  showToast(options: { message: string; type?: 'success' | 'warning' | 'error' | 'info' }): void {
    // Implémentez selon votre système de notification
    console.log(`[${options.type || 'info'}] ${options.message}`);
    // Ou utilisez un service de toast comme Angular Material Snackbar
  }

}
