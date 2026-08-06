import {
  resolveTeleprompterLivePill,
  type TeleprompterLiveKind,
  type TeleprompterLiveTone,
} from '@/features/mobile-worship/utils/teleprompterLivePill';

const TONE_CLASS: Record<TeleprompterLiveTone, string> = {
  live: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
  follow: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
  paused: 'border-white/25 bg-black/50 text-white/70',
  warn: 'border-amber-300/40 bg-amber-500/15 text-amber-100',
  offline: 'border-red-400/45 bg-red-500/20 text-red-200',
};

export interface TeleprompterLivePillProps {
  visible: boolean;
  role: TeleprompterLiveKind | 'idle' | null | undefined;
  connected: boolean;
  connecting?: boolean;
  followDirector?: boolean;
  /** Optional: open controls on tap */
  onTap?: () => void;
}

/**
 * Tiny top-center live status for mobile teleprompter.
 * Does not cover lyrics body; tap restores controls when provided.
 */
export function TeleprompterLivePill({
  visible,
  role,
  connected,
  connecting,
  followDirector,
  onTap,
}: TeleprompterLivePillProps) {
  if (!visible) return null;

  const model = resolveTeleprompterLivePill({
    role,
    connected,
    connecting,
    followDirector,
  });
  if (!model) return null;

  const className = `lg:hidden fixed z-[127] left-1/2 -translate-x-1/2 top-[max(0.4rem,env(safe-area-inset-top))] flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.35)] ${TONE_CLASS[model.tone]} ${
    onTap ? 'cursor-pointer active:scale-95' : 'pointer-events-none'
  }`;

  const body = (
    <>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          model.tone === 'offline'
            ? 'bg-red-400'
            : model.tone === 'warn'
              ? 'bg-amber-300 animate-pulse'
              : model.tone === 'paused'
                ? 'bg-white/50'
                : model.tone === 'live'
                  ? 'bg-amber-300 animate-pulse'
                  : 'bg-emerald-300'
        }`}
        aria-hidden
      />
      {model.label}
    </>
  );

  if (onTap) {
    return (
      <button
        type="button"
        data-teleprompter-live-pill
        className={className}
        title={`${model.title} · toca para controles`}
        aria-label={`${model.title}. Mostrar controles`}
        onClick={onTap}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-teleprompter-live-pill
      className={className}
      title={model.title}
      role="status"
      aria-live="polite"
    >
      {body}
    </div>
  );
}
