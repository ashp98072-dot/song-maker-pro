import { useParams } from 'react-router-dom';
import { FEATURES } from '@/config/features';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';

/** Spectator + followDirector + V3: legacy follow/render/recovery pipelines must not run. */
export function shouldDisableLegacyFollowPipeline(
  role?: 'director' | 'follower' | null
): boolean {
  if (!FEATURES.USE_FOLLOW_V3 || !readFollowDirector()) return false;
  if (role === 'director') return false;
  return true;
}

/** Route param fallback when V3 store has no song yet (deep link / manual URL). */
export function getFollowV3CurrentSongId(routeSongId: string | undefined): string | null {
  const trimmed = routeSongId?.trim();
  return trimmed ? trimmed : null;
}

export function useFollowV3CurrentSongId(): string | null {
  const { id } = useParams();
  return getFollowV3CurrentSongId(id);
}

export function parseFollowV3SongIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/cancion\/([^/]+)/);
  return match?.[1] ?? null;
}
