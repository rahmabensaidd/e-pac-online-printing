import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type PreviewProductType = 'Book' | 'Magazine' | 'Journal';

@Component({
  selector: 'app-design-studio-section',
  imports: [CurrencyPipe, RevealOnScrollDirective, RouterLink],
  templateUrl: './design-studio-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignStudioSectionComponent {
  readonly productTypes: readonly PreviewProductType[] = ['Book', 'Magazine', 'Journal'];
  readonly selectedProductType = signal<PreviewProductType>('Book');
  readonly pageCount = signal(24);
  readonly quantity = signal(1);
  readonly trimSize = signal('6" x 9"');
  readonly binding = signal('Saddle Stitched (Booklet)');
  readonly isMagazineDemo = computed(() => this.selectedProductType() === 'Magazine');
  readonly isJournalDemo = computed(() => this.selectedProductType() === 'Journal');

  private readonly baseByType: Record<PreviewProductType, number> = {
    Book: 3.2,
    Magazine: 2.7,
    Journal: 3.6,
  };

  readonly demoTotal = computed(() => {
    const base = this.baseByType[this.selectedProductType()];
    const paperAndColor = this.pageCount() * 0.165;
    const quantityMultiplier = this.quantity() >= 500 ? 0.92 : 1;
    return (base + paperAndColor) * this.quantity() * quantityMultiplier + 0.84;
  });
  readonly demoCoverShapeClass = computed(() => {
    if (this.isMagazineDemo()) {
      return 'w-56 h-80 rounded-md';
    }

    if (this.isJournalDemo()) {
      return 'w-56 h-80 rounded-2xl';
    }

    return 'w-58 h-80 rounded-r-lg';
  });
  readonly demoCoverToneClass = computed(() => {
    if (this.isMagazineDemo()) {
      return 'bg-linear-to-br from-brand-orange via-brand-pink to-brand-teal';
    }

    if (this.isJournalDemo()) {
      return 'bg-linear-to-br from-brand-navy via-brand-orange to-brand-pink';
    }

    return 'bg-linear-to-br from-brand-navy via-brand-teal to-brand-orange';
  });

  setProductType(type: PreviewProductType): void {
    this.selectedProductType.set(type);
  }

  onPageCountChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = Number(target?.value);
    if (!Number.isFinite(value)) return;
    this.pageCount.set(Math.min(Math.max(Math.round(value), 24), 320));
  }

  onQuantityChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = Number(target?.value);
    if (!Number.isFinite(value)) return;
    this.quantity.set(Math.min(Math.max(Math.round(value), 1), 2500));
  }

  productTypeClass(type: PreviewProductType): string {
    const active = this.selectedProductType() === type;
    return active
      ? 'bg-brand-navy text-white border-brand-navy'
      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-orange hover:text-brand-navy';
  }
}
