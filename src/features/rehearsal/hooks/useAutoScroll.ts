import { useState, useRef, useEffect, type RefObject } from 'react';

export interface UseAutoScrollOptions {
  isFullscreen: boolean;
  fullscreenScrollRef: RefObject<HTMLDivElement | null>;
  youtubeDuration: number;
}

export function useAutoScroll({ isFullscreen, fullscreenScrollRef, youtubeDuration }: UseAutoScrollOptions) {
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [smartScroll, setSmartScroll] = useState(false);
  const animRef = useRef<number>();
  const smartScrollStartRef = useRef<number>(0);
  const scrollAccumRef = useRef<number>(0);
  const scrollLastTsRef = useRef<number>(0);

  useEffect(() => {
    if (!autoScrolling) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    smartScrollStartRef.current = performance.now();
    scrollLastTsRef.current = 0;
    scrollAccumRef.current = 0;
    const target0 = isFullscreen ? fullscreenScrollRef.current : null;
    const initialScroll = target0 ? target0.scrollTop : window.scrollY;
    const PX_PER_SECOND_BASE = 24;
    const scroll = (ts: number) => {
      const target = isFullscreen ? fullscreenScrollRef.current : null;
      if (smartScroll && youtubeDuration > 0) {
        const totalScrollable = target
          ? target.scrollHeight - target.clientHeight
          : document.documentElement.scrollHeight - window.innerHeight;
        const elapsedMs = performance.now() - smartScrollStartRef.current;
        const ratio = Math.min(1, elapsedMs / (youtubeDuration * 1000));
        const next = initialScroll + (totalScrollable - initialScroll) * ratio;
        if (target) target.scrollTop = next;
        else window.scrollTo(0, next);
      } else {
        if (!scrollLastTsRef.current) scrollLastTsRef.current = ts;
        const dt = Math.min(64, ts - scrollLastTsRef.current);
        scrollLastTsRef.current = ts;
        scrollAccumRef.current += (PX_PER_SECOND_BASE * scrollSpeed * dt) / 1000;
        if (scrollAccumRef.current >= 1) {
          const px = Math.floor(scrollAccumRef.current);
          scrollAccumRef.current -= px;
          if (target) target.scrollTop += px;
          else window.scrollBy(0, px);
        }
      }
      animRef.current = requestAnimationFrame(scroll);
    };
    animRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScrolling, scrollSpeed, isFullscreen, smartScroll, youtubeDuration, fullscreenScrollRef]);

  return {
    autoScrolling,
    setAutoScrolling,
    scrollSpeed,
    setScrollSpeed,
    smartScroll,
    setSmartScroll,
  };
}
