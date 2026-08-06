import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerAwaitingSessionPanel } from '@/features/director-session/components/FollowerAwaitingSessionPanel';

/**
 * Full-screen overlay while follower waits for director broadcast after join.
 */
export function FollowerJoinAwaitingOverlay() {
  const { liveIsFollower, followerAwaitingDirector } = useSpectatorSession();

  if (!liveIsFollower || !followerAwaitingDirector) return null;

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
