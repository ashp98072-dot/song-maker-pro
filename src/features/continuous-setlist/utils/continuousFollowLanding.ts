import { followTrace } from '@/features/director-session/utils/followTrace';
import { isIndexInWindow } from '@/features/continuous-setlist/hooks/useVirtualSongWindow';
import {
  followFailedLog,
  followRenderReadyLog,
  followScrollLog,
} from '@/features/continuous-setlist/utils/continuousFollowSyncLog';
import { queryContinuousSongElement } from '@/features/continuous-setlist/utils/continuousSongSync';

const RENDER_FALLBACK_MS = 2500;

function escapeIndex(index: number): string {
  return String(index);
}

export function queryContinuousSongByIndex(
  root: ParentNode,
  index: number
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[data-continuous-song-index="${escapeIndex(index)}"]`
  );
}

export function resolveContinuousSongElement(
  root: ParentNode,
  remoteSongId: string,
  remoteIndex: number
): HTMLElement | null {
  return (
    queryContinuousSongElement(root, remoteSongId) ??
    (remoteIndex >= 0 ? queryContinuousSongByIndex(root, remoteIndex) : null)
  );
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function waitAnimationFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await nextFrame();
  }
}

export type EnsureRemoteSongRenderedOpts = {
  scrollRoot: HTMLElement;
  remoteIndex: number;
  remoteSongId: string;
  windowStart: number;
  windowEnd: number;
};

/**
 * Espera a que el índice remoto esté en ventana virtual y el nodo exista en DOM.
 * Orden: rAF → MutationObserver → timeout fallback.
 */
export function ensureRemoteSongRendered(
  opts: EnsureRemoteSongRenderedOpts
): Promise<boolean> {
  const { scrollRoot, remoteIndex, remoteSongId, windowStart, windowEnd } = opts;

  if (
    remoteIndex >= 0 &&
    !isIndexInWindow(remoteIndex, windowStart, windowEnd)
  ) {
    followTrace('FOLLOW_LANDING_ABORT', {
      actor: 'spectator',
      page: 'continuous-live',
      remoteIndex,
      remoteSongId,
      reason: 'index-outside-window',
      extra: { windowStart, windowEnd },
    });
    return Promise.resolve(false);
  }

  const findEl = () =>
    resolveContinuousSongElement(scrollRoot, remoteSongId, remoteIndex);

  return new Promise((resolve) => {
    let settled = false;
    let observer: MutationObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      if (fallbackTimer != null) clearTimeout(fallbackTimer);
      if (ok) {
        followRenderReadyLog({ remoteIndex });
        followTrace('FOLLOW_LANDING_READY', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex,
          remoteSongId,
          reason: 'dom-rendered',
        });
      } else {
        followFailedLog({
          reason: 'render not ready',
          remoteIndex,
          remoteSongId,
        });
        followTrace('FOLLOW_LANDING_ABORT', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex,
          remoteSongId,
          reason: 'render-not-ready',
        });
      }
      resolve(ok);
    };

    const check = (): boolean => {
      if (findEl()) {
        finish(true);
        return true;
      }
      return false;
    };

    void nextFrame().then(() => {
      if (check()) return;

      observer = new MutationObserver(() => {
        check();
      });
      observer.observe(scrollRoot, { childList: true, subtree: true });

      fallbackTimer = setTimeout(() => {
        finish(!!findEl());
      }, RENDER_FALLBACK_MS);
    });
  });
}

function stickyTopOffsetPx(root: HTMLElement): number {
  const toolbar = document.querySelector<HTMLElement>(
    '.continuous-toolbar, [data-continuous-toolbar]'
  );
  if (toolbar) return toolbar.getBoundingClientRect().height + 8;
  const rootRect = root.getBoundingClientRect();
  return Math.max(48, rootRect.top > 0 ? rootRect.top : 0);
}

function correctiveScrollSongToTop(
  scrollRoot: HTMLElement,
  el: HTMLElement
): void {
  const offset = stickyTopOffsetPx(scrollRoot);
  const rootRect = scrollRoot.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const targetTop = scrollRoot.scrollTop + (elRect.top - rootRect.top) - offset;
  scrollRoot.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
}

/** Verifica que el bloque remoto quedó anclado arriba del viewport de scroll. */
export function verifyFollowerSongLanded(
  scrollRoot: HTMLElement,
  remoteSongId: string,
  remoteIndex: number
): boolean {
  const el = resolveContinuousSongElement(
    scrollRoot,
    remoteSongId,
    remoteIndex
  );
  if (!el) return false;

  const offset = stickyTopOffsetPx(scrollRoot);
  const rootRect = scrollRoot.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const topDelta = elRect.top - rootRect.top;
  return topDelta >= -24 && topDelta <= offset + 48;
}

export type ScrollFollowerResult = { success: boolean; retry: number };

/**
 * Scroll determinístico: scrollIntoView → rAF×2 → verify → corrective scrollTo (1×) → verify.
 */
export async function scrollFollowerToExactSong(opts: {
  scrollRoot: HTMLElement;
  remoteSongId: string;
  remoteIndex: number;
}): Promise<ScrollFollowerResult> {
  const { scrollRoot, remoteSongId, remoteIndex } = opts;

  followTrace('FOLLOW_LANDING_START', {
    actor: 'spectator',
    page: 'continuous-live',
    remoteIndex,
    remoteSongId,
    reason: 'scroll-to-exact-song',
    extra: { scrollY: scrollRoot.scrollTop },
  });

  const el = resolveContinuousSongElement(scrollRoot, remoteSongId, remoteIndex);
  if (!el) {
    followTrace('FOLLOW_LANDING_ABORT', {
      actor: 'spectator',
      page: 'continuous-live',
      remoteIndex,
      remoteSongId,
      reason: 'scroll-element-missing',
    });
    followScrollLog({ success: false, retry: 0, reason: 'element missing' });
    followFailedLog({ reason: 'scroll element missing', remoteSongId, remoteIndex });
    return { success: false, retry: 0 };
  }

  el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  await waitAnimationFrames(2);

  let landed = verifyFollowerSongLanded(scrollRoot, remoteSongId, remoteIndex);
  followScrollLog({ success: landed, retry: 0, reason: landed ? 'smooth' : 'needs-corrective' });

  let usedCorrective = false;
  if (!landed) {
    correctiveScrollSongToTop(scrollRoot, el);
    usedCorrective = true;
    await waitAnimationFrames(2);
    landed = verifyFollowerSongLanded(scrollRoot, remoteSongId, remoteIndex);
    followScrollLog({
      success: landed,
      retry: 1,
      reason: landed ? 'corrective-scrollTo' : 'corrective-failed',
    });
  }

  if (landed) {
    return { success: true, retry: usedCorrective ? 1 : 0 };
  }

  followFailedLog({
    reason: 'scroll corrective exhausted',
    remoteSongId,
    remoteIndex,
  });
  return { success: false, retry: 1 };
}
