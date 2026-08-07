import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListMusic,
  LogOut,
  Maximize,
  Minimize,
  Pause,
  Play,
  Radio,
  Share2,
  SkipBack,
} from 'lucide-react';
import { toast } from 'sonner';
import { FloatingDockShell } from '@/components/FloatingDockShell';
import { QuickTransposeControls } from '@/features/mobile-worship/components/QuickTransposeControls';
import { MobileHideControlsButton } from '@/features/mobile-worship/components/MobileHideControlsButton';
import { WorshipServiceModeButton } from '@/features/mobile-worship/components/WorshipServiceModeButton';
import type { WorshipServiceModeInput } from '@/features/mobile-worship/utils/worshipServiceMode';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { buildLiveJoinUrl } from '@/features/simple-live-sync/liveJoinUrl';
import { shareNative } from '@/utils/shareNative';

export interface ContinuousSetlistDockProps {
  visible: boolean;
  controlsVisible?: boolean;
  listName: string;
  currentIndex: number;
  total: number;
  currentTitle: string;
  hasPrev: boolean;
  hasNext: boolean;
  isFullscreen: boolean;
  displayKey: string;
  genderShift: '' | 'male' | 'female';
  customSemitones: number;
  autoScrolling: boolean;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onSetCustomSemitones: (value: number) => void;
  onGenderToggle: () => void;
  onGenderSelect: (gender: '' | 'male' | 'female') => void;
  onToggleAutoScroll: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenNavigator: () => void;
  onSongStart: () => void;
  onToggleFullscreen: () => void;
  onScrollToTop?: () => void;
  onBumpControls?: () => void;
  controlsHidden?: boolean;
  onHideControls?: () => void;
  serviceModeInput?: WorshipServiceModeInput | null;
}

export function ContinuousSetlistDock({
  visible,
  controlsVisible = true,
  listName,
  currentIndex,
  total,
  currentTitle,
  hasPrev,
  hasNext,
  isFullscreen,
  displayKey,
  genderShift,
  customSemitones,
  autoScrolling,
  onTransposeDown,
  onTransposeUp,
  onSetCustomSemitones,
  onGenderToggle,
  onGenderSelect,
  onToggleAutoScroll,
  onPrev,
  onNext,
  onOpenNavigator,
  onSongStart,
  onToggleFullscreen,
  onScrollToTop,
  onBumpControls,
  controlsHidden = false,
  onHideControls,
  serviceModeInput = null,
}: ContinuousSetlistDockProps) {
  const simpleLive = useSimpleLiveSyncOptional();
  const liveActive =
    !!simpleLive &&
    (simpleLive.role === 'director' || simpleLive.role === 'follower') &&
    !!simpleLive.code;

  if (!visible) return null;

  return (
    <div data-continuous-dock data-continuous-dock-minimal={controlsHidden ? '' : undefined}>
      <FloatingDockShell
        visible
        controlsVisible={controlsVisible}
        compact
        onPointerDown={onBumpControls}
      >
        <div className="px-3 pt-2 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="truncate font-bold uppercase tracking-wider">{listName}</span>
            <span className="font-mono text-gold shrink-0">
              {currentIndex + 1}/{total}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground truncate">{currentTitle}</p>

          {liveActive && !controlsHidden ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5">
              <Radio className="w-3.5 h-3.5 shrink-0 text-amber-300" />
              <span className="font-mono text-xs font-black tracking-widest text-gold truncate">
                {simpleLive!.code}
              </span>
              {simpleLive!.role === 'director' ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(simpleLive!.code!);
                        toast.success('Código copiado');
                      } catch {
                        toast.message(simpleLive!.code!);
                      }
                    }}
                    className="shrink-0 p-1.5 rounded-md border border-white/15"
                    aria-label="Copiar código"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const url = buildLiveJoinUrl(simpleLive!.code!);
                      const ok = await shareNative({
                        title: 'Sesión en vivo',
                        text: `Únete con el código ${simpleLive!.code}`,
                        url,
                      });
                      if (!ok) {
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success('Enlace copiado');
                        } catch {
                          toast.message(simpleLive!.code!);
                        }
                      }
                    }}
                    className="shrink-0 p-1.5 rounded-md border border-gold/40 text-gold"
                    aria-label="Compartir"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <label className="shrink-0 flex items-center gap-1 text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={simpleLive!.followDirector}
                    onChange={(e) => simpleLive!.setFollowDirector(e.target.checked)}
                    className="h-3 w-3 accent-gold"
                  />
                  Seguir
                </label>
              )}
              <button
                type="button"
                onClick={async () => {
                  const wasDirector = simpleLive!.role === 'director';
                  await simpleLive!.leave();
                  toast.success(wasDirector ? 'Sesión detenida' : 'Saliste de la sesión');
                }}
                className="shrink-0 ml-auto flex items-center gap-1 px-2 py-1 rounded-md border border-red-400/40 text-red-300 text-[10px] font-bold"
              >
                <LogOut className="w-3 h-3" />
                {simpleLive!.role === 'director' ? 'Detener' : 'Salir'}
              </button>
            </div>
          ) : null}

          {!controlsHidden ? (
            <QuickTransposeControls
              displayKey={displayKey}
              genderShift={genderShift}
              customSemitones={customSemitones}
              onTransposeDown={onTransposeDown}
              onTransposeUp={onTransposeUp}
              onSetCustomSemitones={onSetCustomSemitones}
              onGenderToggle={onGenderToggle}
              onGenderSelect={onGenderSelect}
              layout="horizontal"
            />
          ) : null}

          <div className="flex items-center justify-around gap-1">
            {onHideControls && serviceModeInput && !controlsHidden ? (
              <WorshipServiceModeButton
                compact
                hideControls={onHideControls}
                input={serviceModeInput}
              />
            ) : null}
            <button
              type="button"
              onClick={onToggleAutoScroll}
              className={`flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border ${
                autoScrolling ? 'border-gold text-gold bg-gold/10' : 'border-white/10'
              }`}
              aria-label={autoScrolling ? 'Detener auto-scroll' : 'Iniciar auto-scroll'}
            >
              {autoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span className="text-[9px]">Scroll</span>
            </button>
            {onScrollToTop ? (
              <button
                type="button"
                onClick={onScrollToTop}
                className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/10"
                aria-label="Volver arriba"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/10 disabled:opacity-30"
              aria-label="Canción anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={onSongStart}
              className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/10"
              aria-label="Inicio de canción"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenNavigator}
              className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-gold/30 bg-gold/10 text-gold"
              aria-label="Lista de canciones"
            >
              <ListMusic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/10 disabled:opacity-30"
              aria-label="Canción siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-xl border border-white/10"
              aria-label="Pantalla completa"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            {onHideControls && !controlsHidden ? (
              <MobileHideControlsButton compact onHide={onHideControls} />
            ) : null}
          </div>
        </div>
      </FloatingDockShell>
    </div>
  );
}
