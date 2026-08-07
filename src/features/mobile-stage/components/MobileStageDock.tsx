import { useEffect, useState, type ReactNode } from 'react';
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  ChevronUp,
  ChevronDown,
  Youtube,
  Minus,
  Plus,
  Eye,
  EyeOff,
  ArrowUp,
  List,
  Copy,
  LogOut,
  Radio,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { FloatingDockShell } from '@/components/FloatingDockShell';
import type { DockExpansion } from '@/features/mobile-stage/types';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { buildLiveJoinUrl } from '@/features/simple-live-sync/liveJoinUrl';
import { shareNative } from '@/utils/shareNative';

export interface MobileStageDockProps {
  visible: boolean;
  controlsVisible: boolean;
  isLandscape: boolean;
  isFullscreen: boolean;
  displayKey: string;
  metronomeActive: boolean;
  metronomeBpm: number;
  autoScrolling: boolean;
  scrollSpeed: number;
  autoHideControls: boolean;
  youtubeActive: boolean;
  sections?: string[];
  onToggleMetronome: () => void;
  onBpmChange: (bpm: number) => void;
  onToggleAutoScroll: () => void;
  onScrollSpeedChange: (speed: number) => void;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onToggleFullscreen: () => void;
  onToggleYoutube: () => void;
  onToggleAutoHide: () => void;
  onBumpControls: () => void;
  onScrollToTop?: () => void;
  onOpenSections?: () => void;
}

function DockButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center justify-center min-w-[2.75rem] min-h-[2.75rem] px-1.5 py-1 rounded-xl border transition-all active:scale-95 ${
        active
          ? 'border-gold bg-gold/20 text-gold'
          : 'border-white/10 bg-white/5 text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Escenario: fila compacta solo con lo esencial.
 * Metrónomo / YouTube / BPM / sesión viven en “Más” (expandido).
 */
export function MobileStageDock({
  visible,
  controlsVisible,
  isLandscape,
  isFullscreen,
  displayKey,
  metronomeActive,
  metronomeBpm,
  autoScrolling,
  scrollSpeed,
  autoHideControls,
  youtubeActive,
  sections = [],
  onToggleMetronome,
  onBpmChange,
  onToggleAutoScroll,
  onScrollSpeedChange,
  onTransposeDown,
  onTransposeUp,
  onToggleFullscreen,
  onToggleYoutube,
  onToggleAutoHide,
  onBumpControls,
  onScrollToTop,
  onOpenSections,
}: MobileStageDockProps) {
  const [expansion, setExpansion] = useState<DockExpansion>('compact');
  const simpleLive = useSimpleLiveSyncOptional();
  const liveActive =
    !!simpleLive &&
    (simpleLive.role === 'director' || simpleLive.role === 'follower') &&
    !!simpleLive.code;

  useEffect(() => {
    if (!liveActive) return;
    setExpansion('expanded');
  }, [liveActive]);

  const toggleExpansion = () => {
    onBumpControls();
    setExpansion((e) => (e === 'compact' ? 'expanded' : 'compact'));
  };

  const compact = isLandscape && expansion === 'compact';

  return (
    <div data-mobile-stage-dock data-pedal-ready="true">
      <FloatingDockShell
        visible={visible}
        controlsVisible={controlsVisible}
        compact={compact}
        onPointerDown={onBumpControls}
      >
        {expansion === 'expanded' && (
          <div className="px-3 pt-3 pb-2 space-y-3 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Extra · {displayKey}
            </p>
            {liveActive ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-2.5 py-2 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Sesión · {simpleLive!.code}
                </p>
                <div className="flex gap-1.5">
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
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-white/15 text-[10px] font-bold"
                      >
                        <Copy className="w-3 h-3" /> Copiar
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
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gold/40 text-gold text-[10px] font-bold"
                      >
                        <Share2 className="w-3 h-3" /> Compartir
                      </button>
                    </>
                  ) : (
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/15 text-[10px] font-bold">
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
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-400/40 text-red-300 text-[10px] font-bold"
                  >
                    <LogOut className="w-3 h-3" />
                    {simpleLive!.role === 'director' ? 'Detener' : 'Salir'}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-around gap-1">
              <DockButton onClick={onToggleMetronome} active={metronomeActive} label="Metrónomo">
                {metronomeActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </DockButton>
              <DockButton onClick={onToggleYoutube} active={youtubeActive} label="YouTube">
                <Youtube className="w-5 h-5" />
              </DockButton>
              <button
                type="button"
                onClick={onToggleAutoHide}
                className="flex items-center gap-1.5 px-2 py-2 rounded-xl border border-white/10 text-[10px] text-muted-foreground"
              >
                {autoHideControls ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                Auto-ocultar
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12">
                BPM
              </span>
              <input
                type="range"
                min={40}
                max={220}
                value={metronomeBpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="flex-1 accent-gold h-8"
              />
              <span className="text-sm font-mono text-gold w-12 text-right">{metronomeBpm}</span>
            </div>
            {autoScrolling && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12">
                  Scroll
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={scrollSpeed}
                  onChange={(e) => onScrollSpeedChange(Number(e.target.value))}
                  className="flex-1 accent-gold h-8"
                />
              </div>
            )}
          </div>
        )}

        <div className={`flex items-center justify-around gap-0.5 px-1 ${compact ? 'py-1' : 'py-2'}`}>
          {onScrollToTop ? (
            <DockButton onClick={onScrollToTop} label="Volver arriba">
              <ArrowUp className="w-5 h-5" />
            </DockButton>
          ) : null}
          {sections.length > 0 && onOpenSections ? (
            <DockButton onClick={onOpenSections} label="Secciones">
              <List className="w-5 h-5" />
            </DockButton>
          ) : null}
          <DockButton onClick={onToggleAutoScroll} active={autoScrolling} label="Autoscroll">
            {autoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </DockButton>
          <DockButton onClick={onTransposeDown} label="Bajar semitono">
            <Minus className="w-5 h-5" />
          </DockButton>
          <span className="relative text-[10px] font-mono font-bold text-gold px-0.5 max-w-[2.5rem] truncate text-center">
            {displayKey}
            {liveActive ? (
              <span
                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"
                aria-hidden
              />
            ) : null}
          </span>
          <DockButton onClick={onTransposeUp} label="Subir semitono">
            <Plus className="w-5 h-5" />
          </DockButton>
          <DockButton onClick={onToggleFullscreen} active={isFullscreen} label="Pantalla completa">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </DockButton>
          <DockButton
            onClick={toggleExpansion}
            active={expansion === 'expanded' || liveActive}
            label={expansion === 'compact' ? 'Más opciones' : 'Menos'}
          >
            {expansion === 'compact' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </DockButton>
        </div>
      </FloatingDockShell>
    </div>
  );
}
