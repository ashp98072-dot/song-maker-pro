import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const SCROLL_DOWN_THRESHOLD = 10;
const SCROLL_UP_THRESHOLD = 6;
const SCROLL_IDLE_MS = 200;
const TOUCH_REVEAL_MS = 2500;
/** Tras navegar a canción / primer paint PWA: dock siempre visible. */
const MOUNT_GRACE_MS = 2000;

function devLog(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (detail !== undefined) console.log(message, detail);
  else console.log(message);
}

export interface UseMobileDockStateOptions {
  scrollRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  autoScrolling: boolean;
  isFullscreen: boolean;
}

/**
 * Visibilidad inteligente del dock: scroll, tap y reglas de bloqueo (sheet / autoscroll / fullscreen).
 */
export function useMobileDockState({
  scrollRef,
  enabled,
  autoScrolling,
  isFullscreen,
}: UseMobileDockStateOptions) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dockVisible, setDockVisible] = useState(true);

  const mountedAtRef = useRef(Date.now());
  const touchHoldUntilRef = useRef(0);
  const sheetOpenRef = useRef(sheetOpen);
  const enabledRef = useRef(enabled);
  sheetOpenRef.current = sheetOpen;
  enabledRef.current = enabled;

  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;

    if (!enabled) {
      if (import.meta.env.DEV) {
        devLog('[MobileDock] hidden by rule', 'dock disabled (not mobile or page hidden)');
      }
      return;
    }

    if (!wasEnabled && enabled) {
      mountedAtRef.current = Date.now();
      setDockVisible(true);
      devLog('[MobileDock] mount', { graceMs: MOUNT_GRACE_MS });
    }
  }, [enabled]);

  const setVisible = useCallback((visible: boolean, reason: string) => {
    setDockVisible((prev) => {
      if (prev === visible) return prev;
      if (import.meta.env.DEV) {
        if (visible) devLog('[MobileDock] visible', reason);
        else devLog('[MobileDock] hidden reason', reason);
      }
      return visible;
    });
  }, []);

  const canAutoHide = useCallback(() => {
    if (!enabled) return false;
    if (Date.now() - mountedAtRef.current < MOUNT_GRACE_MS) return false;
    if (sheetOpenRef.current) return false;
    if (autoScrolling) return false;
    if (isFullscreen) return false;
    if (Date.now() < touchHoldUntilRef.current) return false;
    return true;
  }, [enabled, autoScrolling, isFullscreen]);

  const revealFromTouch = useCallback(() => {
    if (!enabled) return;
    touchHoldUntilRef.current = Date.now() + TOUCH_REVEAL_MS;
    setVisible(true, 'touch reveal');
  }, [enabled, setVisible]);

  useEffect(() => {
    if (!enabled) {
      setDockVisible(true);
      return;
    }
    if (sheetOpen || autoScrolling || isFullscreen) {
      setVisible(true, 'forced visible (sheet/autoscroll/fullscreen)');
    }
  }, [enabled, sheetOpen, autoScrolling, isFullscreen, setVisible]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = () => revealFromTouch();
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [enabled, revealFromTouch]);

  useEffect(() => {
    if (!enabled) return;

    let cleanupScroll: (() => void) | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastY = 0;

    const attachScroll = (): boolean => {
      const el = scrollRef.current;
      if (!el) return false;

      lastY = el.scrollTop;

      const onScroll = () => {
        const y = el.scrollTop;
        const delta = y - lastY;

        if (delta > SCROLL_DOWN_THRESHOLD && canAutoHide()) {
          setVisible(false, 'scroll down');
        } else if (delta < -SCROLL_UP_THRESHOLD) {
          setVisible(true, 'scroll up');
        }

        lastY = y;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (canAutoHide()) setVisible(true, 'scroll idle');
        }, SCROLL_IDLE_MS);
      };

      el.addEventListener('scroll', onScroll, { passive: true });
      cleanupScroll = () => {
        el.removeEventListener('scroll', onScroll);
        if (idleTimer) clearTimeout(idleTimer);
      };
      return true;
    };

    if (!attachScroll()) {
      const raf = requestAnimationFrame(() => attachScroll());
      const timers = [0, 50, 150, 300].map((ms) =>
        window.setTimeout(() => attachScroll(), ms)
      );
      return () => {
        cancelAnimationFrame(raf);
        timers.forEach((id) => clearTimeout(id));
        cleanupScroll?.();
      };
    }

    return () => cleanupScroll?.();
  }, [enabled, scrollRef, canAutoHide, setVisible]);

  return {
    sheetOpen,
    setSheetOpen,
    dockVisible: enabled ? dockVisible : false,
  };
}
