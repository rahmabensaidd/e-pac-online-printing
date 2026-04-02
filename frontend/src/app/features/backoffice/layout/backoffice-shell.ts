import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackofficeShellService } from '../core/backoffice-shell.service';
import { BackofficeHeaderComponent } from './backoffice-header';
import { BackofficeSidebarComponent } from './backoffice-sidebar';

@Component({
  selector: 'app-backoffice-shell',
  imports: [RouterOutlet, BackofficeSidebarComponent, BackofficeHeaderComponent],
  templateUrl: './backoffice-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BackofficeShellService],
  standalone: true
})
export class BackofficeShellComponent {
  readonly shell = inject(BackofficeShellService);
}
