import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-cta-section',
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './cta-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaSectionComponent {}
