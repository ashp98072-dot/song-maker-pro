const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYouTubeVideoId(id: string | null | undefined): id is string {
  return typeof id === 'string' && YOUTUBE_VIDEO_ID_RE.test(id);
}

export function extractYouTubeVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  if (isValidYouTubeVideoId(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  const id = match?.[1] ?? null;
  return id && isValidYouTubeVideoId(id) ? id : null;
}

export interface YouTubeEmbedSrcOptions {
  autoplay?: boolean;
}

/**
 * URL de embed sin `enablejsapi` (no usamos `window.YT.Player`).
 * Control play/pause vía postMessage desactivado para evitar errores internos del player API.
 */
export function buildYouTubeEmbedSrc(
  videoId: string,
  options: YouTubeEmbedSrcOptions = {}
): string {
  if (!isValidYouTubeVideoId(videoId)) return '';
  const params = new URLSearchParams();
  if (options.autoplay) params.set('autoplay', '1');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function toYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function thumbnailUrlForVideoId(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
