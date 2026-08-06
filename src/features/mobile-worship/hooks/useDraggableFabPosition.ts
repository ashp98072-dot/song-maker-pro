import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const STORAGE_KEY = 'wt_mobile_restore_fab_pos';

export type FabPosition = {
  /** 0–1 from left of viewport */
  x: number;
  /** 0–1 from top of viewport */
  y: number;
};

const DEFAULT_POS: FabPosition = { x: 0.88, y: 0.88 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readPos(): FabPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POS;
    const parsed = JSON.parse(raw) as Partial<FabPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return DEFAULT_POS;
    return {
      x: clamp(parsed.x, 0.05, 0.95),
      y: clamp(parsed.y, 0.08, 0.95),
    };
  } catch {
    return DEFAULT_POS;
  }
}

function writePos(pos: FabPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

/**
 * Draggable FAB position in viewport ratios. Distinguishes tap vs drag.
 */
export function useDraggableFabPosition() {
  const [pos, setPos] = useState<FabPosition>(readPos);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    writePos(pos);
  }, [pos]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
    originRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: pos.x,
      py: pos.y,
    };
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) movedRef.current = true;

    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    setPos({
      x: clamp(originRef.current.px + dx / w, 0.06, 0.94),
      y: clamp(originRef.current.py + dy / h, 0.1, 0.92),
    });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Snap toward nearest horizontal edge for a cleaner teleprompter.
    setPos((prev) => {
      const snapped = {
        x: prev.x < 0.5 ? 0.1 : 0.9,
        y: prev.y,
      };
      writePos(snapped);
      return snapped;
    });
  }, []);

  /** True if the last gesture was a drag (skip click). */
  const didDrag = useCallback(() => movedRef.current, []);

  return {
    pos,
    style: {
      left: `${pos.x * 100}%`,
      top: `${pos.y * 100}%`,
      transform: 'translate(-50%, -50%)',
    } as const,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    didDrag,
  };
}
