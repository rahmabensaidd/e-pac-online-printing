import { BookPreviewFamily } from './book-preview-3d-utils';

export type BookSemanticTextureMap = {
  family: BookPreviewFamily;
  outsideFront?: string | null;
  outsideBack?: string | null;
  outsideSpine?: string | null;
  insideSpread?: string | null;
  insideFront?: string | null;
  insideBack?: string | null;
  flatPage1?: string | null;
  flatPage2?: string | null;
  flatPage3?: string | null;
  flatPage4?: string | null;
  rawPageUrls: string[];
  revision: number;
};

export interface SemanticTextureExtractionInput {
  family: BookPreviewFamily;
  pageBlobs: Blob[];
  trimWidth: number;
  thickness: number;
  revision?: number;
}

export interface SemanticTextureExtractionResult {
  textureMap: BookSemanticTextureMap;
  urlsToRevoke: string[];
}

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to decode image from URL: ${url}`));
    image.src = url;
  });
}

async function cropImageByPixels(
  sourceUrl: string,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number
): Promise<Blob> {
  const image = await loadImageFromUrl(sourceUrl);
  const safeWidth = Math.max(1, Math.round(cropWidth));
  const safeHeight = Math.max(1, Math.round(cropHeight));
  const canvas = document.createElement('canvas');
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context is not available for texture crop.');
  }

  context.drawImage(
    image,
    Math.max(0, Math.round(cropX)),
    Math.max(0, Math.round(cropY)),
    safeWidth,
    safeHeight,
    0,
    0,
    safeWidth,
    safeHeight
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null while cropping cover zone.'));
        }
      },
      'image/png',
      0.95
    );
  });
}

async function cropWrapSpreadByDimensions(
  spreadUrl: string,
  trimWidth: number,
  thickness: number
): Promise<{ backUrl: string; spineUrl: string; frontUrl: string; createdUrls: string[] }> {
  const image = await loadImageFromUrl(spreadUrl);
  const totalUnits = trimWidth * 2 + thickness;
  const createdUrls: string[] = [];

  let backPx: number;
  let spinePx: number;
  let frontPx: number;
  if (totalUnits > 0 && Number.isFinite(totalUnits)) {
    const pxPerUnit = image.width / totalUnits;
    backPx = Math.max(1, Math.round(trimWidth * pxPerUnit));
    spinePx = Math.max(1, Math.round(thickness * pxPerUnit));
    frontPx = Math.max(1, image.width - backPx - spinePx);
  } else {
    // Fallback only when dimensions are unavailable.
    backPx = Math.max(1, Math.round(image.width / 3));
    spinePx = Math.max(1, Math.round(image.width / 3));
    frontPx = Math.max(1, image.width - backPx - spinePx);
  }

  const backBlob = await cropImageByPixels(spreadUrl, 0, 0, backPx, image.height);
  const spineBlob = await cropImageByPixels(spreadUrl, backPx, 0, spinePx, image.height);
  const frontBlob = await cropImageByPixels(spreadUrl, backPx + spinePx, 0, frontPx, image.height);

  const backUrl = URL.createObjectURL(backBlob);
  const spineUrl = URL.createObjectURL(spineBlob);
  const frontUrl = URL.createObjectURL(frontBlob);
  createdUrls.push(backUrl, spineUrl, frontUrl);

  return { backUrl, spineUrl, frontUrl, createdUrls };
}

export async function extractSemanticTextureMap(
  input: SemanticTextureExtractionInput
): Promise<SemanticTextureExtractionResult> {
  const urlsToRevoke: string[] = [];
  const rawPageUrls = input.pageBlobs.map((blob) => {
    const url = URL.createObjectURL(blob);
    urlsToRevoke.push(url);
    return url;
  });

  const map: BookSemanticTextureMap = {
    family: input.family,
    rawPageUrls,
    revision: input.revision ?? Date.now(),
    outsideFront: null,
    outsideBack: null,
    outsideSpine: null,
    insideSpread: null,
    insideFront: null,
    insideBack: null,
    flatPage1: null,
    flatPage2: null,
    flatPage3: null,
    flatPage4: null
  };

  if (input.family === 'WRAP_1P' || input.family === 'WRAP_2P') {
    /**
     * WRAP rule:
     * All outside cover zones are always on Page 1 (single spread):
     * left=Back, middle=Spine, right=Front.
     */
    const page1 = rawPageUrls[0];
    if (page1) {
      const crop = await cropWrapSpreadByDimensions(page1, input.trimWidth, input.thickness);
      map.outsideBack = crop.backUrl;
      map.outsideSpine = crop.spineUrl;
      map.outsideFront = crop.frontUrl;
      urlsToRevoke.push(...crop.createdUrls);
    }

    if (input.family === 'WRAP_2P') {
      /**
       * WRAP_2P rule:
       * Page 2 is inside cover content. It must NOT be used as outside back/front.
       */
      map.insideSpread = rawPageUrls[1] ?? null;
      map.insideBack = rawPageUrls[1] ?? null;
      map.insideFront = rawPageUrls[1] ?? null;
    }

    return { textureMap: map, urlsToRevoke };
  }

  if (input.family === 'FLAT_2P') {
    map.flatPage1 = rawPageUrls[0] ?? null;
    map.flatPage2 = rawPageUrls[1] ?? null;
    map.outsideFront = rawPageUrls[0] ?? null;
    map.outsideBack = rawPageUrls[1] ?? null;
    return { textureMap: map, urlsToRevoke };
  }

  if (input.family === 'FLAT_4P') {
    map.flatPage1 = rawPageUrls[0] ?? null;
    map.flatPage2 = rawPageUrls[1] ?? null;
    map.flatPage3 = rawPageUrls[2] ?? null;
    map.flatPage4 = rawPageUrls[3] ?? null;
    map.outsideFront = rawPageUrls[0] ?? null;
    map.outsideBack = rawPageUrls[3] ?? rawPageUrls[1] ?? null;
    map.insideFront = rawPageUrls[1] ?? null;
    map.insideBack = rawPageUrls[2] ?? null;
    return { textureMap: map, urlsToRevoke };
  }

  if (input.family === 'SADDLESTITCH') {
    map.flatPage1 = rawPageUrls[0] ?? null;
    map.flatPage2 = rawPageUrls[1] ?? null;
    map.outsideFront = rawPageUrls[0] ?? null;
    map.outsideBack = rawPageUrls[1] ?? null;
  }

  return { textureMap: map, urlsToRevoke };
}
