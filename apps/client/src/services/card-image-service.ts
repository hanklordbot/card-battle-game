/**
 * Card Image Service — fetches card images from YGOProDeck API with IndexedDB caching.
 */

import { getCardImageUrl } from './card-mapping';
import { getCachedImage, setCachedImage, cleanExpiredCache } from './image-cache';

// In-flight request dedup
const pending = new Map<string, Promise<string | null>>();

/** Initialize: clean expired cache entries. */
export function initCardImageService(): void {
  cleanExpiredCache();
}

/**
 * Get an object URL for a card image. Returns null if no mapping or load fails.
 * Uses IndexedDB cache → network fetch → cache store pipeline.
 */
export async function fetchCardImage(cardId: string, size: 'small' | 'large' = 'small'): Promise<string | null> {
  const url = getCardImageUrl(cardId, size);
  if (!url) return null;

  // Dedup concurrent requests for the same URL
  if (pending.has(url)) return pending.get(url)!;

  const promise = (async () => {
    try {
      // 1. Check IndexedDB cache
      const cached = await getCachedImage(url);
      if (cached) return URL.createObjectURL(cached);

      // 2. Fetch from network
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();

      // 3. Store in cache
      await setCachedImage(url, blob);

      return URL.createObjectURL(blob);
    } catch {
      return null;
    } finally {
      pending.delete(url);
    }
  })();

  pending.set(url, promise);
  return promise;
}
