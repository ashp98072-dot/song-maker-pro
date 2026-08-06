/** FASE 5.7 — diagnóstico runtime a partir de eventos FOLLOW_* */

export const SECTION_SYNC_BLOCK_MS = 800;
export const REPLAY_COOLDOWN_MS = 1200;
export const SETTLE_VERIFY_MS = 400;
export const WINDOW_FREEZE_EXTRA_MS = 400;

export type FollowProbableSource =
  | 'section-sync'
  | 'virtual-window'
  | 'replay-recovery'
  | 'browser-anchor'
  | 'unexpected-external-scroll'
  | 'stale-remote-replay'
  | 'unknown';

export type FollowRuntimeEventType =
  | 'unexpected-scroll'
  | 'duplicate'
  | 'residual'
  | 'ignore'
  | 'settled'
  | 'visibility-drift';

export type FollowRuntimeContext = {
  pathname: string;
  remoteIndex: number | null;
  lastAppliedIndex: number | null;
  syncTargetIndex: number | null;
  pendingLanding: boolean;
  landingInProgress: boolean;
  lastSettledAt: number;
  scrollDelta?: number;
  elapsedSinceSettleMs?: number;
  eventTimestamp?: number;
  visibilityIndex?: number | null;
  visibilitySongId?: string | null;
  autoScrolling?: boolean;
  programmaticScrollActive?: boolean;
  probableSourceHint?: string;
  reason?: string;
  remoteUpdatedAt?: string | null;
  lastSettledUpdatedAt?: string | null;
};

export type FollowRuntimeDiagnosis = {
  probableSource: FollowProbableSource;
  confidence: number;
  event: FollowRuntimeEventType;
  remoteIndex: number | null;
  lastAppliedIndex: number | null;
  pathname: string;
};

export function followDiagnosisLog(detail: FollowRuntimeDiagnosis): void {
  console.log('[FOLLOW_DIAGNOSIS]', detail);
}

function parseRemoteMs(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null;
  const ms = Date.parse(updatedAt);
  return Number.isNaN(ms) ? null : ms;
}

export function isStaleRemoteReplay(
  remoteUpdatedAt: string | null | undefined,
  lastSettledAt: number
): boolean {
  if (!remoteUpdatedAt || lastSettledAt <= 0) return false;
  const remoteMs = parseRemoteMs(remoteUpdatedAt);
  if (remoteMs == null) return false;
  return remoteMs < lastSettledAt;
}

export function isWithinReplayCooldown(
  remoteIndex: number,
  lastAppliedIndex: number | null,
  lastSettledAt: number
): boolean {
  if (lastAppliedIndex == null || remoteIndex !== lastAppliedIndex) return false;
  if (lastSettledAt <= 0) return false;
  return Date.now() - lastSettledAt < REPLAY_COOLDOWN_MS;
}

export function isSectionSyncBlocked(
  pendingLanding: boolean,
  landingInProgress: boolean,
  lastSettledAt: number
): boolean {
  if (pendingLanding || landingInProgress) return true;
  if (lastSettledAt <= 0) return false;
  return Date.now() - lastSettledAt < SECTION_SYNC_BLOCK_MS;
}

export function analyzeFollowerRuntimeEvent(input: {
  event: FollowRuntimeEventType;
  ctx: FollowRuntimeContext;
}): FollowRuntimeDiagnosis {
  const { event, ctx } = input;
  const hint = (ctx.probableSourceHint ?? ctx.reason ?? '').toLowerCase();
  const elapsed = ctx.elapsedSinceSettleMs ?? -1;
  const scrollDelta = Math.abs(ctx.scrollDelta ?? 0);

  let probableSource: FollowProbableSource = 'unknown';
  let confidence = 0.45;

  if (
    ctx.remoteUpdatedAt &&
    isStaleRemoteReplay(ctx.remoteUpdatedAt, ctx.lastSettledAt)
  ) {
    probableSource = 'stale-remote-replay';
    confidence = 0.92;
  } else if (
    hint.includes('stale') ||
    hint.includes('replay') && hint.includes('old')
  ) {
    probableSource = 'stale-remote-replay';
    confidence = 0.85;
  } else if (
    event === 'ignore' &&
    (hint.includes('replay') ||
      hint.includes('recovery') ||
      hint.includes('duplicate recovery'))
  ) {
    probableSource = 'replay-recovery';
    confidence = 0.88;
  } else if (
    event === 'duplicate' &&
    (hint.includes('replay') || hint.includes('visible song'))
  ) {
    probableSource =
      hint.includes('visible') ? 'virtual-window' : 'replay-recovery';
    confidence = hint.includes('visible') ? 0.82 : 0.9;
  } else if (
    hint.includes('section') ||
    hint.includes('anchor') ||
    (event === 'unexpected-scroll' && elapsed >= 0 && elapsed < 500)
  ) {
    probableSource = 'section-sync';
    confidence = 0.84;
  } else if (
    hint.includes('virtual') ||
    hint.includes('remount') ||
    hint.includes('element missing') ||
    hint.includes('visibility feedback') ||
    (ctx.visibilityIndex != null &&
      ctx.remoteIndex != null &&
      ctx.visibilityIndex !== ctx.remoteIndex &&
      (ctx.pendingLanding || ctx.landingInProgress || elapsed < 600))
  ) {
    probableSource = 'virtual-window';
    confidence = 0.86;
  } else if (ctx.autoScrolling || hint.includes('autoscroll')) {
    probableSource = 'browser-anchor';
    confidence = 0.8;
  } else if (
    hint.includes('scroll drift') ||
    hint.includes('anchored') ||
    hint.includes('scrollintoview') ||
    (event === 'unexpected-scroll' && scrollDelta > 8 && scrollDelta < 120)
  ) {
    probableSource = 'browser-anchor';
    confidence = 0.78;
  } else if (
    ctx.pendingLanding ||
    ctx.landingInProgress ||
    hint.includes('landing')
  ) {
    probableSource = 'virtual-window';
    confidence = 0.72;
  } else if (event === 'unexpected-scroll') {
    probableSource = 'unexpected-external-scroll';
    confidence = scrollDelta > 40 ? 0.82 : 0.65;
  } else if (event === 'residual') {
    probableSource = 'unexpected-external-scroll';
    confidence = 0.75;
  }

  if (confidence > 0.8 && probableSource === 'unknown') {
    probableSource = 'unexpected-external-scroll';
    confidence = 0.81;
  }

  return {
    probableSource,
    confidence: Math.min(1, Math.max(0, confidence)),
    event,
    remoteIndex: ctx.remoteIndex,
    lastAppliedIndex: ctx.lastAppliedIndex,
    pathname: ctx.pathname,
  };
}

export function emitFollowerDiagnosis(
  event: FollowRuntimeEventType,
  ctx: FollowRuntimeContext
): FollowRuntimeDiagnosis {
  const diagnosis = analyzeFollowerRuntimeEvent({ event, ctx });
  followDiagnosisLog(diagnosis);
  return diagnosis;
}
