import { MoreHorizontal, Play, Pause, RotateCcw } from 'lucide-react';
import { FloatingDockShell } from '@/components/FloatingDockShell';
import { useIsLandscape } from '@/features/mobile-stage/hooks/useIsMobileViewport';
import { useMobileDockState } from '@/features/mobile-worship/hooks/useMobileDockState';
import { QuickTransposeControls } from '@/features/mobile-worship/components/QuickTransposeControls';
import { DockButton } from '@/features/mobile-worship/components/DockButton';
import { WorshipControlSheet } from '@/features/mobile-worship/components/WorshipControlSheet';
import { MobileHideControlsButton } from '@/features/mobile-worship/components/MobileHideControlsButton';
import { WorshipServiceModeButton } from '@/features/mobile-worship/components/WorshipServiceModeButton';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import type { WorshipFloatingDockProps } from '@/features/mobile-worship/types';
import type { WorshipServiceModeInput } from '@/features/mobile-worship/utils/worshipServiceMode';

function DockActionButtons({
  autoScrolling,
  onResetTranspose,
  onToggleAutoScroll,
  onOpenSheet,
  sheetOpen,
  layout,
  onHideControls,
  serviceModeInput,
}: {
  autoScrolling: boolean;
  onResetTranspose: () => void;
  onToggleAutoScroll: () => void;
  onOpenSheet: () => void;
  sheetOpen: boolean;
  layout: 'horizontal' | 'vertical';
  onHideControls?: () => void;
  serviceModeInput?: WorshipServiceModeInput | null;
}) {
  const wrapClass =
    layout === 'vertical'
      ? 'flex flex-col items-center gap-1'
      : 'flex items-center gap-1 shrink-0';

  return (
    <div className={wrapClass}>
      {onHideControls && serviceModeInput ? (
        <WorshipServiceModeButton
          compact
          hideControls={onHideControls}
          input={serviceModeInput}
          onStarted={() => {
            /* sheet closed by hide */
          }}
        />
      ) : null}
      {onHideControls ? <MobileHideControlsButton compact onHide={onHideControls} /> : null}
      <DockButton
        onClick={() => {
          worshipHaptic();
          onResetTranspose();
        }}
        label="Reset tono original"
      >
        <RotateCcw className="w-4 h-4" />
      </DockButton>
      <DockButton
        onClick={onToggleAutoScroll}
        active={autoScrolling}
        label={autoScrolling ? 'Detener auto-scroll' : 'Iniciar auto-scroll'}
      >
        {autoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </DockButton>
      <DockButton
        onClick={onOpenSheet}
        active={sheetOpen}
        label="Más herramientas"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DockButton>
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

  const handleReset = () => {
    worshipHaptic();
    onResetTranspose();
  };

  const handleHide = () => {
    worshipHaptic();
    setSheetOpen(false);
    onHideControls?.();
  };

  const openSheet = () => setSheetOpen(true);

  if (landscapeDock) {
    return (
      <>
        <div
          className="lg:hidden fixed right-0 top-1/2 z-[122] pointer-events-none -translate-y-1/2 transition-transform duration-300 ease-out"
          style={{
            paddingRight: 'max(0.35rem, env(safe-area-inset-right))',
            paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            transform: `translateY(-50%) translateX(${dockVisible ? '0' : '120%'})`,
          }}
          data-worship-floating-dock
          data-worship-landscape
        >
          <div className="pointer-events-auto flex flex-col gap-1 p-1.5 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl">
            <QuickTransposeControls {...transposeProps} layout="vertical" />
            <DockActionButtons
              autoScrolling={autoScrolling}
              onResetTranspose={handleReset}
              onToggleAutoScroll={onToggleAutoScroll}
              onOpenSheet={openSheet}
              sheetOpen={sheetOpen}
              layout="vertical"
              onHideControls={onHideControls ? handleHide : undefined}
              serviceModeInput={serviceModeInput}
            />
          </div>
        </div>
        <WorshipControlSheet
          {...sheet}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onHideControls={onHideControls ? handleHide : undefined}
          serviceModeInput={serviceModeInput}
        />
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden" data-worship-floating-dock>
        <FloatingDockShell visible controlsVisible={dockVisible} compact onPointerDown={() => {}}>
          <div className="flex items-center justify-between gap-1 px-1.5 py-1">
            <QuickTransposeControls {...transposeProps} layout="horizontal" />
            <DockActionButtons
              autoScrolling={autoScrolling}
              onResetTranspose={handleReset}
              onToggleAutoScroll={onToggleAutoScroll}
              onOpenSheet={openSheet}
              sheetOpen={sheetOpen}
              layout="horizontal"
              onHideControls={onHideControls ? handleHide : undefined}
              serviceModeInput={serviceModeInput}
            />
          </div>
        </FloatingDockShell>
      </div>
      <WorshipControlSheet
        {...sheet}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onHideControls={onHideControls ? handleHide : undefined}
        serviceModeInput={serviceModeInput}
      />
    </>
  );
}
