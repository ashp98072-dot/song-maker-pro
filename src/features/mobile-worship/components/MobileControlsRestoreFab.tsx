import { SlidersHorizontal } from 'lucide-react';

export interface MobileControlsRestoreFabProps {
  visible: boolean;
  onShow: () => void;
}

/** FAB móvil para restaurar controles de transposición (solo &lt; lg). */
export function MobileControlsRestoreFab({ visible, onShow }: MobileControlsRestoreFabProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onShow}
      data-mobile-controls-restore
      className="lg:hidden fixed left-1/2 -translate-x-1/2 z-[128] flex items-center gap-2 px-4 py-2.5 rounded-full border border-gold/45 bg-black/85 text-gold text-xs font-bold uppercase tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md ios-safe-fixed-bottom-center transition-transform active:scale-95"
      aria-label="Mostrar controles de transposición"
    >
      <SlidersHorizontal className="w-4 h-4" aria-hidden />
      Mostrar controles
    </button>
  );
}
