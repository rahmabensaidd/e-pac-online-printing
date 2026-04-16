import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-design-studio-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './design-studio-page.html',
  styleUrl: './design-studio-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignStudioPageComponent {
  private readonly auth = inject(AuthService);

  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly ctaRoute = computed(() => (this.isAuthenticated() ? '/design-your-book' : '/login'));
  readonly ctaQueryParams = computed(() =>
    this.isAuthenticated() ? undefined : { redirectTo: '/design-your-book' },
  );
  readonly ctaLabel = computed(() =>
    this.isAuthenticated() ? 'Start Designing Your Book' : 'Sign In To Start Designing',
  );
}

