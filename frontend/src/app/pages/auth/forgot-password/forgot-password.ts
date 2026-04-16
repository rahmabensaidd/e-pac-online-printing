import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly submitted = signal(false);
  readonly emailSent = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  showEmailError(): boolean {
    const control = this.form.controls.email;
    return (this.submitted() || control.touched) && control.invalid;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.emailSent.set(true);
  }

  resetFlow(): void {
    this.emailSent.set(false);
    this.submitted.set(false);
    this.form.reset({ email: '' });
  }
}
