import type { YouTubeVideoResult } from '@/features/youtube-search/types';
import { youtubeSearchLog } from '@/features/youtube-search/api/devLog';
import { formatVideoDuration } from '@/features/youtube-search/utils/formatDuration';
import {
  extractYouTubeVideoId,
  thumbnailUrlForVideoId,
  toYouTubeWatchUrl,
} from '@/features/youtube-search/utils/youtubeUrl';

const PIPED_FALLBACK_BASES = [
  import.meta.env.VITE_PIPED_API_BASE as string | undefined,
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
].filter((b): b is string => Boolean(b));

type PipedItem = {
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  duration?: number;
  url?: string;
  uploaded?: number;
  views?: number;
};

function mapPipedItem(item: PipedItem): YouTubeVideoResult | null {
  const rawUrl = item.url ?? '';
  const fullUrl = rawUrl.startsWith('http')
    ? rawUrl
    : rawUrl.startsWith('/')
      ? `https://www.youtube.com${rawUrl}`
      : '';
  const id = extractYouTubeVideoId(fullUrl);
  if (!id) return null;
  const durationSec = typeof item.duration === 'number' ? item.duration : 0;
  return {
    id,
    title: item.title ?? 'Sin título',
    channelTitle: item.uploaderName ?? '',
    duration: durationSec > 0 ? formatVideoDuration(durationSec) : '',
    thumbnail: item.thumbnail ?? thumbnailUrlForVideoId(id),
    publishedAt: item.uploaded ? new Date(item.uploaded).toISOString() : undefined,
    views: item.views != null ? `${item.views} vistas` : undefined,
    url: toYouTubeWatchUrl(id),
  };
}

async function searchViaPipedInstance(
  base: string,
  query: string,
  signal: AbortSignal
): Promise<YouTubeVideoResult[]> {
  const url = `${base.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&filter=videos`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Piped ${res.status} @ ${base}`);
  const data = (await res.json()) as { items?: PipedItem[] };
  const items = (data.items ?? []).filter(
    (i) => i.type === 'stream' || i.type === 'video' || Boolean(i.url)
  );
  return items
    .map(mapPipedItem)
    .filter((v): v is YouTubeVideoResult => v != null)
    .slice(0, 12);
}

export async function searchViaPiped(
  query: string,
  signal: AbortSignal
): Promise<YouTubeVideoResult[]> {
  let lastError: Error | null = null;
  for (const base of PIPED_FALLBACK_BASES) {
    try {
      youtubeSearchLog('piped.search', { base, q: query });
      return await searchViaPipedInstance(base, query, signal);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (signal.aborted) throw lastError;
    }
  }
  throw lastError ?? new Error('No hay instancia Piped disponible');
}
