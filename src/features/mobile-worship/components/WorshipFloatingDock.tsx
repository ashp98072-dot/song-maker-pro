import { Menu } from 'lucide-react';
import { FloatingDockShell } from '@/components/FloatingDockShell';
import { useIsLandscape } from '@/features/mobile-stage/hooks/useIsMobileViewport';
import { useMobileDockState } from '@/features/mobile-worship/hooks/useMobileDockState';
import { QuickTransposeControls } from '@/features/mobile-worship/components/QuickTransposeControls';
import { WorshipControlSheet } from '@/features/mobile-worship/components/WorshipControlSheet';
import { MobileHideControlsButton } from '@/features/mobile-worship/components/MobileHideControlsButton';
import { WorshipServiceModeButton } from '@/features/mobile-worship/components/WorshipServiceModeButton';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import type { WorshipFloatingDockProps } from '@/features/mobile-worship/types';
import type { WorshipServiceModeInput } from '@/features/mobile-worship/utils/worshipServiceMode';

function DockActionButtons({
  onOpenSheet,
  sheetOpen,
  layout,
  onHideControls,
  serviceModeInput,
}: {
  onOpenSheet: () => void;
  sheetOpen: boolean;
  layout: 'horizontal' | 'vertical';
  onHideControls?: () => void;
  serviceModeInput?: WorshipServiceModeInput | null;
}) {
  const wrapClass =
    layout === 'vertical'
      ? 'flex flex-col items-center gap-1.5'
      : 'flex items-center gap-1.5 shrink-0';

  return (
    <div className={wrapClass}>
      {onHideControls ? (
        <MobileHideControlsButton compact onHide={onHideControls} />
      ) : null}
      {onHideControls && serviceModeInput ? (
        <WorshipServiceModeButton
          compact
          hideControls={onHideControls}
          input={serviceModeInput}
        />
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          worshipHaptic();
          onOpenSheet();
        }}
        aria-label="Más herramientas"
        aria-expanded={sheetOpen}
        className="flex items-center gap-1.5 min-h-[2.75rem] px-3 rounded-xl border border-gold bg-gold text-primary-foreground text-xs font-bold shadow-md transition-all active:scale-95"
      >
        <Menu className="w-4 h-4 shrink-0" aria-hidden />
        Más
      </button>
    </div>
  );
}

/**
 * Dock móvil de adoración (&lt; lg). Coexiste con MobileStageDock (no se muestran a la vez).
 */
export function WorshipFloatingDock({
  visible,
  mobileViewport,
  scrollRef,
  controlsHidden = false,
  onHideControls,
  displayKey,
  genderShift,
  customSemitones,
  autoScrolling,
  isFullscreen,
  onTransposeDown,
  onTransposeUp,
  onSetCustomSemitones,
  onGenderToggle,
  onGenderSelect,
  onResetTranspose,
  onToggleAutoScroll,
  serviceModeInput = null,
  sheet,
}: WorshipFloatingDockProps) {
  const isLandscape = useIsLandscape();
  const isMobile = mobileViewport;
  const landscapeDock = isMobile && isLandscape;

  const dockEnabled = visible && isMobile && !controlsHidden;

  const { sheetOpen, setSheetOpen, dockVisible } = useMobileDockState({
    scrollRef,
    enabled: dockEnabled,
    autoScrolling,
    isFullscreen,
  });

  if (!isMobile || !visible || controlsHidden) return null;

  const transposeProps = {
    displayKey,
    genderShift,
    customSemitones,
    onTransposeDown,
    onTransposeUp,
    onSetCustomSemitones,
    onGenderToggle,
    onGenderSelect,
  };

  const handleHide = () => {
    worshipHaptic();
    setSheetOpen(false);
    onHideControls?.();
  };

  const openSheet = () => setSheetOpen(true);
  /** Dock chrome only when sheet is closed — unmount avoids focus + aria-hidden traps. */
  const showDock = dockVisible && !sheetOpen;

  const actionProps = {
    onOpenSheet: openSheet,
    sheetOpen,
    onHideControls: onHideControls ? handleHide : undefined,
    serviceModeInput,
  };

  const sheetNode = (
    <WorshipControlSheet
      {...sheet}
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      onHideControls={onHideControls ? handleHide : undefined}
      serviceModeInput={serviceModeInput}
    />
  );

  if (landscapeDock) {
    return (
      <>
        {showDock ? (
          <div
            className="lg:hidden fixed right-0 top-1/2 z-[122] pointer-events-none -translate-y-1/2"
            style={{
              paddingRight: 'max(0.35rem, env(safe-area-inset-right))',
              paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
              transform: 'translateY(-50%)',
            }}
            data-worship-floating-dock
            data-worship-landscape
          >
            <div className="pointer-events-auto flex flex-col gap-1.5 p-1.5 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl">
              <QuickTransposeControls {...transposeProps} layout="vertical" />
              <DockActionButtons {...actionProps} layout="vertical" />
            </div>
          </div>
        ) : null}
        {sheetNode}
      </>
    );
  }

  return (
    <>
      {showDock ? (
        <div className="lg:hidden" data-worship-floating-dock>
          <FloatingDockShell visible controlsVisible compact onPointerDown={() => {}}>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <QuickTransposeControls {...transposeProps} layout="horizontal" />
              <DockActionButtons {...actionProps} layout="horizontal" />
            </div>
          </FloatingDockShell>
        </div>
      ) : null}
      {sheetNode}
    </>
  );
}
