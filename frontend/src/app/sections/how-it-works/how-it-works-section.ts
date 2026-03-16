import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-how-it-works-section',
  imports: [RevealOnScrollDirective],
  templateUrl: './how-it-works-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksSectionComponent {}
