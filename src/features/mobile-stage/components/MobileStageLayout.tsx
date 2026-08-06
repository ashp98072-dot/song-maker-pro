import type { ReactNode } from 'react';

interface MobileStageLayoutProps {
  active: boolean;
  isLandscape: boolean;
  children: ReactNode;
}

/** Envuelve SongView con atributos de modo escenario (solo cuando active en móvil). */
export function MobileStageLayout({ active, isLandscape, children }: MobileStageLayoutProps) {
  return (
    <div
      data-mobile-stage={active ? 'active' : 'inactive'}
      data-mobile-landscape={isLandscape ? 'true' : 'false'}
      className={
        active
          ? 'mobile-stage-root min-h-[100dvh] bg-background text-foreground'
          : undefined
      }
    >
      {children}
    </div>
  );
}
