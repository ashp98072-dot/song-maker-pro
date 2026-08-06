import { useState, useRef, useCallback, useMemo } from 'react';
import { extractYouTubeVideoId } from '@/features/youtube-search/utils/youtubeUrl';

export interface UseYouTubePlayerOptions {
  ytDelayMs: number;
  onVideoPlay: () => void;
  onVideoPause: () => void;
}

/**
 * Estado del reproductor embebido. Sin `enablejsapi` / `YT.Player` no se envían
 * postMessage al iframe (evita crash `logApiCall` en youtube.com).
 * `youtubePlaying` refleja intención de sesión en vivo; play/pause real en controles del iframe.
 */
export function useYouTubePlayer(_options: UseYouTubePlayerOptions) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutube, setShowYoutube] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [youtubeSeek, setYoutubeSeek] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);

  const ytPostMessage = useCallback((_func: string, _args: unknown[] = []) => {
    // Sin enablejsapi=1 los comandos postMessage no son compatibles con el embed estándar.
  }, []);

  const youtubeEmbedId = useMemo(
    () => (youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null),
    [youtubeUrl]
  );

  return {
    youtubeUrl,
    setYoutubeUrl,
    showYoutube,
    setShowYoutube,
    youtubePlaying,
    setYoutubePlaying,
    youtubeSeek,
    setYoutubeSeek,
    youtubeDuration,
    setYoutubeDuration,
    youtubeIframeRef,
    youtubeEmbedId,
    ytPostMessage,
  };
}
