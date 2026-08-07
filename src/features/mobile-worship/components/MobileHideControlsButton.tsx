import { EyeOff } from 'lucide-react';

export interface MobileHideControlsButtonProps {
  onHide: () => void;
  compact?: boolean;
}

export function MobileHideControlsButton({ onHide, compact }: MobileHideControlsButtonProps) {
  return (
    <button
      type="button"
      onClick={onHide}
      className={
        compact
          ? 'flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/25 bg-white/10 text-[9px] font-bold text-white'
          : 'shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/15 text-[10px] font-medium text-white/80 hover:text-white'
      }
      aria-label="Ocultar controles"
      title="Ocultar controles"
    >
      <EyeOff className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {compact ? <span>Ocultar</span> : <span>Ocultar controles</span>}
    </button>
  );
}
