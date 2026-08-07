import { Copy, LogOut, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { shareNative } from '@/utils/shareNative';
import { buildLiveJoinUrl } from '@/features/simple-live-sync/liveJoinUrl';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';

export type MobileLiveSessionBarProps = {
  visible: boolean;
  role: 'director' | 'follower';
  code: string;
  onLeave: () => void | Promise<void>;
  /** When true, sit above safe-area top (teleprompter / stage). */
  floating?: boolean;
  /** Tap the status/code area to restore chrome (teleprompter). */
  onRevealControls?: () => void;
  followDirector?: boolean;
  onFollowDirectorChange?: (on: boolean) => void;
};

/**
 * Compact mobile live chrome: código visible + salir.
 * Siempre disponible en teléfono (incluye teleprompter / escenario).
 */
export function MobileLiveSessionBar({
  visible,
  role,
  code,
  onLeave,
  floating = false,
  onRevealControls,
  followDirector,
  onFollowDirectorChange,
}: MobileLiveSessionBarProps) {
  if (!visible || !code) return null;

  const joinUrl = buildLiveJoinUrl(code);
  const isDirector = role === 'director';

  const copy = async () => {
    worshipHaptic();
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Código copiado: ${code}`);
    } catch {
      toast.message(code);
    }
  };

  const share = async () => {
    worshipHaptic();
    const ok = await shareNative({
      title: 'Sesión en vivo',
      text: `Únete con el código ${code}`,
      url: joinUrl,
    });
    if (!ok) {
      try {
        await navigator.clipboard.writeText(joinUrl || code);
        toast.success('Enlace copiado');
      } catch {
        toast.message(code);
      }
    }
  };

  const leave = () => {
    worshipHaptic();
    void onLeave();
  };

  return (
    <div
      data-mobile-live-session-bar
      className={`lg:hidden z-[130] ${
        floating
          ? 'fixed inset-x-2 top-[max(0.35rem,env(safe-area-inset-top))]'
          : 'sticky top-2 mb-3 mx-0'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 shadow-lg backdrop-blur-md ${
          isDirector
            ? 'border-amber-400/40 bg-amber-950/90 text-amber-100'
            : 'border-emerald-400/40 bg-emerald-950/90 text-emerald-100'
        }`}
      >
        <button
          type="button"
          className={`min-w-0 flex-1 flex items-center gap-1.5 text-left ${
            onRevealControls ? 'active:opacity-80' : ''
          }`}
          onClick={() => {
            if (!onRevealControls) return;
            worshipHaptic();
            onRevealControls();
          }}
          disabled={!onRevealControls}
          title={onRevealControls ? 'Toca para mostrar controles' : undefined}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-none">
              {isDirector ? 'Transmitiendo' : 'Siguiendo'}
              {onRevealControls ? ' · tocar' : ''}
            </p>
            <p className="font-mono text-base font-black tracking-[0.2em] leading-tight truncate">
              {code}
            </p>
          </div>
        </button>
        {isDirector ? (
          <>
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 rounded-lg border border-white/15 bg-black/25 p-2"
              aria-label="Copiar código"
              title="Copiar código"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="shrink-0 rounded-lg border border-white/15 bg-black/25 p-2"
              aria-label="Compartir"
              title="Compartir"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : onFollowDirectorChange ? (
          <label className="shrink-0 flex items-center gap-1 rounded-lg border border-white/15 bg-black/25 px-2 py-1.5 text-[10px] font-bold">
            <input
              type="checkbox"
              checked={!!followDirector}
              onChange={(e) => {
                worshipHaptic();
                onFollowDirectorChange(e.target.checked);
              }}
              className="h-3 w-3 accent-gold"
            />
            Seguir
          </label>
        ) : null}
        <button
          type="button"
          onClick={leave}
          className="shrink-0 flex items-center gap-1 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          aria-label={isDirector ? 'Detener sesión' : 'Salir de la sesión'}
        >
          <LogOut className="h-3.5 w-3.5" />
          {isDirector ? 'Detener' : 'Salir'}
        </button>
      </div>
    </div>
  );
}
