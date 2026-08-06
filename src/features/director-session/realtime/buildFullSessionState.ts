import type { ViewMode } from '@/types/music';
import { resolveSharedViewMode } from '@/types/music';
import type { SharedSessionState } from '@/features/director-session/types';
import type { LiveSessionBroadcastState } from '@/features/director-session/live/liveSessionTypes';
import { toSharedGenderShift } from '@/features/director-session/utils/genderShift';
import { normalizeSessionCode } from '@/features/director-session/types';

/** Ensures every outbound shared-session broadcast carries navigation/sync fields. */
export function normalizeOutgoingSharedSession(
  sessionId: string,
  state: SharedSessionState
): SharedSessionState {
  const key = normalizeSessionCode(sessionId);
  const listId = state.listId ?? null;
  const listSongIds = state.listSongIds ?? [];
  const currentIndex =
    typeof state.currentIndex === 'number' && state.currentIndex >= 0
      ? state.currentIndex
      : 0;

  return {
    sessionId: key,
    currentSongId: state.currentSongId,
    currentIndex,
    listId,
    listSongIds: listSongIds.length > 0 ? listSongIds : undefined,
    customSemitones: state.customSemitones ?? 0,
    genderShift: state.genderShift ?? 'original',
    viewMode: resolveSharedViewMode(state.viewMode ?? 'musician', listId, listSongIds),
    ...(state.sharedSectionAnchor
      ? { sharedSectionAnchor: state.sharedSectionAnchor }
      : {}),
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };
}

/** Build a complete shared-session payload from the director broadcast ref snapshot. */
export function buildSharedSessionFromBroadcast(
  sessionId: string,
  broadcast: LiveSessionBroadcastState
): SharedSessionState | null {
  const songId = broadcast.songId?.trim();
  if (!songId) return null;

  const listId = broadcast.listId ?? null;
  const listSongIds = broadcast.listSongIds?.length ? broadcast.listSongIds : [];
  return normalizeOutgoingSharedSession(sessionId, {
    sessionId: normalizeSessionCode(sessionId),
    currentSongId: songId,
    currentIndex:
      typeof broadcast.currentIndex === 'number' && broadcast.currentIndex >= 0
        ? broadcast.currentIndex
        : 0,
    listId,
    listSongIds,
    customSemitones: broadcast.semitones ?? 0,
    genderShift: toSharedGenderShift(broadcast.genderShift ?? ''),
    viewMode: (broadcast.viewMode ?? 'musician') as ViewMode,
    sharedSectionAnchor: broadcast.sharedSectionAnchor,
    updatedAt: new Date().toISOString(),
  });
}
