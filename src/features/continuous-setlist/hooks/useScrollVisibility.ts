import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScrollVisibilityState } from '@/features/continuous-setlist/types';

const SONG_SELECTOR = '[data-continuous-song-id]';
const SECTION_SELECTOR = '[data-song-anchor]';

export function useScrollVisibility(
  scrollRootRef: React.RefObject<HTMLElement | null>,
  songIds: string[],
  enabled = true
) {
  const [visibility, setVisibility] = useState<ScrollVisibilityState>({
    currentSongIndex: 0,
    currentSongId: songIds[0] ?? '',
    currentSection: '',
  });
  const rafRef = useRef<number>();

  const measure = useCallback(() => {
    const root = scrollRootRef.current;
    if (!root || songIds.length === 0) return;

    const rootRect = root.getBoundingClientRect();
    const viewportMid = rootRect.top + rootRect.height * 0.35;

    const songEls = root.querySelectorAll<HTMLElement>(SONG_SELECTOR);
    let bestSongId = songIds[0];
    let bestIndex = 0;
    let bestDist = Infinity;

    songEls.forEach((el) => {
      const id = el.dataset.continuousSongId;
      if (!id) return;
      const idx = songIds.indexOf(id);
      if (idx < 0) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.25;
      const dist = Math.abs(mid - viewportMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestSongId = id;
        bestIndex = idx;
      }
    });

    let bestSection = '';
    const sectionEls = root.querySelectorAll<HTMLElement>(SECTION_SELECTOR);
    sectionEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= viewportMid + 40 && rect.bottom >= rootRect.top + 80) {
        bestSection = el.dataset.songAnchor ?? '';
      }
    });

    setVisibility((prev) => {
      if (
        prev.currentSongId === bestSongId &&
        prev.currentSongIndex === bestIndex &&
        prev.currentSection === bestSection
      ) {
        return prev;
      }
      return {
        currentSongIndex: bestIndex,
        currentSongId: bestSongId,
        currentSection: bestSection,
      };
    });
  }, [scrollRootRef, songIds]);

  useEffect(() => {
    if (!enabled) return;
    const root = scrollRootRef.current;
    if (!root) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    measure();

    const io = new IntersectionObserver(() => measure(), {
      root,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    root.querySelectorAll(SONG_SELECTOR).forEach((el) => io.observe(el));

    return () => {
      root.removeEventListener('scroll', onScroll);
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, measure, scrollRootRef, songIds.join(',')]);

  const scrollToSongId = useCallback(
    (songId: string, behavior: ScrollBehavior = 'smooth') => {
      const root = scrollRootRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-continuous-song-id="${songId}"]`);
      el?.scrollIntoView({ behavior, block: 'start' });
    },
    [scrollRootRef]
  );

  const scrollToSongStart = useCallback(
    (songId: string) => scrollToSongId(songId, 'smooth'),
    [scrollToSongId]
  );

  return { visibility, measure, scrollToSongId, scrollToSongStart };
}
