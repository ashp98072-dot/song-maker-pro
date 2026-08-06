import { useLocation } from 'react-router-dom';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerAwaitingSessionPanel } from '@/features/director-session/components/FollowerAwaitingSessionPanel';
import { useFollowV3Song } from '@/features/director-session/follow-v3/followV3Store';

/**
 * Full-screen overlay while follower waits for director broadcast after join.
 * Never lock the UI when we already have a song (V3 store or /cancion route).
 */
export function FollowerJoinAwaitingOverlay() {
  const location = useLocation();
  const { liveIsFollower, followerAwaitingDirector } = useSpectatorSession();
  const followSongId = useFollowV3Song();
  const onSongRoute = location.pathname.startsWith('/cancion/');

  if (!liveIsFollower || !followerAwaitingDirector) return null;
  if (followSongId || onSongRoute) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <FollowerAwaitingSessionPanel variant="overlay" />
    </div>
  );
}
