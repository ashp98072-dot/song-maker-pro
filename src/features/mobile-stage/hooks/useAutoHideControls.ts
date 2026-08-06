import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_HIDE_MS = 4500;

export function useAutoHideControls(enabled: boolean, hideAfterMs = DEFAULT_HIDE_MS) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setControlsVisible(false), hideAfterMs);
  }, [enabled, hideAfterMs]);

  useEffect(() => {
    if (!enabled) {
      setControlsVisible(true);
      return;
    }
    bumpControls();
    const opts: AddEventListenerOptions = { passive: true };
    const onActivity = () => bumpControls();
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('pointerdown', onActivity, opts);
    window.addEventListener('scroll', onActivity, opts);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('keydown', onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, bumpControls]);

  return { controlsVisible, bumpControls };
}
