import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';
import { FOLLOWER_AWAITING_SAFETY_TIMEOUT_MS } from '@/features/director-session/utils/followerAwaitingConstants';

type FollowerAwaitingSessionPanelProps = {
  variant?: 'overlay' | 'inline';
  sessionCode?: string | null;
};

/**
 * Shared UI for follower waiting on director sync (overlay + inline loaders).
 */
export function FollowerAwaitingSessionPanel({
  variant = 'inline',
  sessionCode,
}: FollowerAwaitingSessionPanelProps) {
  const {
    liveFollowerCode,
    cancelFollowerConnection,
    setFollowDirectorPreference,
    requestFollowerCurrentState,
    debugFollowerDb,
    goHomeFromFollowerOverlay,
  } = useSpectatorSession();
  const code = (sessionCode ?? liveFollowerCode ?? '').trim();
  const [followDirector, setFollowDirector] = useState(() => readFollowDirector());
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeoutSec = Math.round(FOLLOWER_AWAITING_SAFETY_TIMEOUT_MS / 1000);
  const remainingSec = Math.max(0, timeoutSec - elapsedSec);

  const wrapperClass =
    variant === 'overlay'
      ? 'mx-4 w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg'
      : 'mx-auto w-full max-w-md text-center';

  const handleFollowToggle = (checked: boolean) => {
    setFollowDirector(checked);
    setFollowDirectorPreference(checked);
  };

  return (
    <div className={wrapperClass}>
      <Loader2
        className={`mx-auto text-gold animate-spin ${variant === 'overlay' ? 'mb-4 h-10 w-10' : 'mb-4 h-12 w-12'}`}
        aria-hidden
      />
      <p className="text-lg font-medium text-foreground">
        Esperando sincronización con el director…
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Esperando desde hace {elapsedSec} {elapsedSec === 1 ? 'segundo' : 'segundos'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Recibiendo vista, lista e índice de la sesión en vivo.
      </p>

      {code ? (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Código de sesión
          </p>
          <p className="mt-1 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 font-mono text-xl font-semibold tracking-[0.2em] text-foreground">
            Sesión {code}
          </p>
        </div>
      ) : null}

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-left">
        <span className="text-sm font-medium text-foreground">Seguir al director</span>
        <input
          type="checkbox"
          checked={followDirector}
          onChange={(e) => handleFollowToggle(e.target.checked)}
          className="h-5 w-5 accent-gold"
        />
      </label>
      {!followDirector ? (
        <p className="mt-2 text-xs text-amber-400/90">
          Modo escucha: no cambiará canción ni vista automáticamente.
        </p>
      ) : null}

      {remainingSec > 0 && elapsedSec >= 8 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Si no hay respuesta, la conexión se cancelará en {remainingSec}s.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => goHomeFromFollowerOverlay()}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-border bg-muted px-5 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted/80"
      >
        Ir a Home
      </button>

      <button
        type="button"
        onClick={() => void debugFollowerDb()}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/25"
      >
        Debug DB (RPC)
      </button>

      {import.meta.env.DEV ? (
        <button
          type="button"
          onClick={() => requestFollowerCurrentState()}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-blue-500/50 bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
        >
          Forzar sincronización (dev)
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => cancelFollowerConnection()}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/60 bg-red-600/20 px-5 py-3.5 text-base font-semibold text-red-300 transition-colors hover:bg-red-600/35"
      >
        <X className="h-5 w-5 shrink-0" aria-hidden />
        Cancelar conexión
      </button>
    </div>
  );
}
