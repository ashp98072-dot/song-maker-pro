import type { NavigateFunction } from 'react-router-dom';
import { getSongPathById } from '@/utils/songSlug';
import { shouldDisableLegacyFollowPipeline } from '@/features/director-session/follow-v3/followV3Ownership';
import { followTrace } from '@/features/director-session/utils/followTrace';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';

export type NavigateFollowerSongViewOnlyOpts = {
  navigate: NavigateFunction;
  followDirector?: boolean;
  songId: string | null | undefined;
  remoteIndex?: number | null;
  listId?: string | null;
  listSongIds?: string[];
  joinSessionCode?: string;
};

/**
 * FASE A — when continuous-live is frozen for followers, navigate to SongView only.
 * Returns true when navigation was applied (caller should return early).
 * Under Follow V3 the legacy pipeline is disabled elsewhere — return false so
 * callers do not treat a no-op as successful navigation and skip fallbacks.
 */
export function navigateFollowerSongViewOnly(
  opts: NavigateFollowerSongViewOnlyOpts
): boolean {
  if (shouldDisableLegacyFollowPipeline('follower')) return false;

  const followDirector = opts.followDirector ?? true;
  if (!followDirector || isFollowerContinuousEnabled(followDirector)) {
    return false;
  }

  const songId = opts.songId;
  if (!songId) return false;

  followTrace('FOLLOW_CONTINUOUS_DISABLED', {
    actor: 'spectator',
    reason: 'feature-flag-off',
    remoteSongId: songId,
    remoteIndex: opts.remoteIndex ?? undefined,
    extra: {
      reason: 'feature-flag-off',
      remoteSongId: songId,
      remoteIndex: opts.remoteIndex ?? null,
    },
  });

  opts.navigate(getSongPathById(songId), {
    state: {
      listId: opts.listId ?? undefined,
      listSongIds: opts.listSongIds,
      joinSessionCode: opts.joinSessionCode,
      currentIndex: opts.remoteIndex ?? undefined,
    },
  });

  return true;
}
