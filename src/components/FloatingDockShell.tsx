import type { ReactNode } from 'react';

export interface FloatingDockShellProps {
  visible: boolean;
  controlsVisible?: boolean;
  compact?: boolean;
  children: ReactNode;
  onPointerDown?: () => void;
}

/** Dock flotante inferior: blur, safe-area, animación de ocultado. */
export function FloatingDockShell({
  visible,
  controlsVisible = true,
  compact = false,
  children,
  onPointerDown,
}: FloatingDockShellProps) {
  if (!visible) return null;

  return (
    <div
      data-floating-dock
      className={`fixed inset-x-0 bottom-0 z-[125] pointer-events-none transition-transform duration-300 ease-out ${
        controlsVisible ? 'translate-y-0' : 'translate-y-[110%]'
      }`}
    >
      <div
        data-floating-dock-inner
        className={`pointer-events-auto mx-2 mb-2 rounded-2xl border border-white/10 bg-black/75 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.45)] ${
          compact ? 'py-1.5' : 'py-2'
        } max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
        onPointerDown={onPointerDown}
      >
        {children}
      </div>
    </div>
  );
}
