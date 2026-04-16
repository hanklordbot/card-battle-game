/**
 * Card Image Service — fetches card images from YGOProDeck API with IndexedDB caching.
 * Tracks blob URLs for proper memory cleanup.
 */

import { getCardImageUrl } from './card-mapping';
import { getCachedImage, setCachedImage, cleanExpiredCache } from './image-cache';

// In-flight request dedup
const pending = new Map<string, Promise<string | null>>();

// Track active blob URLs for cleanup
const activeBlobUrls = new Set<string>();

/** Initialize: clean expired cache entries. */
export function initCardImageService(): void {
  cleanExpiredCache();
}

/**
 * Get an object URL for a card image. Returns null if no mapping or load fails.
 * Uses IndexedDB cache → network fetch → cache store pipeline.
 */
export async function fetchCardImage(cardId: string, size: 'small' | 'large' = 'small'): Promise<string | null> {
  const url = getCardImageUrl(cardId);
  if (!url) return null;

  if (pending.has(url)) return pending.get(url)!;

  const promise = (async () => {
    try {
      const cached = await getCachedImage(url);
      if (cached) {
        const blobUrl = URL.createObjectURL(cached);
        activeBlobUrls.add(blobUrl);
        return blobUrl;
      }

      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      await setCachedImage(url, blob);

      const blobUrl = URL.createObjectURL(blob);
      activeBlobUrls.add(blobUrl);
      return blobUrl;
    } catch {
      return null;
    } finally {
      pending.delete(url);
    }
  })();

  pending.set(url, promise);
  return promise;
}

/** Revoke a single blob URL to free memory. */
export function revokeCardImage(blobUrl: string): void {
  if (activeBlobUrls.has(blobUrl)) {
    URL.revokeObjectURL(blobUrl);
    activeBlobUrls.delete(blobUrl);
  }
}

/** Revoke all tracked blob URLs. Call on scene teardown. */
export function revokeAllCardImages(): void {
  for (const url of activeBlobUrls) {
    URL.revokeObjectURL(url);
  }
  activeBlobUrls.clear();
}
