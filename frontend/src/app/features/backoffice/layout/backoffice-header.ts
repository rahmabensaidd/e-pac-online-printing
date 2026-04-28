import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { BackofficeShellService } from '../core/backoffice-shell.service';

@Component({
  selector: 'app-backoffice-header',
  imports: [RouterLink],
  templateUrl: './backoffice-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  standalone: true
})
export class BackofficeHeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly shell = inject(BackofficeShellService);
  readonly backofficeData = inject(BackofficeDataService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly currentUser = computed(
    () =>
      this.backofficeData.employees().find((employee) => employee.state !== 'Offline') ??
      this.backofficeData.employees()[0] ??
      null,
  );
  readonly currentUserInitials = computed(
    () =>
      this.currentUser()
        ?.name.split(' ')
        .slice(0, 2)
        .map((segment) => segment.charAt(0))
        .join('')
        .toUpperCase() ?? 'EP',
  );

  constructor() {
    afterNextRender(() => {
      const closeOnOutsideInteraction = (event: Event) => {
        const target = event.target;

        if (!(target instanceof Node)) {
          return;
        }

        if (!this.host.nativeElement.contains(target)) {
          this.shell.closeHeaderOverlays();
        }
      };

      const closeOnEscape = (event: Event) => {
        if (event instanceof KeyboardEvent && event.key === 'Escape') {
          this.shell.closeHeaderOverlays();
        }
      };

      this.document.addEventListener('pointerdown', closeOnOutsideInteraction, true);
      this.document.addEventListener('keydown', closeOnEscape, true);

      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('pointerdown', closeOnOutsideInteraction, true);
        this.document.removeEventListener('keydown', closeOnEscape, true);
      });
    });
  }

  onLogout(): void {
    this.auth.logout();
    this.shell.closeProfileMenu();
    void this.router.navigate(['/']);
  }
}
