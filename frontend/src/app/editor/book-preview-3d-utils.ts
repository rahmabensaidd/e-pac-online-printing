export type PreviewBindingGroup = 'CASEBIND_OR_PERFECT' | 'COIL' | 'LOOSELEAF' | 'SADDLESTITCH' | 'UNKNOWN';

export type BookPreviewFamily = 'WRAP_1P' | 'WRAP_2P' | 'FLAT_2P' | 'FLAT_4P' | 'SADDLESTITCH';

export interface BookPreviewTextureSet {
  frontUrl?: string;
  backUrl?: string;
  spineUrl?: string;
  singleUrl?: string;
  revision?: number;
}

export interface NormalizedPreviewDimensions {
  trimWidth: number;
  trimHeight: number;
  thickness: number;
  pageBlockDepth: number;
  coverSpreadWidth: number;
}

const DEFAULT_TRIM_WIDTH = 210;
const DEFAULT_TRIM_HEIGHT = 297;
const DEFAULT_THICKNESS = 20;

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/[\s_\-]+/g, '');
}

function toPositiveNumber(value: number | string | null | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function resolveBindingGroup(bindingType: string | null | undefined): PreviewBindingGroup {
  const normalized = normalizeToken(bindingType);

  if (normalized.startsWith('CASEBIND') || normalized.startsWith('PERFECT')) {
    return 'CASEBIND_OR_PERFECT';
  }
  if (normalized.startsWith('COIL')) {
    return 'COIL';
  }
  if (normalized.startsWith('LOOSELEAF')) {
    return 'LOOSELEAF';
  }
  if (normalized.startsWith('SADDLESTITCH')) {
    return 'SADDLESTITCH';
  }

  return 'UNKNOWN';
}

export function isFourZeroCoverColor(coverColor: string | null | undefined): boolean {
  const normalized = normalizeToken(coverColor).replace(/[\\/]/g, '');
  return normalized === 'FOURZERO' || normalized === '40';
}

export function computeFamilyFromBindingTypeAndCoverColor(
  bindingType: string | null | undefined,
  coverColor: string | null | undefined
): BookPreviewFamily {
  const group = resolveBindingGroup(bindingType);
  const isFourZero = isFourZeroCoverColor(coverColor);

  if (group === 'CASEBIND_OR_PERFECT') {
    return isFourZero ? 'WRAP_1P' : 'WRAP_2P';
  }
  if (group === 'COIL' || group === 'LOOSELEAF') {
    return isFourZero ? 'FLAT_2P' : 'FLAT_4P';
  }
  if (group === 'SADDLESTITCH') {
    return 'SADDLESTITCH';
  }

  return 'WRAP_2P';
}

export function resolveGlbPathFromFamilyAndBindingType(
  family: BookPreviewFamily,
  bindingType: string | null | undefined
): string {
  const group = resolveBindingGroup(bindingType);

  if (family === 'SADDLESTITCH') {
    return '/assets/3d/books/saddlestitch-booklet-metal-pro.glb';
  }

  if (family === 'WRAP_1P' || family === 'WRAP_2P') {
    return '/assets/3d/books/hardcover-book-closed-pro.glb';
  }

  if (group === 'COIL') {
    return '/assets/3d/books/coil-book-visible-spiral-pro.glb';
  }
  if (group === 'LOOSELEAF') {
    return '/assets/3d/books/looseleaf-metal-rings-pro.glb';
  }

  return '/assets/3d/books/hardcover-book-closed-pro.glb';
}

export function normalizePreviewDimensions(
  bookWidth: number | string | null | undefined,
  bookHeight: number | string | null | undefined,
  bookThickness: number | string | null | undefined
): NormalizedPreviewDimensions {
  const trimWidth = toPositiveNumber(bookWidth, DEFAULT_TRIM_WIDTH);
  const trimHeight = toPositiveNumber(bookHeight, DEFAULT_TRIM_HEIGHT);
  const thickness = toPositiveNumber(bookThickness, DEFAULT_THICKNESS);
  const pageBlockDepth = Math.max(thickness, Math.max(trimWidth, trimHeight) * 0.03);

  return {
    trimWidth,
    trimHeight,
    thickness,
    pageBlockDepth,
    coverSpreadWidth: trimWidth * 2 + thickness
  };
}
