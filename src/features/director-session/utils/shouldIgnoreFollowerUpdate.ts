import { followTrace, traceFollow } from '@/features/director-session/utils/followTrace';
import { isContinuousLiveSimpleMode } from '@/features/director-session/utils/followerViewMode';

export type ShouldIgnoreFollowerUpdateInput = {
  source: string;
  currentIndex: number | null;
  songId: string | null;
  lastAppliedIndex?: number | null;
  pendingLandingIndex?: number | null;
  navKey: string;
  previousNavKey: string | null;
  previousIndex?: number | null;
  previousSongId?: string | null;
  isLiveMounted: boolean;
  isFollowerLiveOwner: boolean;
  followDirector: boolean;
  recoverySequenceKey?: string | null;
  pathname?: string;
};

export type ShouldIgnoreFollowerUpdateResult = {
  ignore: boolean;
  reason: string;
};

export function followDedupeDecisionLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_DEDUPE_DECISION]', detail);
}

export function followDedupeAllowLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_DEDUPE_ALLOW]', detail);
  followTrace('FOLLOW_DEDUPE_ALLOW', {
    reason: String(detail.reason ?? ''),
    source: String(detail.source ?? ''),
    extra: detail,
  });
}

export function followDedupeBlockLog(detail: Record<string, unknown>): void {
  const callStack = new Error('FOLLOW_DEDUPE_BLOCK').stack?.split('\n').slice(1, 6);
  console.log('[FOLLOW_DEDUPE_BLOCK]', detail);
  followTrace('FOLLOW_DEDUPE_BLOCK', {
    reason: String(detail.reason ?? ''),
    source: String(detail.source ?? ''),
    songId: detail.songId != null ? String(detail.songId) : undefined,
    remoteIndex: typeof detail.currentIndex === 'number' ? detail.currentIndex : undefined,
    currentRoute: detail.pathname != null ? String(detail.pathname) : undefined,
    extra: { ...detail, callStack },
  });
}

/**
 * Recovery/join dedupe — never ignore when director song or index actually changed.
 */
export function shouldIgnoreFollowerUpdate(
  input: ShouldIgnoreFollowerUpdateInput
): ShouldIgnoreFollowerUpdateResult {
  const index = input.currentIndex;
  const songId = input.songId;
  const prevIndex = input.previousIndex ?? null;
  const prevSongId = input.previousSongId ?? null;

  const decisionBase = {
    source: input.source,
    navKey: input.navKey,
    currentIndex: index,
    songId,
    previousNavKey: input.previousNavKey,
    previousIndex: prevIndex,
    previousSongId: prevSongId,
    liveMounted: input.isLiveMounted,
    pageOwner: input.isFollowerLiveOwner,
    followDirector: input.followDirector,
    lastAppliedIndex: input.lastAppliedIndex ?? null,
    pendingLandingIndex: input.pendingLandingIndex ?? null,
    recoverySequenceKey: input.recoverySequenceKey ?? null,
    pathname: input.pathname ?? null,
  };

  followDedupeDecisionLog(decisionBase);

  const pathname = input.pathname ?? '';
  traceFollow('FOLLOW_DEDUPE_GATE', {
    pathname,
    followDirector: input.followDirector,
    shouldBypass: pathname?.includes('/live') && input.followDirector,
  });
  if (
    input.followDirector &&
    pathname.length > 0 &&
    isContinuousLiveSimpleMode(pathname)
  ) {
    traceFollow('FOLLOW_DEDUPE_BYPASSED_ACTIVE', {
      pathname,
      followDirector: input.followDirector,
    });
    followTrace('FOLLOW_DEDUPE_BYPASSED', {
      actor: 'spectator',
      currentRoute: pathname,
      reason: 'continuous-live-simple-mode',
      extra: {
        reason: 'continuous-live-simple-mode',
        navKey: input.navKey,
        pathname,
        currentIndex: index,
      },
    });
    const result = { ignore: false, reason: 'continuous-live-simple-mode' };
    followDedupeAllowLog({ ...decisionBase, ...result });
    return result;
  }

  if (songId != null && prevSongId != null && songId !== prevSongId) {
    const result = { ignore: false, reason: 'song-id-changed' };
    followDedupeAllowLog({ ...decisionBase, ...result });
    return result;
  }

  if (index != null && prevIndex != null && index !== prevIndex) {
    const result = { ignore: false, reason: 'index-changed' };
    followDedupeAllowLog({ ...decisionBase, ...result });
    return result;
  }

  const navMatch =
    input.navKey.length > 0 &&
    input.previousNavKey != null &&
    input.previousNavKey === input.navKey;

  if (!navMatch) {
    const result = { ignore: false, reason: 'nav-key-new' };
    followDedupeAllowLog({ ...decisionBase, ...result });
    return result;
  }

  if (input.isLiveMounted && input.isFollowerLiveOwner && input.followDirector) {
    const result = { ignore: true, reason: 'duplicate-nav-key-live' };
    followDedupeBlockLog({ ...decisionBase, ...result });
    return result;
  }

  const result = {
    ignore: true,
    reason:
      input.source === 'join-nav'
        ? 'nav already applied'
        : 'page recovery already dispatched',
  };
  followDedupeBlockLog({ ...decisionBase, ...result });
  return result;
}
