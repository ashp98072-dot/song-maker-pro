import { useMemo } from 'react';

/** Ventana de render: canción visible ± buffer (lazy render). */
export function useVirtualSongWindow(
  visibleIndex: number,
  total: number,
  buffer = 2
) {
  return useMemo(() => {
    if (total <= 0) return { start: 0, end: -1, isEmpty: true };
    const start = Math.max(0, visibleIndex - buffer);
    const end = Math.min(total - 1, visibleIndex + buffer);
    return { start, end, isEmpty: false };
  }, [visibleIndex, total, buffer]);
}

export function isIndexInWindow(index: number, start: number, end: number): boolean {
  return index >= start && index <= end;
}
