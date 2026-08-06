import { SlidersHorizontal } from 'lucide-react';
import { useDraggableFabPosition } from '@/features/mobile-worship/hooks/useDraggableFabPosition';

export interface MobileControlsRestoreFabProps {
  visible: boolean;
  onShow: () => void;
}

/**
 * Compact, draggable FAB to restore transpose controls on mobile.
 * Defaults to a side edge so it does not block lyrics.
 */
export function MobileControlsRestoreFab({ visible, onShow }: MobileControlsRestoreFabProps) {
  const drag = useDraggableFabPosition();

  if (!visible) return null;

  return (
    <button
      type="button"
      data-mobile-controls-restore
      className="lg:hidden fixed z-[128] flex items-center justify-center gap-1 rounded-full border border-gold/50 bg-black/80 text-gold shadow-[0_6px_18px_rgba(0,0,0,0.45)] backdrop-blur-md touch-none select-none active:scale-95 w-11 h-11 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5"
      style={drag.style}
      aria-label="Mostrar controles (arrastra para mover)"
      title="Toca para mostrar · mantén y arrastra para mover"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={(e) => {
        drag.onPointerUp(e);
        if (!drag.didDrag()) onShow();
      }}
      onPointerCancel={drag.onPointerUp}
    >
      <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide">
        Controles
      </span>
    </button>
  );
}
