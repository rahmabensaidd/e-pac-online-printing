import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-server-error-page',
  imports: [RouterLink],
  templateUrl: './server-error.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorComponent {
  retry(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
