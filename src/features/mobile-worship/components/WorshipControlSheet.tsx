import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Heart,
  Library,
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
        overlayClassName="z-[140] bg-transparent pointer-events-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="z-[150] max-h-[min(88vh,720px)] flex flex-col gap-2 rounded-t-2xl border-t border-border p-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] pointer-events-auto"
      >
        <SheetHeader className="text-left space-y-1 shrink-0 pr-8">
          <SheetTitle className="text-base">Más herramientas</SheetTitle>
          <SheetDescription className="text-xs">
            {song.title} — {displayKey || displayOriginalKey}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="music" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 shrink-0 h-9">
            <TabsTrigger value="music" className="text-[10px] px-1">
              Música
            </TabsTrigger>
            <TabsTrigger value="rehearsal" className="text-[10px] px-1">
              Ensayo
            </TabsTrigger>
            <TabsTrigger value="chords" className="text-[10px] px-1">
              Acordes
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-[10px] px-1">
              Más
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-[10px] px-1">
              Afinar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto overscroll-contain mt-2 -mx-1 px-1 min-h-0">
            <TabsContent value="music" className="mt-0 space-y-3 pb-2">
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

            <TabsContent value="chords" className="mt-0 space-y-3">
              <Link
                to="/acordes"
                onClick={() => onOpenChange(false)}
                className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 hover:bg-gold/10 transition-colors"
              >
                <div className="p-2 rounded-lg bg-gold/15 text-gold shrink-0">
                  <Library className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Abrir biblioteca de acordes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Explora todos los diagramas en pantalla completa. En la letra, toca un acorde
                    para verlo al instante.
                  </p>
                </div>
              </Link>
            </TabsContent>

            <TabsContent value="tools" className="mt-0 space-y-3 pb-2">
              {onHideControls && serviceModeInput ? (
                <div className="space-y-1.5">
                  <WorshipServiceModeButton
                    hideControls={() => {
                      onOpenChange(false);
                      onHideControls();
                    }}
                    input={serviceModeInput}
                  />
                  <p className="text-[10px] text-muted-foreground text-center">
                    En vivo + teleprompter + enlace para la banda
                  </p>
                </div>
              ) : null}
              {onHideControls ? (
                <button
                  type="button"
                  onClick={() => {
                    worshipHaptic();
                    onOpenChange(false);
                    onHideControls();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border text-sm"
                >
                  <EyeOff className="w-4 h-4" /> Ocultar controles
                </button>
              ) : null}
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

            <TabsContent value="notes" className="mt-0 pb-2 space-y-3">
              <Link
                to="/afinador"
                onClick={() => onOpenChange(false)}
                className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 hover:bg-gold/10 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Abrir afinador</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Guitarra, bajo y violín con el micrófono del teléfono.
                  </p>
                </div>
              </Link>
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Próximamente:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Notas para músicos</li>
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
