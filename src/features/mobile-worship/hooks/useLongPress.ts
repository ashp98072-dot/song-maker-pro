import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface UseLongPressOptions {
  onTap: () => void;
  onLongPress: () => void;
  delayMs?: number;
}

/**
 * Tap vs long-press en botones del dock (sin duplicar listeners globales).
 */
export function useLongPress({ onTap, onLongPress, delayMs = 350 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const longFiredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      longFiredRef.current = false;
      clear();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        onLongPress();
      }, delayMs);
    },
    [clear, delayMs, onLongPress]
  );

  const onPointerUp = useCallback(() => {
    clear();
    if (!longFiredRef.current) onTap();
    longFiredRef.current = false;
  }, [clear, onTap]);

  const onPointerLeave = useCallback(() => {
    clear();
    longFiredRef.current = false;
  }, [clear]);

  const onPointerCancel = onPointerLeave;

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
  };
}
