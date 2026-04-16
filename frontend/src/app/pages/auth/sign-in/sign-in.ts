// src/app/pages/auth/sign-in/sign-in.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ui = inject(UiService);

  protected readonly submitting = signal(false);
  protected readonly authError = signal<string | null>(null);

  protected form = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', Validators.required],
    rememberMe: [true]
  });

  showError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.authError.set(null);

    const { identifier, password, rememberMe } = this.form.value;

    try {
      await this.authService.login(identifier!, password!, rememberMe ?? true);

      this.ui.showToast?.({
        message: 'Welcome back!',
        type: 'success'
      });

      // Rediriger vers la page précédente ou le checkout
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
      await this.router.navigate([redirectTo || '/marketplace']);

    } catch (error) {
      this.authError.set(error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      this.submitting.set(false);
    }
  }
}
