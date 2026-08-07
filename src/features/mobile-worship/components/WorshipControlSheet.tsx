import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Heart,
  Maximize,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Youtube,
} from 'lucide-react';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RehearsalAutoScrollToolbar } from '@/features/rehearsal/components/RehearsalTools';
import { RehearsalTools } from '@/features/rehearsal/components/RehearsalTools';
import type { WorshipControlSheetProps } from '@/features/mobile-worship/types';
import { WorshipServiceModeButton } from '@/features/mobile-worship/components/WorshipServiceModeButton';
import { VIEW_MODE_LABELS, type ViewMode } from '@/types/music';
import { VOCAL_REGISTERS } from '@/utils/vocalRange';

const ALL_WORSHIP_VIEW_MODES: ViewMode[] = ['musician', 'singer', 'continuous'];

const SEMITONE_PRESETS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

export function WorshipControlSheet({
  open,
  onOpenChange,
  onHideControls,
  serviceModeInput,
  ...props
}: WorshipControlSheetProps) {
  const {
    song,
    displayKey,
    displayOriginalKey,
    effectiveSemitones,
    customSemitones,
    genderShift,
    modeSwapped,
    capoInfo,
    displayCapoPlayAs,
    vocalRegister,
    fontSize,
    viewMode,
    autoScrolling,
    scrollSpeed,
    smartScroll,
    youtubeDuration,
    isFullscreen,
    onResetTranspose,
    onToggleModeSwap,
    onSetCustomSemitones,
    onVocalRegisterChange,
    onGenderShiftToggle,
    onGenderSelect,
    onFontSizeChange,
    onViewModeChange,
    onToggleAutoScroll,
    onToggleSmartScroll,
    onScrollSpeedChange,
    onToggleFullscreen,
    onYouTube,
    rehearsal,
    tools,
  } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-worship-control-sheet
        className="z-[130] max-h-[min(90vh,760px)] flex flex-col rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left pb-2 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle>Más herramientas</SheetTitle>
              <SheetDescription>
                {song.title} — {displayKey || displayOriginalKey}
              </SheetDescription>
            </div>
            {onHideControls ? (
              <button
                type="button"
                onClick={() => {
                  worshipHaptic();
                  onOpenChange(false);
                  onHideControls();
                }}
                className="lg:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-[10px] font-medium text-muted-foreground"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Ocultar controles
              </button>
            ) : null}
          </div>
          {onHideControls && serviceModeInput ? (
            <div className="mt-3 lg:hidden">
              <WorshipServiceModeButton
                hideControls={() => {
                  onOpenChange(false);
                  onHideControls();
                }}
                input={serviceModeInput}
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                En vivo + teleprompter + enlace para la banda
              </p>
            </div>
          ) : null}
        </SheetHeader>

        <Tabs defaultValue="music" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 shrink-0">
            <TabsTrigger value="music" className="text-[10px] px-1">
              🎵 Música
            </TabsTrigger>
            <TabsTrigger value="rehearsal" className="text-[10px] px-1">
              🎤 Ensayo
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-[10px] px-1">
              🛠 Herram.
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-[10px] px-1">
              📝 Notas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-3 pr-1">
            <TabsContent value="music" className="mt-0 space-y-4">
              <p className="text-sm font-mono text-gold">
                Tono: {displayKey || displayOriginalKey}
                <span className="text-muted-foreground text-xs ml-2">
                  ({effectiveSemitones > 0 ? '+' : ''}
                  {effectiveSemitones} st)
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onGenderShiftToggle('male')}
                  className={`flex-1 py-2 rounded-lg text-xs border ${
                    genderShift === 'male' ? 'border-gold text-gold' : 'border-border'
                  }`}
                >
                  Hombre
                </button>
                <button
                  type="button"
                  onClick={() => onGenderShiftToggle('female')}
                  className={`flex-1 py-2 rounded-lg text-xs border ${
                    genderShift === 'female' ? 'border-gold text-gold' : 'border-border'
                  }`}
                >
                  Mujer
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  worshipHaptic();
                  onResetTranspose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs w-full justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset original
              </button>
              <div className="grid grid-cols-7 gap-1">
                {SEMITONE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onSetCustomSemitones(n)}
                    className={`py-1.5 rounded-md text-xs font-mono border ${
                      n === customSemitones
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-border'
                    }`}
                  >
                    {n > 0 ? `+${n}` : n}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VOCAL_REGISTERS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onVocalRegisterChange(vocalRegister === r.id ? '' : r.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] border ${
                      vocalRegister === r.id ? 'border-gold text-gold bg-gold/10' : 'border-border'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {capoInfo ? (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
                  Cejilla {capoInfo.capo} — tocar como {displayCapoPlayAs ?? capoInfo.playAs}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic rounded-lg border border-dashed border-border/60 p-3">
                  Capo: sin cejilla detectada en esta canción.
                </p>
              )}
              <button
                type="button"
                onClick={onToggleModeSwap}
                className={`w-full py-2 rounded-lg border text-xs ${
                  modeSwapped ? 'border-gold text-gold' : 'border-border'
                }`}
              >
                Modo mayor/menor {modeSwapped ? '(activo)' : ''}
              </button>
            </TabsContent>

            <TabsContent value="rehearsal" className="mt-0 space-y-4">
              <button
                type="button"
                onClick={onYouTube}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm"
              >
                <Youtube className="w-4 h-4" /> YouTube
              </button>
              <RehearsalAutoScrollToolbar
                autoScrolling={autoScrolling}
                smartScroll={smartScroll}
                scrollSpeed={scrollSpeed}
                youtubeDuration={youtubeDuration}
                onToggleAutoScroll={onToggleAutoScroll}
                onToggleSmartScroll={onToggleSmartScroll}
                onScrollSpeedChange={onScrollSpeedChange}
              />
              <div className="max-h-[45vh] overflow-y-auto">
                <RehearsalTools {...rehearsal} layout="stack" />
              </div>
            </TabsContent>

            <TabsContent value="tools" className="mt-0 space-y-3">
              <button
                type="button"
                onClick={tools.onToggleFullscreen}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border text-sm"
              >
                <Maximize className="w-4 h-4" />
                {tools.isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
              </button>
              <button
                type="button"
                onClick={tools.onShare}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border text-sm"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>
              <button
                type="button"
                onClick={tools.onToggleFavorite}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm ${
                  tools.isFavorite ? 'border-gold text-gold' : 'border-border'
                }`}
              >
                <Heart className="w-4 h-4" /> Favoritos
              </button>
              <button
                type="button"
                onClick={tools.onToggleMobileStage}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm ${
                  tools.mobileStageActive ? 'border-gold text-gold' : 'border-border'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" /> Modo escenario
              </button>
              {tools.hasListNav && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!tools.canNavigatePrev}
                    onClick={tools.onNavigatePrev}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border text-xs disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Ant
                  </button>
                  <button
                    type="button"
                    disabled={!tools.canNavigateNext}
                    onClick={tools.onNavigateNext}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border text-xs disabled:opacity-40"
                  >
                    Sig <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold pt-2">
                Tamaño fuente
              </label>
              <input
                type="range"
                min={12}
                max={32}
                value={tools.fontSize}
                onChange={(e) => tools.onFontSizeChange(Number(e.target.value))}
                className="w-full accent-gold"
              />
              <div className="flex gap-2">
                {(tools.continuousModeAvailable === false
                  ? ALL_WORSHIP_VIEW_MODES.filter((m) => m !== 'continuous')
                  : ALL_WORSHIP_VIEW_MODES
                ).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => tools.onViewModeChange(mode)}
                    className={`flex-1 py-2 rounded-lg text-[10px] border ${
                      tools.viewMode === mode ? 'border-gold text-gold bg-gold/10' : 'border-border'
                    }`}
                  >
                    {VIEW_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Próximamente:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Notas para músicos</li>
                  <li>Afinador</li>
                  <li>Comentarios privados de banda</li>
                </ul>
              </div>
            </TabsContent>
                </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
