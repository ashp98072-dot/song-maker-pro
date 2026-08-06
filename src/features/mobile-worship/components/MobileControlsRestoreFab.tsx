import { SlidersHorizontal } from 'lucide-react';
import { useDraggableFabPosition } from '@/features/mobile-worship/hooks/useDraggableFabPosition';

export interface MobileControlsRestoreFabProps {
  visible: boolean;
  onShow: () => void;
}

/**
 * Minimal draggable FAB to restore controls on mobile teleprompter.
 * Icon-only, edge-snapped — keeps lyrics unobstructed.
 */
export function MobileControlsRestoreFab({ visible, onShow }: MobileControlsRestoreFabProps) {
  const drag = useDraggableFabPosition();

  if (!visible) return null;

  return (
    <button
      type="button"
      data-mobile-controls-restore
      className="lg:hidden fixed z-[128] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-gold/90 shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-sm touch-none select-none active:scale-95 active:bg-black/70"
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
    </button>
  );
}
