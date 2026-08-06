import { useState } from 'react';
import { Church, Loader2 } from 'lucide-react';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import {
  startWorshipServiceMode,
  type WorshipServiceModeInput,
} from '@/features/mobile-worship/utils/worshipServiceMode';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';

type Props = {
  hideControls: () => void;
  input: WorshipServiceModeInput;
  /** Compact dock style */
  compact?: boolean;
  onStarted?: () => void;
};

/**
 * One-tap: create/join as director live + teleprompter + share link.
 */
export function WorshipServiceModeButton({
  hideControls,
  input,
  compact,
  onStarted,
}: Props) {
  const live = useSimpleLiveSyncOptional();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    worshipHaptic();
    setBusy(true);
    try {
      const ok = await startWorshipServiceMode({
        live,
        hideControls,
        input,
        share: true,
      });
      if (ok) onStarted?.();
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-amber-400/40 bg-amber-500/15 text-[9px] font-bold text-amber-200 disabled:opacity-50"
        aria-label="Modo culto"
        title="Modo culto: en vivo + teleprompter + compartir"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Church className="w-4 h-4" />}
        <span>Culto</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-400/40 bg-amber-500/15 text-sm font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Church className="w-4 h-4" />}
      {busy ? 'Activando…' : 'Modo culto'}
    </button>
  );
}
