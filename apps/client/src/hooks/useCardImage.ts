import { useState, useEffect, useRef } from 'react';
import { fetchCardImage } from '../services/card-image-service';

export type ImageState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Hook to lazy-load a card image. Triggers fetch when the element enters the viewport.
 */
export function useCardImage(cardId: string, size: 'small' | 'large' = 'small') {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<ImageState>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    setSrc(null);
    setState('idle');
  }, [cardId, size]);

  useEffect(() => {
    const el = ref.current;
    if (!el || loadedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadedRef.current) return;
        loadedRef.current = true;
        observer.disconnect();
        setState('loading');

        fetchCardImage(cardId, size).then((url) => {
          if (url) {
            setSrc(url);
            setState('loaded');
          } else {
            setState('error');
          }
        });
      },
      { rootMargin: '100px' } // start loading slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cardId, size]);

  return { ref, src, state };
}
