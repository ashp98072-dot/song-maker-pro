import { resolveSharedViewMode, type ViewMode } from '@/types/music';
import type { SharedSessionState } from '@/features/director-session/types';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';
import {
  isContinuousRecoveryReady,
  type SessionRecoveryState,
} from '@/features/director-session/utils/sessionRecovery';

console.log('[BOOT_IMPORT]', 'followerJoinNavigation');

export type JoinNavigationTarget =
  | { type: 'continuous-live'; listId: string; songId: string | null; currentIndex: number }
  | { type: 'song'; songId: string; listId: string | null }
  | { type: 'list'; listId: string }
  | { type: 'none' };

export function sharedStateToRecovery(
  code: string,
  state: SharedSessionState,
  sessionOrigin: SessionRecoveryState['sessionOrigin'] = null
): SessionRecoveryState {
  const listSongIds = state.listSongIds ?? [];
  let songId = state.currentSongId ?? null;
  if (!songId && listSongIds.length > 0) {
    const idx = Math.max(0, state.currentIndex ?? 0);
    songId = listSongIds[idx] ?? listSongIds[0] ?? null;
  }

  return {
    code,
    directorId: '',
    songId,
    listId: state.listId ?? null,
    listSongIds,
    semitones: state.customSemitones,
    bpm: null,
    currentKey: null,
    viewMode: state.viewMode,
    genderShift:
      state.genderShift === 'male'
        ? 'male'
        : state.genderShift === 'female'
          ? 'female'
          : 'original',
    currentIndex: state.currentIndex ?? 0,
    sharedSectionAnchor: state.sharedSectionAnchor ?? null,
    followDirector: readFollowDirector(),
    isActive: true,
    sessionOrigin,
  };
}

/** Whether follower should open the continuous live setlist route. */
export function shouldNavigateToContinuousLive(recovery: SessionRecoveryState): boolean {
  if (recovery.viewMode === 'continuous' && recovery.listId) return true;
  const resolved = resolveSharedViewMode(
    recovery.viewMode,
    recovery.listId,
    recovery.listSongIds
  );
  return resolved === 'continuous' && !!recovery.listId;
}

export function describeJoinNavigationTarget(recovery: SessionRecoveryState): JoinNavigationTarget {
  if (shouldNavigateToContinuousLive(recovery) && recovery.listId) {
    return {
      type: 'continuous-live',
      listId: recovery.listId,
      songId: recovery.songId,
      currentIndex: recovery.currentIndex,
    };
  }
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

export function buildJoinNavigationKey(
  code: string,
  recovery: SessionRecoveryState,
  target?: JoinNavigationTarget
): string {
  const resolved = target ?? describeJoinNavigationTarget(recovery);
  if (resolved.type === 'none') return '';
  return `${code}|${resolved.type}|${recovery.songId ?? ''}|${recovery.listId ?? ''}|${recovery.viewMode}|${recovery.currentIndex}`;
}

/** @deprecated Prefer shouldNavigateToContinuousLive — kept for callers using 2+ songs rule. */
export { isContinuousRecoveryReady };
