import { Music2, X } from 'lucide-react';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';

export function SpectatorSessionBanner() {
  const {
    showAvailableBanner,
    detectedCode,
    dismissBanner,
    reunirseASesion,
    salirDeSesion,
  } = useSpectatorSession();

  if (!showAvailableBanner || !detectedCode) return null;

  return (
    <div
      role="status"
      className="sticky z-[60] border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-md app-spectator-banner-safe"
    >
      <div className="container max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music2 className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-amber-300">Sesión activa disponible</span>
            <span className="font-mono tracking-widest ml-2 text-amber-200">{detectedCode}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={reunirseASesion}
            className="px-3 py-1.5 rounded-lg gold-gradient text-primary-foreground text-xs font-bold uppercase tracking-wide"
          >
            Reunirme a la sesión
          </button>
          <button
            type="button"
            onClick={salirDeSesion}
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/10"
          >
            Salir de sesión
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Ignorar
          </button>
        </div>
      </div>
    </div>
  );
}
