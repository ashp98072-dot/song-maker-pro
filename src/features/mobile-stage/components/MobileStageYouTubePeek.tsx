import type { RefObject } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { YouTubeEmbedFrame } from '@/components/YouTubeEmbedFrame';

export interface MobileStageYouTubePeekProps {
  visible: boolean;
  youtubeEmbedId: string | null;
  youtubeIframeRef: RefObject<HTMLIFrameElement | null>;
  youtubePlaying: boolean;
  onPlayPause: () => void;
  onClose: () => void;
}

/** Acceso rápido al video sin abrir paneles de ensayo completos. */
export function MobileStageYouTubePeek({
  visible,
  youtubeEmbedId,
  youtubeIframeRef,
  youtubePlaying,
  onPlayPause,
  onClose,
}: MobileStageYouTubePeekProps) {
  if (!visible || !youtubeEmbedId) return null;

  return (
    <div
      className="fixed left-2 right-2 z-[115] rounded-xl overflow-hidden border border-red-500/40 bg-black/90 backdrop-blur-md shadow-2xl"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
      data-mobile-stage-youtube
    >
      <div className="flex items-center justify-between px-2 py-1 bg-black/60">
        <button
          type="button"
          onClick={onPlayPause}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-gold border border-gold/30"
        >
          {youtubePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {youtubePlaying ? 'Pausa' : 'Play'}
        </button>
        <button type="button" onClick={onClose} className="p-1.5 text-muted-foreground" aria-label="Ocultar video">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="aspect-video w-full">
        <YouTubeEmbedFrame
          videoId={youtubeEmbedId}
          iframeRef={youtubeIframeRef}
          autoplay={youtubePlaying}
          title="YouTube ensayo"
        />
      </div>
    </div>
  );
}
