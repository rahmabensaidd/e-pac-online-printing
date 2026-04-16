import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackofficeDataService } from '../core/backoffice.data.service';
import { AccentMode, DigestFrequency } from '../core/backoffice.models';
import { BackofficeCardComponent } from '../shared/backoffice-card';
import { BackofficeSectionHeaderComponent } from '../shared/backoffice-section-header';

type SettingsField =
  | 'workspaceName'
  | 'supportEmail'
  | 'timezone'
  | 'defaultDueWindowDays'
  | 'digestFrequency'
  | 'lowStockThreshold';

@Component({
  selector: 'app-backoffice-settings-page',
  imports: [ReactiveFormsModule, BackofficeCardComponent, BackofficeSectionHeaderComponent],
  templateUrl: './backoffice-settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeSettingsPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly backofficeData = inject(BackofficeDataService);
  readonly submitted = signal(false);
  readonly saveMessage = signal('');
  readonly accentModes: readonly AccentMode[] = ['Warm', 'Balanced'];
  readonly digestOptions: readonly DigestFrequency[] = ['Daily', 'Weekly'];

  readonly form = this.fb.group({
    workspaceName: [this.backofficeData.settings().workspaceName, [Validators.required]],
    supportEmail: [
      this.backofficeData.settings().supportEmail,
      [Validators.required, Validators.email],
    ],
    timezone: [this.backofficeData.settings().timezone, [Validators.required]],
    defaultDueWindowDays: [
      this.backofficeData.settings().defaultDueWindowDays,
      [Validators.required, Validators.min(1), Validators.max(21)],
    ],
    autoAssignOrders: [this.backofficeData.settings().autoAssignOrders],
    digestFrequency: [this.backofficeData.settings().digestFrequency, [Validators.required]],
    lowStockThreshold: [
      this.backofficeData.settings().lowStockThreshold,
      [Validators.required, Validators.min(1), Validators.max(500)],
    ],
    accentMode: [this.backofficeData.settings().accentMode, [Validators.required]],
  });

  showError(field: SettingsField): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.invalid;
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.backofficeData.saveSettings(this.form.getRawValue());
    this.saveMessage.set('Workspace settings saved.');
  }
}
