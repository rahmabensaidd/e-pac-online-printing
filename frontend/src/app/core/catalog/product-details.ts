import { Product, ProductCategory } from '../models/product';
import { MARKETPLACE_ITEMS } from '../../pages/marketplace/marketplace.data';
import { MarketplaceCategory, MarketplaceItem } from '../../pages/marketplace/marketplace.types';

export type ProductVisualKind = 'book' | 'magazine' | 'poster' | 'card' | 'brochure' | 'calendar' | 'label';

export interface ProductDetails {
  key: string;
  title: string;
  categoryLabel: string;
  marketplaceCategory?: MarketplaceCategory;
  shortDescription: string;
  priceFrom: number;
  imageStyle: string;
  isAvailable: boolean;
  rating?: number;
  reviewsCount?: number;
  tags: string[];
  specs: string[];
  productOptions: string[];
  productionNotes: string[];
  leadTime: string;
  minimumOrder: string;
  visualKind: ProductVisualKind;
  cartProduct: Product;
}

const CATEGORY_TO_PRODUCT_CATEGORY: Record<MarketplaceCategory, ProductCategory> = {
  Books: 'photo',
  Calendars: 'business',
  Posters: 'marketing',
  Flyers: 'marketing',
  'Business Cards': 'business',
  Brochures: 'marketing',
};

const CATEGORY_TO_VISUAL_KIND: Record<MarketplaceCategory, ProductVisualKind> = {
  Books: 'book',
  Calendars: 'calendar',
  Posters: 'poster',
  Flyers: 'poster',
  'Business Cards': 'card',
  Brochures: 'brochure',
};

const CATEGORY_TO_GRADIENT: Record<MarketplaceCategory, string> = {
  Books: 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 100%)',
  Calendars: 'linear-gradient(135deg, #00D9C0 0%, #1A1A2E 100%)',
  Posters: 'linear-gradient(135deg, #FF6B35 0%, #FF006E 100%)',
  Flyers: 'linear-gradient(135deg, #FF006E 0%, #00D9C0 100%)',
  'Business Cards': 'linear-gradient(135deg, #1A1A2E 0%, #FF6B35 100%)',
  Brochures: 'linear-gradient(135deg, #FF6B35 0%, #00D9C0 100%)',
};

const CATEGORY_TO_SPECS: Record<MarketplaceCategory, string[]> = {
  Books: ['Perfect bound or casebound', 'Full bleed color reproduction', 'Multiple trim sizes'],
  Calendars: ['Monthly or weekly layouts', 'Wire-o or saddle stitched', 'Custom cover and back page'],
  Posters: ['Matte or gloss stock', 'Large format output', 'High color fidelity'],
  Flyers: ['Single or double sided', 'Economy and premium papers', 'Bulk-ready quantities'],
  'Business Cards': ['Matte, soft-touch, or spot UV', 'Standard and custom sizes', 'Front and back printing'],
  Brochures: ['Tri-fold, z-fold, or gatefold', 'Premium coated stocks', 'Scored and precise folds'],
};

const CATEGORY_TO_PERSONALIZATION: Record<MarketplaceCategory, string[]> = {
  Books: ['Binding options: perfect bound or casebound', 'Interior stocks: offset, matte, or silk', 'Short-run and bulk order tiers'],
  Calendars: ['Monthly and weekly formats', 'Wire-o or saddle-stitched production', 'Standard and premium cover stocks'],
  Posters: ['A-size and custom dimensions', 'Matte or gloss substrate choices', 'Low and high-volume order tiers'],
  Flyers: ['Single-sheet and folded formats', 'Economy and premium paper options', 'Campaign and bulk quantity tiers'],
  'Business Cards': ['Standard, soft-touch, and UV finishes', 'Standard and custom card dimensions', 'Single-sided or double-sided print'],
  Brochures: ['Tri-fold, z-fold, and gatefold formats', 'Coated and uncoated paper options', 'Short-run and campaign quantity tiers'],
};

const CATEGORY_TO_PRODUCTION: Record<MarketplaceCategory, string[]> = {
  Books: ['Preflight check included before production', 'Color-managed output with production QA'],
  Calendars: ['Date grid alignment review included', 'Consistent month-to-month color balancing'],
  Posters: ['Large format calibration before print run', 'Trim and packing verification on dispatch'],
  Flyers: ['Batch production for quantity efficiency', 'Final edge-trim and color consistency checks'],
  'Business Cards': ['Card edge precision inspection', 'Surface finish inspection before packing'],
  Brochures: ['Fold-line tolerance validation', 'Binding and crease quality control before shipment'],
};

const CATEGORY_TO_LEAD_TIME: Record<MarketplaceCategory, string> = {
  Books: '5-7 business days',
  Calendars: '4-6 business days',
  Posters: '2-4 business days',
  Flyers: '2-4 business days',
  'Business Cards': '2-3 business days',
  Brochures: '3-5 business days',
};

const CATEGORY_TO_MINIMUM_ORDER: Record<MarketplaceCategory, string> = {
  Books: '25 units',
  Calendars: '25 units',
  Posters: '10 units',
  Flyers: '50 units',
  'Business Cards': '100 units',
  Brochures: '50 units',
};

const FEATURED_ONLY_DETAILS: readonly ProductDetails[] = [
  {
    key: 'featured-postcards',
    title: 'Premium Postcards',
    categoryLabel: 'Postcards',
    marketplaceCategory: 'Flyers',
    shortDescription: 'Direct-mail ready postcards with strong color reproduction and durable stock options.',
    priceFrom: 11,
    imageStyle: 'linear-gradient(135deg, #3A86FF 0%, #FF006E 100%)',
    isAvailable: true,
    tags: ['Direct mail', 'Matte finish', 'Bulk discount'],
    specs: ['4" x 6" and 5" x 7" formats', '14pt or 16pt card stock', 'Optional UV coating'],
    productOptions: ['Front and back print included', 'Matte and gloss paper options', 'Campaign and bulk quantity tiers'],
    productionNotes: ['Address-safe margin checks available', 'Post-print trim verification on each run'],
    leadTime: '3-5 business days',
    minimumOrder: '50 units',
    visualKind: 'poster',
    cartProduct: {
      id: 2001,
      name: 'Premium Postcards',
      category: 'marketing',
      price: 11,
      image: 'linear-gradient(135deg, #3A86FF 0%, #FF006E 100%)',
      description: 'Direct-mail ready postcards for campaigns and announcements.',
      specs: ['4" x 6" format', 'Premium card stock', 'Full color print'],
    },
  },
  {
    key: 'featured-stickers',
    title: 'Custom Vinyl Stickers',
    categoryLabel: 'Stickers',
    shortDescription: 'Durable, waterproof stickers for packaging, labels, and product branding.',
    priceFrom: 8,
    imageStyle: 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 100%)',
    isAvailable: true,
    tags: ['Waterproof', 'Die-cut', 'Packaging'],
    specs: ['Custom contours and sizes', 'Laminated vinyl options', 'Indoor and outdoor use'],
    productOptions: ['Die-cut and kiss-cut formats', 'Adhesive and laminate variants', 'Batch quantity tiers available'],
    productionNotes: ['Material durability check before print', 'Cut-line verification included in preflight'],
    leadTime: '3-5 business days',
    minimumOrder: '100 units',
    visualKind: 'label',
    cartProduct: {
      id: 2002,
      name: 'Custom Vinyl Stickers',
      category: 'packaging',
      price: 8,
      image: 'linear-gradient(135deg, #1A1A2E 0%, #00D9C0 100%)',
      description: 'Vinyl stickers for packaging and brand applications.',
      specs: ['Custom die-cut', 'Waterproof finish', 'Strong adhesive'],
    },
  },
];

const FEATURED_DETAILS_BY_KEY = new Map(FEATURED_ONLY_DETAILS.map((item) => [item.key, item] as const));
const MARKETPLACE_ITEM_BY_ID = new Map(MARKETPLACE_ITEMS.map((item) => [item.id, item] as const));

export function getProductDetailsByKey(key: string): ProductDetails | null {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return null;
  }

  const marketplaceItem = MARKETPLACE_ITEM_BY_ID.get(normalizedKey);
  if (marketplaceItem) {
    return buildMarketplaceDetails(marketplaceItem);
  }

  const featuredItem = FEATURED_DETAILS_BY_KEY.get(normalizedKey);
  return featuredItem ? cloneDetails(featuredItem) : null;
}

function buildMarketplaceDetails(item: MarketplaceItem): ProductDetails {
  const category = item.category;
  const imageStyle = item.imageUrl ? `url(${item.imageUrl})` : CATEGORY_TO_GRADIENT[category];

  return {
    key: item.id,
    title: item.title,
    categoryLabel: category,
    marketplaceCategory: category,
    shortDescription: item.shortDescription,
    priceFrom: item.priceFrom,
    imageStyle,
    isAvailable: item.isAvailable,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    tags: [...item.tags],
    specs: [...CATEGORY_TO_SPECS[category]],
    productOptions: [...CATEGORY_TO_PERSONALIZATION[category]],
    productionNotes: [...CATEGORY_TO_PRODUCTION[category]],
    leadTime: CATEGORY_TO_LEAD_TIME[category],
    minimumOrder: CATEGORY_TO_MINIMUM_ORDER[category],
    visualKind: CATEGORY_TO_VISUAL_KIND[category],
    cartProduct: {
      id: toStableProductId(item.id),
      name: item.title,
      category: CATEGORY_TO_PRODUCT_CATEGORY[category],
      price: item.priceFrom,
      image: CATEGORY_TO_GRADIENT[category],
      description: item.shortDescription,
      specs: [...CATEGORY_TO_SPECS[category]],
    },
  };
}

function cloneDetails(details: ProductDetails): ProductDetails {
  return {
    ...details,
    tags: [...details.tags],
    specs: [...details.specs],
    productOptions: [...details.productOptions],
    productionNotes: [...details.productionNotes],
    cartProduct: {
      ...details.cartProduct,
      specs: [...details.cartProduct.specs],
    },
  };
}

function toStableProductId(itemId: string): number {
  const index = MARKETPLACE_ITEMS.findIndex((entry) => entry.id === itemId);
  if (index >= 0) {
    return index + 1000;
  }

  return (hashString(itemId) % 9000) + 2000;
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
