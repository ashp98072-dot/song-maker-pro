import { useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import { FloatingDockShell } from '@/components/FloatingDockShell';
import type { DockExpansion } from '@/features/mobile-stage/types';

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
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Tono: <span className="text-gold font-semibold">{displayKey}</span>
              </span>
              <button
                type="button"
                onClick={onToggleAutoHide}
                className="flex items-center gap-1 text-muted-foreground"
              >
                {autoHideControls ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                Auto-ocultar
              </button>
            </div>
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
          <DockButton onClick={onToggleMetronome} active={metronomeActive} label="Metrónomo">
            {metronomeActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </DockButton>
          <DockButton onClick={onToggleAutoScroll} active={autoScrolling} label="Autoscroll">
            {autoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </DockButton>
          <DockButton onClick={onTransposeDown} label="Bajar semitono">
            <Minus className="w-5 h-5" />
          </DockButton>
          <DockButton onClick={onTransposeUp} label="Subir semitono">
            <Plus className="w-5 h-5" />
          </DockButton>
          <DockButton onClick={onToggleYoutube} active={youtubeActive} label="YouTube">
            <Youtube className="w-5 h-5" />
          </DockButton>
          <DockButton onClick={onToggleFullscreen} active={isFullscreen} label="Pantalla completa">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </DockButton>
          <DockButton
            onClick={toggleExpansion}
            label={expansion === 'compact' ? 'Expandir controles' : 'Contraer'}
          >
            {expansion === 'compact' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </DockButton>
        </div>
      </FloatingDockShell>
    </div>
  );
}
