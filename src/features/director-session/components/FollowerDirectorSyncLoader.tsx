import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerAwaitingSessionPanel } from '@/features/director-session/components/FollowerAwaitingSessionPanel';

type FollowerDirectorSyncLoaderProps = {
  className?: string;
  sessionCode?: string | null;
};

/** Inline loader while follower waits for director broadcast (SongView / Continuous). */
export function FollowerDirectorSyncLoader({
  className = '',
  sessionCode,
}: FollowerDirectorSyncLoaderProps) {
  const { liveIsFollower, followerAwaitingDirector } = useSpectatorSession();

  if (!liveIsFollower) return null;

  return (
    <div
      className={`flex min-h-[50vh] flex-col items-center justify-center bg-background px-4 py-16 ${className}`}
      role="status"
      aria-live="polite"
    >
      <FollowerAwaitingSessionPanel variant="inline" sessionCode={sessionCode} />
      <p className="mt-4 max-w-sm text-center text-sm text-muted-foreground">
        {followerAwaitingDirector
          ? 'Esperando sincronización con el director…'
          : 'Esperando lista del director…'}
      </p>
    </div>
  );
}
