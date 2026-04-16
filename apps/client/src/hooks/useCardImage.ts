import { useState, useEffect, useRef } from 'react';
import { getCardImageUrl } from '../services/card-mapping';

export type ImageState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Hook to load a card image. Uses direct <img> URL (no fetch/CORS issues).
 * Triggers load when element enters viewport via IntersectionObserver.
 */
export function useCardImage(cardId: string, size: 'small' | 'large' = 'small') {
  const [state, setState] = useState<ImageState>('idle');
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  // Reset on cardId change
  useEffect(() => {
    triggered.current = false;
    setSrc(null);
    setState('idle');
  }, [cardId, size]);

  useEffect(() => {
    const el = ref.current;
    if (!el || triggered.current) return;

    const url = getCardImageUrl(cardId, size);
    if (!url) {
      setState('error');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggered.current) return;
        triggered.current = true;
        observer.disconnect();
        setState('loading');

        // Preload via Image object — no CORS issues
        const img = new Image();
        img.onload = () => { setSrc(url); setState('loaded'); };
        img.onerror = () => setState('error');
        img.src = url;
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cardId, size]);

  return { ref, src, state };
}
