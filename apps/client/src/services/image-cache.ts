/**
 * IndexedDB cache for card images.
 * Stores image Blobs with 7-day expiry.
 */

const DB_NAME = 'card-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedImage(url: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
          resolve(entry.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedImage(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ url, blob, timestamp: Date.now() } satisfies CacheEntry);
  } catch {
    // Silently fail — cache is optional
  }
}

/** Remove expired entries. Call periodically or on app start. */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const entry = cursor.value as CacheEntry;
      if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
        cursor.delete();
      }
      cursor.continue();
    };
  } catch {
    // Silently fail
  }
}
