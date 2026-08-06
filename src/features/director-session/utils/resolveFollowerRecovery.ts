import type { SharedSessionState } from '@/features/director-session/types';
import type { SessionOrigin } from '@/features/director-session/utils/sessionOrigin';
import { sharedStateToRecovery } from '@/features/director-session/utils/followerJoinNavigation';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';
import type { FollowerRecoverySource } from '@/features/director-session/utils/followerRecoveryLog';

const SOURCE_PRIORITY: Record<FollowerRecoverySource, number> = {
  'shared-session': 3,
  db: 2,
  route: 1,
  fallback: 0,
};

export function parseRemoteUpdatedAtMs(remote: SharedSessionState | null | undefined): number {
  if (!remote?.updatedAt) return 0;
  const ms = Date.parse(remote.updatedAt);
  return Number.isNaN(ms) ? 0 : ms;
}

export function pickFresherRecovery(
  a: SessionRecoveryState,
  b: SessionRecoveryState,
  aSource: FollowerRecoverySource,
  bSource: FollowerRecoverySource
): { recovery: SessionRecoveryState; source: FollowerRecoverySource } {
  const aIdx = a.currentIndex ?? 0;
  const bIdx = b.currentIndex ?? 0;
  if (aIdx !== bIdx) {
    return aIdx > bIdx ? { recovery: a, source: aSource } : { recovery: b, source: bSource };
  }
  if (SOURCE_PRIORITY[aSource] >= SOURCE_PRIORITY[bSource]) {
    return { recovery: a, source: aSource };
  }
  return { recovery: b, source: bSource };
}

/**
 * Follower reconnect priority: shared-session latest → live_sessions DB → fallback null.
 * Never uses visibility, persisted lastSongId, or browser scroll.
 */
export function resolveFollowerRecovery(params: {
  code: string;
  remote: SharedSessionState | null;
  dbRecovery: SessionRecoveryState | null;
  sessionOrigin?: SessionOrigin | null;
}): { recovery: SessionRecoveryState | null; source: FollowerRecoverySource } {
  const remoteRecovery =
    params.remote?.currentSongId != null
      ? sharedStateToRecovery(params.code, params.remote, params.sessionOrigin ?? null)
      : null;

  if (remoteRecovery && params.dbRecovery) {
    return pickFresherRecovery(remoteRecovery, params.dbRecovery, 'shared-session', 'db');
  }
  if (remoteRecovery) {
    return { recovery: remoteRecovery, source: 'shared-session' };
  }
  if (params.dbRecovery) {
    return { recovery: params.dbRecovery, source: 'db' };
  }
  return { recovery: null, source: 'fallback' };
}

/** Skip replaying an older recovery when shared-session already has a newer index. */
export function isStaleHistoricalReplay(
  candidate: SessionRecoveryState,
  remote: SharedSessionState | null,
  lastSettledUpdatedAtMs = 0
): boolean {
  if (!remote?.currentSongId) return false;
  const remoteIdx = remote.currentIndex ?? 0;
  const candidateIdx = candidate.currentIndex ?? 0;
  if (candidateIdx < remoteIdx) return true;

  const remoteMs = parseRemoteUpdatedAtMs(remote);
  if (remoteMs <= 0 || lastSettledUpdatedAtMs <= 0) return false;
  const candidateMs = remoteMs;
  if (candidateIdx === remoteIdx && candidateMs < lastSettledUpdatedAtMs - 50) {
    return true;
  }
  return false;
}

export function shouldSkipReconnectReplay(
  sequenceId: number,
  replayHandledForSequence: number
): boolean {
  return replayHandledForSequence === sequenceId;
}
