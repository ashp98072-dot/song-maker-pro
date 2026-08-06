import type { RefObject } from 'react';
import { Play, Pause, Youtube, RotateCcw, StopCircle } from 'lucide-react';
import DraggablePanel from '@/components/DraggablePanel';
import RehearsalRecorder from '@/components/RehearsalRecorder';
import { YouTubeEmbedFrame } from '@/components/YouTubeEmbedFrame';
import { toYouTubeWatchUrl } from '@/features/youtube-search/utils/youtubeUrl';

/** Root: metrónomo, YouTube y grabador — listo para dock móvil / stage overlay futuro. */
export interface RehearsalToolsProps {
  songId: string;
  metronomeBpm: number;
  metronomeActive: boolean;
  beatCount: number;
  bpmFlash: boolean;
  onToggleMetronome: () => void;
  onBpmChange: (bpm: number) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  showYoutube: boolean;
  onToggleShowYoutube: () => void;
  youtubeEmbedId: string | null;
  youtubeIframeRef: RefObject<HTMLIFrameElement | null>;
  youtubePlaying: boolean;
  onYoutubePlayPause: () => void;
  youtubeDuration: number;
  ytDelayMs: number;
  onYtDelayMsChange: (ms: number) => void;
  /** Si hay URL → abre player; si no → selector rápido */
  onSmartYoutubeClick?: () => void;
}

export function RehearsalTools({
  songId,
  metronomeBpm,
  metronomeActive,
  beatCount,
  bpmFlash,
  onToggleMetronome,
  onBpmChange,
  youtubeUrl,
  onYoutubeUrlChange,
  showYoutube,
  onToggleShowYoutube,
  youtubeEmbedId,
  youtubeIframeRef,
  youtubePlaying,
  onYoutubePlayPause,
  youtubeDuration,
  ytDelayMs,
  onYtDelayMsChange,
  onSmartYoutubeClick,
}: RehearsalToolsProps) {
  return (
    <div className="mt-6 space-y-4" data-rehearsal-tools-root>
      <DraggablePanel title="Metrónomo" icon={<RotateCcw className="w-4 h-4 text-gold" />}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMetronome}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${metronomeActive ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'}`}
          >
            {metronomeActive ? <Pause className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
            {metronomeActive ? 'Detener' : 'Iniciar'}
          </button>
          <input
            type="range"
            min={40}
            max={220}
            value={metronomeBpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="flex-1 accent-gold"
          />
          <span
            className={`text-sm font-mono w-16 text-right transition-all ${bpmFlash ? 'text-amber-400 scale-125 font-bold' : 'text-foreground'}`}
          >
            {metronomeBpm} BPM
          </span>
          {metronomeActive && (
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((b) => (
                <div
                  key={b}
                  className={`w-3 h-3 rounded-full transition-colors ${beatCount === b ? (b === 1 ? 'bg-gold' : 'bg-foreground') : 'bg-muted'}`}
                />
              ))}
            </div>
          )}
        </div>
      </DraggablePanel>

      <DraggablePanel title="YouTube" icon={<Youtube className="w-4 h-4 text-red-500" />} defaultHeight={300}>
        <div className="flex gap-2 flex-wrap">
          {onSmartYoutubeClick && (
            <button
              type="button"
              onClick={onSmartYoutubeClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-medium shrink-0 hover:bg-red-500/20"
              title={youtubeEmbedId ? 'Abrir video' : 'Buscar video en YouTube'}
            >
              <Youtube className="w-4 h-4" />
              {youtubeEmbedId ? 'Abrir' : 'Buscar'}
            </button>
          )}
          <input
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="Pega el enlace de YouTube..."
            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={onToggleShowYoutube}
            disabled={!youtubeEmbedId}
            className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {showYoutube ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {youtubeUrl.trim() && !youtubeEmbedId && (
          <p className="text-xs text-amber-400/90 mt-2">Enlace de YouTube no válido.</p>
        )}
        {showYoutube && youtubeEmbedId && (
          <>
            <div className="mt-3 aspect-video rounded-lg overflow-hidden">
              <YouTubeEmbedFrame
                videoId={youtubeEmbedId}
                iframeRef={youtubeIframeRef}
                autoplay={youtubePlaying}
                title="YouTube ensayo"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <a
                href={toYouTubeWatchUrl(youtubeEmbedId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-red-400 hover:underline"
              >
                Abrir en YouTube
              </a>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={onYoutubePlayPause}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${youtubePlaying ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'}`}
              >
                {youtubePlaying ? <Pause className="w-3 h-3 inline mr-1" /> : <Play className="w-3 h-3 inline mr-1" />}
                {youtubePlaying ? 'Marcar pausa' : 'Marcar play'} (sesión)
              </button>
              <span className="text-[10px] text-muted-foreground">
                Usa los controles del video; esto sincroniza la sesión en vivo
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Delay metrónomo
              </label>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={ytDelayMs}
                onChange={(e) => onYtDelayMsChange(Number(e.target.value))}
                className="flex-1 min-w-[120px] accent-gold"
              />
              <span className="text-[10px] font-mono text-foreground w-14 text-right">
                {(ytDelayMs / 1000).toFixed(1)}s
              </span>
              {youtubeDuration > 0 && (
                <span className="text-[10px] text-muted-foreground w-full">
                  Duración detectada: {Math.floor(youtubeDuration / 60)}:
                  {String(Math.floor(youtubeDuration % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
          </>
        )}
      </DraggablePanel>

      <RehearsalRecorder songId={songId} />
    </div>
  );
}

/** Toolbar inferior de autoscroll — desacoplado para dock móvil futuro. */
export interface RehearsalAutoScrollToolbarProps {
  autoScrolling: boolean;
  smartScroll: boolean;
  scrollSpeed: number;
  youtubeDuration: number;
  onToggleAutoScroll: () => void;
  onToggleSmartScroll: () => void;
  onScrollSpeedChange: (speed: number) => void;
}

export function RehearsalAutoScrollToolbar({
  autoScrolling,
  smartScroll,
  scrollSpeed,
  youtubeDuration,
  onToggleAutoScroll,
  onToggleSmartScroll,
  onScrollSpeedChange,
}: RehearsalAutoScrollToolbarProps) {
  return (
    <>
      <button
        onClick={onToggleAutoScroll}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${autoScrolling ? 'border-gold text-gold' : 'border-border text-muted-foreground'}`}
        data-rehearsal-autoscroll-toggle
      >
        {autoScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} Autoscroll
      </button>
      {youtubeDuration > 0 && (
        <button
          onClick={onToggleSmartScroll}
          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${smartScroll ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'}`}
          title="Sincroniza el scroll con la duración del video de YouTube"
          data-rehearsal-smart-scroll-toggle
        >
          Smart {smartScroll ? 'ON' : 'OFF'}
        </button>
      )}
      {autoScrolling && !smartScroll && (
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={scrollSpeed}
          onChange={(e) => onScrollSpeedChange(Number(e.target.value))}
          className="w-20 accent-gold"
          data-rehearsal-scroll-speed
        />
      )}
    </>
  );
}

/** FAB flotante para detener autoscroll — listo para controles stage móvil. */
export interface RehearsalAutoScrollStopFabProps {
  visible: boolean;
  onStop: () => void;
}

export function RehearsalAutoScrollStopFab({ visible, onStop }: RehearsalAutoScrollStopFabProps) {
  if (!visible) return null;
  return (
    <button
      onClick={onStop}
      className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-3 rounded-full bg-gold text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-2 max-lg:ios-safe-fixed-bottom"
      data-rehearsal-autoscroll-stop-fab
      title="Detener autoscroll"
      aria-label="Detener autoscroll"
    >
      <StopCircle className="w-5 h-5" />
      <span className="text-xs font-semibold hidden sm:inline">Detener scroll</span>
    </button>
  );
}
