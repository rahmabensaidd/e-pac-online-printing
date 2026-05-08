import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { MarketplaceService } from '../../pages/marketplace/marketplace.service';

@Component({
  selector: 'app-testimonials-section',
  imports: [RevealOnScrollDirective],
  templateUrl: './testimonials-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSectionComponent {
  private readonly marketplaceService = inject(MarketplaceService);

  readonly stars = [1, 2, 3, 4, 5];
  readonly featuredReviews = computed(() => this.marketplaceService.featuredReviews().slice(0, 3));
}
