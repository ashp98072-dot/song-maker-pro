import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerAwaitingSessionPanel } from '@/features/director-session/components/FollowerAwaitingSessionPanel';
import { useFollowV3Song } from '@/features/director-session/follow-v3/followV3Store';

/**
 * Full-screen overlay while follower waits for director broadcast after join.
 * Hides once Follow V3 has a song so a stuck awaiting flag cannot lock the UI.
 */
export function FollowerJoinAwaitingOverlay() {
  const { liveIsFollower, followerAwaitingDirector } = useSpectatorSession();
  const followSongId = useFollowV3Song();

  if (!liveIsFollower || !followerAwaitingDirector) return null;
  if (followSongId) return null;

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
