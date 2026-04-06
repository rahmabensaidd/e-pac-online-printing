import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';

type SignUpField = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'acceptTerms';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-sign-up-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: [passwordMatchValidator] },
  );

  showError(field: SignUpField): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.invalid;
  }

  showPasswordMismatch(): boolean {
    const confirmTouched = this.form.controls.confirmPassword.touched;
    return (this.submitted() || confirmTouched) && this.form.hasError('passwordMismatch');
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.errorMessage.set(null);

    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const fullName = this.form.controls.fullName.getRawValue().trim();
      const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
      const email = this.form.controls.email.getRawValue().trim().toLowerCase();
      const username = this.buildUsernameFromEmail(email);
      const password = this.form.controls.password.getRawValue();

      await this.authService.signup({
        firstName: firstName || fullName,
        lastName: rest.join(' ') || '-',
        email,
        username,
        password,
      });

      await this.authService.login(email, password, true);
      this.ui.showToast?.({
        message: 'Account created successfully.',
        type: 'success',
      });
      await this.router.navigate(['/marketplace']);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      this.loading.set(false);
    }
  }

  private buildUsernameFromEmail(email: string): string {
    const localPart = email.split('@')[0]?.trim() || 'user';
    return localPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || `user${Date.now()}`;
  }
}
