import { isPlatformBrowser } from '@angular/common';
import { Directive, DestroyRef, ElementRef, PLATFORM_ID, Renderer2, effect, inject, input } from '@angular/core';

type RevealOrigin = 'up' | 'down' | 'left' | 'right';

@Directive({
    selector: '[appReveal]',
    standalone: true
})
export class RevealOnScrollDirective {
  readonly revealDelay = input(0);
  readonly revealDistance = input(22);
  readonly revealOrigin = input<RevealOrigin>('up');
  readonly revealOnce = input(true);

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    const host = this.elementRef.nativeElement;
    this.renderer.addClass(host, 'reveal-item');

    effect(() => {
      this.renderer.setStyle(host, '--reveal-delay', `${this.revealDelay()}ms`);
      this.renderer.setStyle(host, '--reveal-distance', `${this.revealDistance()}px`);
      this.renderer.setAttribute(host, 'data-reveal-origin', this.revealOrigin());
    });

    if (!isPlatformBrowser(this.platformId)) {
      this.renderer.addClass(host, 'reveal-item-visible');
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.renderer.addClass(host, 'reveal-item-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            if (!this.revealOnce()) {
              this.renderer.removeClass(host, 'reveal-item-visible');
            }
            continue;
          }

          this.renderer.addClass(host, 'reveal-item-visible');

          if (this.revealOnce()) {
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
