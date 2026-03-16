import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroSectionComponent } from '../../sections/hero/hero-section';
import { MarketplaceSectionComponent } from '../../sections/marketplace/marketplace-section';
import { DesignStudioSectionComponent } from '../../sections/design-studio/design-studio-section';
import { HowItWorksSectionComponent } from '../../sections/how-it-works/how-it-works-section';
import { TestimonialsSectionComponent } from '../../sections/testimonials/testimonials-section';
import { CtaSectionComponent } from '../../sections/cta/cta-section';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSectionComponent,
    MarketplaceSectionComponent,
    DesignStudioSectionComponent,
    HowItWorksSectionComponent,
    TestimonialsSectionComponent,
    CtaSectionComponent,
  ],
  templateUrl: './home-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {}
