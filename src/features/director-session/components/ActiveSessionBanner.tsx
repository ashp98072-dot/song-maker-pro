import { Music2, X } from 'lucide-react';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';

export function ActiveSessionBanner() {
  const {
    showAvailableBanner,
    liveSessionStatus,
    sessionCodeDisplay,
    detectedRole,
    sessionOriginLabel: originLabel,
    directorAwayFromScope,
    volverASesion,
    ignorarSesion,
    continuarSesionDirector,
    cerrarSesionDirector,
    salirDeSesion,
    redirigirSesion,
  } = useSpectatorSession();

  if (!showAvailableBanner || !sessionCodeDisplay || liveSessionStatus !== 'detected') {
    return null;
  }

  const isDirector = detectedRole === 'director';

  const title = 'Sesi?n activa';
  let subtitle: string | null = null;

  if (directorAwayFromScope && isDirector) {
    subtitle = 'Est?s fuera de la sesi?n actual.';
  } else if (originLabel) {
    subtitle = isDirector ? `en ${originLabel}` : `director en ${originLabel}`;
  } else if (!isDirector) {
    subtitle = 'director en esta lista';
  }

  return (
    <div
      role="status"
      className="sticky z-[60] border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-md app-spectator-banner-safe"
    >
      <div className="container max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music2 className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-amber-300">{title}</span>
            {subtitle ? <span className="text-muted-foreground ml-1">? {subtitle}</span> : null}
            <span className="font-mono tracking-widest ml-2 text-amber-200">{sessionCodeDisplay}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isDirector ? (
            <>
              <button
                type="button"
                onClick={() => void continuarSesionDirector()}
                className="px-3 py-1.5 rounded-lg gold-gradient text-primary-foreground text-xs font-bold uppercase tracking-wide"
              >
                Reanudar sesi?n
              </button>
              {directorAwayFromScope ? (
                <button
                  type="button"
                  onClick={() => void redirigirSesion()}
                  className="px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-200 text-xs font-semibold hover:bg-amber-500/15"
                >
                  Redirigir sesi?n
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void cerrarSesionDirector()}
                className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/10"
              >
                Cerrar sesi?n
              </button>
              <button
                type="button"
                onClick={ignorarSesion}
                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground"
              >
                Ignorar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void volverASesion()}
                className="px-3 py-1.5 rounded-lg gold-gradient text-primary-foreground text-xs font-bold uppercase tracking-wide"
              >
                Volver a sesi?n
              </button>
              <button
                type="button"
                onClick={ignorarSesion}
                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Ignorar
              </button>
              <button
                type="button"
                onClick={salirDeSesion}
                className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/10"
              >
                Salir de sesi?n
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
