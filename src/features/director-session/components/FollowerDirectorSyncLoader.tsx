import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerAwaitingSessionPanel } from '@/features/director-session/components/FollowerAwaitingSessionPanel';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';

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
  const simpleLive = useSimpleLiveSyncOptional();
  const simpleFollower =
    simpleLive?.role === 'follower' && !!simpleLive.code;
  const code = (sessionCode ?? simpleLive?.code ?? '').trim();

  if (!liveIsFollower && !simpleFollower) return null;

  if (simpleFollower && !liveIsFollower) {
    return (
      <div
        className={`flex min-h-[50vh] flex-col items-center justify-center bg-background px-4 py-16 ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mb-4 h-12 w-12 text-gold animate-spin" aria-hidden />
        <p className="text-lg font-medium text-foreground">Esperando lista del director…</p>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Ya estás en la sesión. Esperando canciones e índice.
        </p>
        {code ? (
          <p className="mt-4 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 font-mono text-xl font-semibold tracking-[0.2em] text-foreground">
            {code}
          </p>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            await simpleLive!.leave();
            toast.success('Saliste de la sesión');
          }}
          className="mt-6 px-4 py-2 rounded-lg border border-border text-sm font-bold"
        >
          Salir de la sesión
        </button>
      </div>
    );
  }

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
