import { useCallback, useEffect, useState, type RefObject } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  buildYouTubeEmbedSrc,
  isValidYouTubeVideoId,
  toYouTubeWatchUrl,
} from '@/features/youtube-search/utils/youtubeUrl';

export interface YouTubeEmbedFrameProps {
  videoId: string | null;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  autoplay?: boolean;
  className?: string;
  title?: string;
}

/**
 * Iframe YouTube encapsulado: URL segura, validación de id y fallback si no carga.
 */
export function YouTubeEmbedFrame({
  videoId,
  iframeRef,
  autoplay = false,
  className = 'w-full h-full',
  title = 'Reproductor de YouTube',
}: YouTubeEmbedFrameProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const safeId = videoId && isValidYouTubeVideoId(videoId) ? videoId : null;
  const embedSrc = safeId ? buildYouTubeEmbedSrc(safeId, { autoplay }) : '';
  const watchUrl = safeId ? toYouTubeWatchUrl(safeId) : null;

  useEffect(() => {
    setLoadFailed(false);
    setLoaded(false);
  }, [embedSrc]);

  useEffect(() => {
    if (!embedSrc || loaded || loadFailed) return;
    const timer = window.setTimeout(() => {
      if (!loaded) setLoadFailed(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [embedSrc, loaded, loadFailed]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setLoadFailed(false);
  }, []);

  const handleError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  if (!safeId || !embedSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground ${className}`}
      >
        <p>Enlace de YouTube no válido.</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border ${className}`}
      >
        <p className="text-sm text-muted-foreground text-center">
          No se pudo cargar el reproductor embebido.
        </p>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/90 text-white text-sm font-medium hover:bg-red-600"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir en YouTube
          </a>
        )}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={embedSrc}
      src={embedSrc}
      className={className}
      title={title}
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
