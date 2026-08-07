import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  EyeOff,
  Heart,
  Library,
  LogOut,
  Maximize,
  QrCode,
  Radio,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Users,
  Youtube,
} from 'lucide-react';
import { toast } from 'sonner';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import { shareNative } from '@/utils/shareNative';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RehearsalAutoScrollToolbar } from '@/features/rehearsal/components/RehearsalTools';
import { RehearsalTools } from '@/features/rehearsal/components/RehearsalTools';
import type { WorshipControlSheetProps } from '@/features/mobile-worship/types';
import { WorshipServiceModeButton } from '@/features/mobile-worship/components/WorshipServiceModeButton';
import { VIEW_MODE_LABELS, type ViewMode } from '@/types/music';
import { VOCAL_REGISTERS, getRegisterInfo } from '@/utils/vocalRange';
import { useSingerVocalProfile } from '@/features/vocal-test';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { buildLiveJoinUrl, liveJoinQrImageUrl } from '@/features/simple-live-sync/liveJoinUrl';
import { normalizeSessionCode } from '@/features/director-session/types';
import { startWorshipServiceMode } from '@/features/mobile-worship/utils/worshipServiceMode';

const ALL_WORSHIP_VIEW_MODES: ViewMode[] = ['musician', 'singer', 'continuous'];

const SEMITONE_PRESETS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

/**
 * Panel inferior no-modal: portal a body, sin Radix Dialog/Sheet.
 * Evita aria-hidden en <main> y el bloqueo de toques en móvil.
 */
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
    autoScrolling,
    scrollSpeed,
    smartScroll,
    youtubeDuration,
    onResetTranspose,
    onToggleModeSwap,
    onSetCustomSemitones,
    onVocalRegisterChange,
    onGenderShiftToggle,
    onToggleAutoScroll,
    onToggleSmartScroll,
    onScrollSpeedChange,
    onYouTube,
    rehearsal,
    tools,
  } = props;

  const panelRef = useRef<HTMLDivElement>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [joinDraft, setJoinDraft] = useState('');
  const [showLiveQr, setShowLiveQr] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    // Saca el foco del botón «Más» (si quedara dentro de un ancestro oculto).
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const { preferredRegister } = useSingerVocalProfile();
  const preferredLabel = preferredRegister
    ? getRegisterInfo(preferredRegister)?.label ?? preferredRegister
    : null;
  const simpleLive = useSimpleLiveSyncOptional();
  const liveActive =
    simpleLive &&
    (simpleLive.role === 'director' || simpleLive.role === 'follower') &&
    !!simpleLive.code;

  useEffect(() => {
    if (!liveActive) setShowLiveQr(false);
  }, [liveActive]);

  if (!open || typeof document === 'undefined') return null;

  const minimize = () => {
    worshipHaptic();
    onOpenChange(false);
  };

  const hideAll = () => {
    worshipHaptic();
    onOpenChange(false);
    onHideControls?.();
  };

  return createPortal(
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-[200]"
      data-worship-control-sheet
      style={{ pointerEvents: 'auto' }}
    >
      {/* Zona superior: toque cierra (minimiza) sin oscurecer la letra */}
      <button
        type="button"
        aria-label="Minimizar panel"
        className="absolute inset-x-0 bottom-full h-[48vh] w-full bg-transparent"
        style={{ pointerEvents: 'auto' }}
        onClick={minimize}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative mx-0 max-h-[min(52vh,420px)] flex flex-col rounded-t-2xl border border-border/80 border-b-0 bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.2)] pb-[max(0.5rem,env(safe-area-inset-bottom))] outline-none"
        role="dialog"
        aria-modal="false"
        aria-label="Más herramientas"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-3 pt-2 pb-1">
          <button
            type="button"
            onClick={minimize}
            className="mx-auto mb-2 block h-1 w-10 rounded-full bg-muted-foreground/35"
            aria-label="Minimizar panel"
          />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">Más herramientas</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {song.title} — {displayKey || displayOriginalKey}
              </p>
            </div>
            {onHideControls ? (
              <button
                type="button"
                onClick={hideAll}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-bold text-foreground"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Ocultar
              </button>
            ) : null}
            <button
              type="button"
              onClick={minimize}
              className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground"
              aria-label="Minimizar"
              title="Minimizar"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Tabs defaultValue={liveActive ? 'tools' : 'music'} className="flex-1 flex flex-col min-h-0 px-3">
          <TabsList className="grid w-full grid-cols-5 shrink-0 h-8">
            <TabsTrigger value="music" className="text-[10px] px-0.5">
              Música
            </TabsTrigger>
            <TabsTrigger value="rehearsal" className="text-[10px] px-0.5">
              Ensayo
            </TabsTrigger>
            <TabsTrigger value="chords" className="text-[10px] px-0.5">
              Acordes
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-[10px] px-0.5 relative">
              Más
              {liveActive ? (
                <span
                  className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"
                  aria-hidden
                />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-[10px] px-0.5">
              Afinar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto overscroll-contain mt-2 min-h-0 pb-2 touch-pan-y">
            <TabsContent value="music" className="mt-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-mono text-gold">
                  {displayKey || displayOriginalKey}
                  <span className="text-muted-foreground text-xs ml-1.5">
                    ({effectiveSemitones > 0 ? '+' : ''}
                    {effectiveSemitones} st)
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    worshipHaptic();
                    onResetTranspose();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onGenderShiftToggle('male')}
                  className={`flex-1 py-1.5 rounded-lg text-xs border ${
                    genderShift === 'male' ? 'border-gold text-gold' : 'border-border'
                  }`}
                >
                  Hombre
                </button>
                <button
                  type="button"
                  onClick={() => onGenderShiftToggle('female')}
                  className={`flex-1 py-1.5 rounded-lg text-xs border ${
                    genderShift === 'female' ? 'border-gold text-gold' : 'border-border'
                  }`}
                >
                  Mujer
                </button>
                <button
                  type="button"
                  onClick={onToggleModeSwap}
                  className={`px-2 py-1.5 rounded-lg text-[10px] border shrink-0 ${
                    modeSwapped ? 'border-gold text-gold' : 'border-border'
                  }`}
                >
                  Maj/min
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {SEMITONE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      worshipHaptic();
                      onSetCustomSemitones(n);
                    }}
                    className={`py-1.5 rounded-md text-[11px] font-mono border ${
                      n === customSemitones
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-border'
                    }`}
                  >
                    {n > 0 ? `+${n}` : n}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {preferredRegister ? (
                  <button
                    type="button"
                    onClick={() => onVocalRegisterChange(preferredRegister)}
                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      vocalRegister === preferredRegister
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-gold/50 text-gold'
                    }`}
                  >
                    Mi voz: {preferredLabel}
                  </button>
                ) : (
                  <Link
                    to="/acordes?tab=registro"
                    onClick={minimize}
                    className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border border-dashed border-gold/40 text-gold"
                  >
                    Test de voz
                  </Link>
                )}
                {VOCAL_REGISTERS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onVocalRegisterChange(vocalRegister === r.id ? '' : r.id)}
                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] border ${
                      vocalRegister === r.id ? 'border-gold text-gold bg-gold/10' : 'border-border'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {capoInfo ? (
                <p className="text-[11px] text-muted-foreground">
                  Cejilla {capoInfo.capo} — tocar como {displayCapoPlayAs ?? capoInfo.playAs}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sin cejilla detectada</p>
              )}
            </TabsContent>

            <TabsContent value="rehearsal" className="mt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onYouTube}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-medium"
                >
                  <Youtube className="w-3.5 h-3.5" /> YouTube
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
              </div>
              <div className="max-h-[32vh] overflow-y-auto">
                <RehearsalTools {...rehearsal} layout="stack" />
              </div>
            </TabsContent>

            <TabsContent value="chords" className="mt-0">
              <Link
                to="/acordes"
                onClick={minimize}
                className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3"
              >
                <Library className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Biblioteca de acordes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Abre el módulo completo. O toca un acorde en la letra.
                  </p>
                </div>
              </Link>
            </TabsContent>

            <TabsContent value="tools" className="mt-0 space-y-2">
              {liveActive ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      Sesión · {simpleLive!.role === 'director' ? 'Transmitiendo' : 'Invitado'}
                    </p>
                    {simpleLive!.role === 'director' ? (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {simpleLive!.connectedCount} online
                      </span>
                    ) : null}
                  </div>
                  <p className="font-mono text-xl font-black tracking-[0.2em] text-gold">
                    {simpleLive!.code}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {simpleLive!.role === 'director' ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            worshipHaptic();
                            try {
                              await navigator.clipboard.writeText(simpleLive!.code!);
                              toast.success('Código copiado');
                            } catch {
                              toast.message(simpleLive!.code!);
                            }
                          }}
                          className="flex-1 min-w-[5.5rem] flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-bold"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            worshipHaptic();
                            await shareNative({
                              title: 'Sesión en vivo',
                              text: `Únete con el código ${simpleLive!.code}`,
                              url: buildLiveJoinUrl(simpleLive!.code!),
                            });
                          }}
                          className="flex-1 min-w-[5.5rem] flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gold/40 text-gold text-xs font-bold"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Compartir
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            worshipHaptic();
                            setShowLiveQr((v) => !v);
                          }}
                          className={`flex-1 min-w-[5.5rem] flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold ${
                            showLiveQr
                              ? 'border-gold/40 text-gold bg-gold/10'
                              : 'border-border'
                          }`}
                          aria-label={showLiveQr ? 'Ocultar QR' : 'Mostrar QR'}
                          aria-pressed={showLiveQr}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </button>
                      </>
                    ) : (
                      <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={simpleLive!.followDirector}
                          onChange={(e) => simpleLive!.setFollowDirector(e.target.checked)}
                          className="h-3.5 w-3.5 accent-gold"
                        />
                        Seguir director
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        worshipHaptic();
                        const wasDirector = simpleLive!.role === 'director';
                        setShowLiveQr(false);
                        await simpleLive!.leave();
                        toast.success(wasDirector ? 'Sesión detenida' : 'Saliste de la sesión');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-destructive/40 text-destructive text-xs font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {simpleLive!.role === 'director' ? 'Detener sesión' : 'Salir de la sesión'}
                    </button>
                  </div>
                  {simpleLive!.role === 'director' && showLiveQr ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-3">
                      <img
                        src={liveJoinQrImageUrl(buildLiveJoinUrl(simpleLive!.code!), 180)}
                        alt={`QR para unirse a ${simpleLive!.code}`}
                        width={180}
                        height={180}
                        className="rounded-md"
                      />
                      <p className="text-[10px] text-neutral-600 text-center">
                        Escanea para unirte · {simpleLive!.code}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : serviceModeInput && simpleLive ? (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Sesión en vivo
                  </p>
                  <button
                    type="button"
                    disabled={liveBusy}
                    onClick={async () => {
                      worshipHaptic();
                      setLiveBusy(true);
                      try {
                        await startWorshipServiceMode({
                          live: simpleLive,
                          hideControls: () => onOpenChange(false),
                          input: {
                            songId: serviceModeInput.songId,
                            listId: serviceModeInput.listId ?? null,
                            listSongIds: serviceModeInput.listSongIds ?? [],
                            currentIndex: serviceModeInput.currentIndex ?? 0,
                            viewMode: serviceModeInput.viewMode ?? 'musician',
                            semitones: serviceModeInput.semitones ?? 0,
                            genderShift: serviceModeInput.genderShift ?? 'original',
                            sectionAnchor: serviceModeInput.sectionAnchor ?? null,
                          },
                          share: true,
                          navigate,
                          currentPathname: location.pathname,
                        });
                      } finally {
                        setLiveBusy(false);
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg border border-gold/40 bg-gold/10 text-gold text-sm font-bold disabled:opacity-50"
                  >
                    {liveBusy ? 'Creando…' : 'Crear sesión en vivo'}
                  </button>
                  <div className="flex gap-2">
                    <input
                      value={joinDraft}
                      onChange={(e) => setJoinDraft(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      maxLength={6}
                      className="flex-1 px-2 py-2 rounded-lg bg-secondary border border-border text-xs font-mono tracking-widest uppercase"
                    />
                    <button
                      type="button"
                      disabled={liveBusy || normalizeSessionCode(joinDraft).length < 4}
                      onClick={async () => {
                        worshipHaptic();
                        setLiveBusy(true);
                        try {
                          await simpleLive.joinAsFollower(joinDraft);
                        } finally {
                          setLiveBusy(false);
                        }
                      }}
                      className="px-3 py-2 rounded-lg border border-border text-xs font-bold disabled:opacity-40"
                    >
                      Unirse
                    </button>
                  </div>
                </div>
              ) : null}
              {onHideControls && serviceModeInput ? (
                <WorshipServiceModeButton
                  hideControls={hideAll}
                  input={serviceModeInput}
                />
              ) : null}
              {onHideControls ? (
                <button
                  type="button"
                  onClick={hideAll}
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
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold pt-1">
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
              <Link
                to="/acordes?tab=afinador"
                onClick={minimize}
                className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 mb-2"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Abrir afinador</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Guitarra, bajo y violín.
                  </p>
                </div>
              </Link>
              <Link
                to="/acordes?tab=registro"
                onClick={minimize}
                className="flex items-start gap-3 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Test de registro vocal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Descubre tu voz y aplica “Mi voz” en canciones.
                  </p>
                </div>
              </Link>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>,
    document.body
  );
}
