import { followTrace } from '@/features/director-session/utils/followTrace';

export type DirectorContinuousState = {
  currentSongId: string | null;
  currentIndex: number;
  currentSectionAnchor: string | null;
};

export type DirectorIntentAction =
  | 'prev'
  | 'next'
  | 'mini-nav'
  | 'navigate-song'
  | 'scroll-to-song'
  | 'route-initial'
  | 'persisted-restore'
  | 'enter-continuous'
  | 'section-anchor'
  | 'recovery'
  | 'connection'
  | 'request-publish'
  | 'song-start'
  | 'stable-visibility'
  | 'stable-song-change';

export function directorIntentLog(detail: {
  action: DirectorIntentAction | string;
  index: number;
  songId: string | null;
}): void {
  console.log('[DIRECTOR_INTENT]', detail);
}

export function directorPublishIntentLog(detail: {
  source: 'intent' | 'stable-visibility';
  action: DirectorIntentAction | string;
  index: number;
  songId: string | null;
  sectionAnchor?: string | null;
}): void {
  console.log('[DIRECTOR_PUBLISH]', detail);
  followTrace('FOLLOW_PUBLISH_INTENT', {
    actor: 'director',
    songId: detail.songId ?? undefined,
    remoteIndex: detail.index,
    remoteSongId: detail.songId ?? undefined,
    reason: detail.action,
    source: detail.source,
    extra: { sectionAnchor: detail.sectionAnchor ?? null },
  });
}

export function directorStableVisibilityLog(detail: {
  songId: string;
  index: number;
  stableMs: number;
}): void {
  console.log('[DIRECTOR_STABLE_VISIBILITY]', detail);
}

export function directorVisibilityIgnoredLog(detail: {
  ignored: true;
  currentSongIndex: number;
  currentSongId: string;
  currentSection?: string;
}): void {
  console.log('[DIRECTOR_VISIBILITY]', detail);
}

export function createInitialDirectorContinuousState(
  songIds: string[],
  opts?: { initialSongId?: string; initialIndex?: number }
): DirectorContinuousState {
  const index =
    typeof opts?.initialIndex === 'number' && opts.initialIndex >= 0
      ? Math.min(opts.initialIndex, Math.max(0, songIds.length - 1))
      : 0;
  const songId =
    opts?.initialSongId ??
    (songIds[index] ?? songIds[0] ?? null);
  return {
    currentSongId: songId,
    currentIndex: index,
    currentSectionAnchor: null,
  };
}
