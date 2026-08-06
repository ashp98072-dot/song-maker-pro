import { followTrace } from '@/features/director-session/utils/followTrace';
import { followViewmodeLog } from '@/features/director-session/utils/followerRecoveryLog';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';
import { readLiveSessionPersistence } from '@/features/director-session/utils/liveSessionPersistence';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';
import {
  describeJoinNavigationTarget,
  type JoinNavigationTarget,
} from '@/features/director-session/utils/followerJoinNavigation';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';
import { getSongPathById } from '@/utils/songSlug';

console.log('[BOOT_IMPORT]', 'followerViewMode');

export type FollowerViewSurface = 'song' | 'continuous';

export function parseContinuousListIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/setlist\/([^/]+)\/live\/?/);
  return match?.[1] ?? null;
}

/** FASE 1 — bypass page-recovery / nav dedupe on any /live route. */
export function isContinuousLiveSimpleMode(pathname: string): boolean {
  return pathname.includes('/live');
}

/** Follower is on /setlist/:listId/live (optional listId must match when provided). */
export function isFollowerInContinuousMode(pathname: string, listId?: string | null): boolean {
  const liveListId = parseContinuousListIdFromPath(pathname);
  if (!liveListId) return false;
  if (listId && liveListId !== listId) return false;
  return true;
}

/** TRUE when follower should stay on continuous live for this list — no route to SongView. */
export function shouldRetainFollowerViewMode(pathname: string, listId: string | null): boolean {
  if (!listId) return false;
  if (!isFollowerContinuousEnabled(readFollowDirector())) return false;
  return isFollowerInContinuousMode(pathname, listId);
}

export function followViewLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_VIEW]', detail);
}

export function followSongviewBlockLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_SONGVIEW_BLOCK]', detail);
}

export function followViewEnforcedLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_VIEW_ENFORCED]', detail);
}

export function followLiveLockLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_LIVE_LOCK]', detail);
}

export function followLiveHardLockLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_LIVE_HARD_LOCK]', detail);
}

export function followOwnerLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_OWNER]', detail);
}

export function followSongviewLockLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_SONGVIEW_LOCK]', detail);
}

export type FollowerSongViewSyncGuard = {
  active: boolean;
  disableSectionSync: boolean;
  disableAnchorRestore: boolean;
  disableScrollSync: boolean;
};

/** Continuous live page mounted — navigation/sync owned by shared-session handler only. */
export function isFollowerNavigationOwnedByLive(opts: {
  pathname: string;
  followDirector: boolean;
  listId?: string | null;
  hasSharedSessionHandler: boolean;
}): boolean {
  if (!opts.followDirector || !opts.hasSharedSessionHandler) return false;
  if (!isFollowerContinuousEnabled(opts.followDirector)) return false;
  return isFollowerInContinuousMode(opts.pathname, opts.listId);
}

/** Hard block scroll/section effects on SongView when following director continuous. */
export function blockSongViewScrollEffects(guard: FollowerSongViewSyncGuard): boolean {
  return guard.active;
}

export type FollowerLiveRetentionResult = {
  blocked: boolean;
  retainedLiveMode: boolean;
  attemptedNavigation: string;
};

/** Hard lock: follower on /live + followDirector must never navigate to SongView. */
export function enforceFollowerLiveRetention(opts: {
  pathname: string;
  followDirector: boolean;
  targetPath: string;
  source: string;
  listId?: string | null;
}): FollowerLiveRetentionResult {
  const retainedLiveMode =
    opts.followDirector &&
    isFollowerContinuousEnabled(opts.followDirector) &&
    opts.pathname.includes('/live') &&
    (!opts.listId || isFollowerInContinuousMode(opts.pathname, opts.listId));

  const blocked = retainedLiveMode && opts.targetPath.startsWith('/cancion/');

  followTrace('FOLLOW_LIVE_LOCK_DECISION', {
    actor: 'spectator',
    currentRoute: opts.pathname,
    targetRoute: opts.targetPath,
    reason: opts.source,
    extra: {
      allowed: !blocked,
      retainLive: retainedLiveMode,
      followDirector: opts.followDirector,
      listId: opts.listId ?? null,
    },
  });

  if (blocked) {
    followLiveHardLockLog({
      blocked: true,
      retainedLiveMode: true,
      attemptedNavigation: opts.targetPath,
      source: opts.source,
      pathname: opts.pathname,
      listId: opts.listId ?? null,
    });
    followLiveLockLog({
      blocked: true,
      retainedLiveMode: true,
      attemptedNavigation: opts.targetPath,
      source: opts.source,
      pathname: opts.pathname,
      listId: opts.listId ?? null,
    });
    followViewEnforcedLog({
      retainedLiveMode: true,
      attemptedNavigation: opts.targetPath,
      blocked: true,
      pathname: opts.pathname,
      source: opts.source,
    });
  }

  return {
    blocked,
    retainedLiveMode,
    attemptedNavigation: opts.targetPath,
  };
}

export function followTargetLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_TARGET]', detail);
}

export function getFollowerSongViewSyncGuard(
  pathname: string,
  opts: {
    role?: string | null;
    followDirector: boolean;
    listId?: string | null;
  }
): FollowerSongViewSyncGuard {
  const active =
    opts.role === 'follower' &&
    opts.followDirector &&
    isFollowerSongViewOnlySync(pathname, opts.listId);
  return {
    active,
    disableSectionSync: active,
    disableAnchorRestore: active,
    disableScrollSync: active,
  };
}

/** SongView / fuera de live: solo canción, sin scroll continuo ni sección remota. */
export function isFollowerSongViewOnlySync(pathname: string, listId?: string | null): boolean {
  return !isFollowerInContinuousMode(pathname, listId);
}

/**
 * Follower target when following director — respects director viewMode (continuous vs song).
 */
export function resolveFollowerTargetFromDirectorState(
  pathname: string,
  recovery: SessionRecoveryState
): JoinNavigationTarget {
  if (!readFollowDirector()) {
    return resolveFollowerPreferredView(pathname, recovery);
  }

  const directorTarget = describeJoinNavigationTarget(recovery);
  followViewmodeLog({
    reason: 'director-view-target',
    viewMode: recovery.viewMode,
    targetType: directorTarget.type,
    currentIndex: recovery.currentIndex,
    listId: recovery.listId,
    pathname,
  });
  return directorTarget;
}

/** Whether the follower is already on the route that matches the director target. */
export function followerPathMatchesDirectorTarget(
  pathname: string,
  target: JoinNavigationTarget
): boolean {
  if (target.type === 'continuous-live') {
    return isFollowerInContinuousMode(pathname, target.listId);
  }
  if (target.type === 'song') {
    const slugPath = getSongPathById(target.songId);
    const legacyPath = `/cancion/${target.songId}`;
    return (
      pathname === slugPath ||
      pathname === legacyPath ||
      pathname.startsWith(`${slugPath}/`) ||
      pathname.startsWith(`${legacyPath}/`)
    );
  }
  return target.type === 'none';
}

/**
 * Follower navigation/sync target — route retention when NOT strictly following director view.
 * Priority: current route → persisted lastRoute → SongView fallback.
 */
export function resolveFollowerPreferredView(
  pathname: string,
  recovery: SessionRecoveryState
): JoinNavigationTarget {
  if (!isFollowerContinuousEnabled(readFollowDirector())) {
    if (recovery.songId) {
      return {
        type: 'song',
        songId: recovery.songId,
        listId: recovery.listId,
      };
    }
    if (recovery.listId) {
      return { type: 'list', listId: recovery.listId };
    }
    return { type: 'none' };
  }

  if (shouldRetainFollowerViewMode(pathname, recovery.listId)) {
    followViewmodeLog({
      reason: 'follower preferred view retained',
      preferred: 'continuous',
      pathname,
      listId: recovery.listId,
    });
    return {
      type: 'continuous-live',
      listId: recovery.listId!,
      songId: recovery.songId,
      currentIndex: recovery.currentIndex,
    };
  }

  const persistedRoute = readLiveSessionPersistence()?.lastRoute ?? '';
  if (recovery.listId && isFollowerInContinuousMode(persistedRoute, recovery.listId)) {
    followViewmodeLog({
      reason: 'follower preferred view retained',
      preferred: 'continuous',
      source: 'persisted-route',
      lastRoute: persistedRoute,
    });
    return {
      type: 'continuous-live',
      listId: recovery.listId,
      songId: recovery.songId,
      currentIndex: recovery.currentIndex,
    };
  }

  const ideal = describeJoinNavigationTarget(recovery);
  if (ideal.type === 'continuous-live' && recovery.songId) {
    followViewmodeLog({
      reason: 'follower preferred view retained',
      preferred: 'song',
      directorViewMode: recovery.viewMode,
      pathname,
    });
    followViewLog({ mode: 'song', action: 'sync-song-only' });
    return {
      type: 'song',
      songId: recovery.songId,
      listId: recovery.listId,
    };
  }

  return ideal;
}

/** @deprecated Use resolveFollowerPreferredView */
export function resolveFollowerNavigationTarget(
  recovery: SessionRecoveryState,
  pathname: string
): JoinNavigationTarget {
  return resolveFollowerPreferredView(pathname, recovery);
}

export function isExploringOutsideSessionScope(opts: {
  liveIsDirector: boolean;
  liveIsFollower: boolean;
  directorAwayFromScope: boolean;
  passiveListenMode: boolean;
}): boolean {
  if (opts.liveIsDirector && opts.directorAwayFromScope) return true;
  if (opts.liveIsFollower && opts.passiveListenMode) return true;
  return false;
}

export function directorMoveSessionLog(detail: Record<string, unknown>): void {
  console.log('[DIRECTOR_MOVE_SESSION]', detail);
}
