export type MarketplaceCategory =
  | 'Books'
  | 'Calendars'
  | 'Posters'
  | 'Flyers'
  | 'Business Cards'
  | 'Brochures';

export interface MarketplaceItem {
  id: string;
  title: string;
  category: MarketplaceCategory;
  shortDescription: string;
  priceFrom: number;
  rating?: number;
  reviewsCount?: number;
  tags: string[];
  imageUrl?: string;
  isAvailable: boolean;
}

export const MARKETPLACE_CATEGORIES: readonly MarketplaceCategory[] = [
  'Books',
  'Calendars',
  'Posters',
  'Flyers',
  'Business Cards',
  'Brochures',
];
