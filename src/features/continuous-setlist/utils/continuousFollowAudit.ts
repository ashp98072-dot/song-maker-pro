import {
  verifyFollowerSongLanded,
  resolveContinuousSongElement,
} from '@/features/continuous-setlist/utils/continuousFollowLanding';

export type FollowAuditSnapshot = {
  source: string;
  pathname: string;
  currentRemoteIndex: number | null;
  lastAppliedIndex: number | null;
  pendingLanding: { index: number; songId: string } | null;
  syncTargetIndex: number | null;
  landingInProgress: boolean;
};

export function followPipelineLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_PIPELINE]', detail);
}

export function followResidualLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_RESIDUAL]', detail);
}

export function followDuplicateLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_DUPLICATE]', detail);
}

export function followIgnoreLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_IGNORE]', detail);
}

export function followUnexpectedScrollLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_UNEXPECTED_SCROLL]', detail);
}

const SONG_SELECTOR = '[data-continuous-song-id]';

/** Índice visible en DOM (solo lectura; no es SoT de sync). */
export function readVisibleSongIndexFromDom(
  scrollRoot: HTMLElement,
  songIds: string[]
): { index: number; songId: string } | null {
  if (songIds.length === 0) return null;

  const rootRect = scrollRoot.getBoundingClientRect();
  const viewportMid = rootRect.top + rootRect.height * 0.35;

  const songEls = scrollRoot.querySelectorAll<HTMLElement>(SONG_SELECTOR);
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

  return { index: bestIndex, songId: bestSongId };
}

const SETTLE_VERIFY_MS = 500;
const SCROLL_DRIFT_PX = 28;

export type SettleVerifyCallbacks = {
  onDuplicate: (detail: Record<string, unknown>) => void;
  onUnexpectedScroll: (detail: Record<string, unknown>) => void;
};

/**
 * Tras FOLLOW_SETTLED, vigila ~400ms scroll/índice visible inesperados.
 */
export function runFollowerSettleVerification(
  opts: {
    scrollRoot: HTMLElement;
    songIds: string[];
    remoteIndex: number;
    remoteSongId: string;
    baselineScrollTop: number;
  } & SettleVerifyCallbacks
): void {
  const {
    scrollRoot,
    songIds,
    remoteIndex,
    remoteSongId,
    baselineScrollTop,
    onDuplicate,
    onUnexpectedScroll,
  } = opts;

  const startedAt = Date.now();
  let lastScrollTop = baselineScrollTop;

  const tick = () => {
    const elapsed = Date.now() - startedAt;
    const scrollTop = scrollRoot.scrollTop;

    if (
      Math.abs(scrollTop - lastScrollTop) > SCROLL_DRIFT_PX &&
      Math.abs(scrollTop - baselineScrollTop) > SCROLL_DRIFT_PX
    ) {
      onUnexpectedScroll({
        reason: 'scroll drift after settle',
        elapsedMs: elapsed,
        scrollTop,
        baselineScrollTop,
        delta: scrollTop - baselineScrollTop,
        probableSource: 'post-settle side effect',
      });
    }
    lastScrollTop = scrollTop;

    const stillLanded = verifyFollowerSongLanded(
      scrollRoot,
      remoteSongId,
      remoteIndex
    );
    if (!stillLanded) {
      onUnexpectedScroll({
        reason: 'remote song no longer anchored after settle',
        elapsedMs: elapsed,
        remoteIndex,
        remoteSongId,
        probableSource: 'virtual window or section scroll',
      });
    }

    const visible = readVisibleSongIndexFromDom(scrollRoot, songIds);
    if (
      visible &&
      remoteIndex >= 0 &&
      visible.index !== remoteIndex &&
      visible.songId !== remoteSongId
    ) {
      onDuplicate({
        reason: 'visible song index changed after settle',
        elapsedMs: elapsed,
        expectedIndex: remoteIndex,
        expectedSongId: remoteSongId,
        visibleIndex: visible.index,
        visibleSongId: visible.songId,
        probableSource: 'visibility feedback or residual scroll',
      });
    }

    const el = resolveContinuousSongElement(scrollRoot, remoteSongId, remoteIndex);
    if (!el) {
      onUnexpectedScroll({
        reason: 'remote song element missing after settle',
        elapsedMs: elapsed,
        remoteIndex,
        remoteSongId,
      });
    }

    if (elapsed < SETTLE_VERIFY_MS) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}
