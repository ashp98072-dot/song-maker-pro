import type { YouTubeVideoResult } from '@/features/youtube-search/types';
import { getYouTubeApiKey } from '@/features/youtube-search/api/getYouTubeApiKey';
import { youtubeSearchLog, youtubeSearchError } from '@/features/youtube-search/api/devLog';
import {
  formatYouTubeDataApiHttpError,
  isNetworkFetchFailure,
} from '@/features/youtube-search/api/searchErrors';
import { formatIso8601Duration } from '@/features/youtube-search/utils/parseIso8601Duration';
import { formatViewCount } from '@/features/youtube-search/utils/formatViews';
import { thumbnailUrlForVideoId, toYouTubeWatchUrl } from '@/features/youtube-search/utils/youtubeUrl';

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

async function fetchYouTubeJson<T>(url: string, signal: AbortSignal): Promise<T> {
  try {
    const res = await fetch(url, { signal });
    const body = await res.text().catch(() => '');

    if (!res.ok) {
      const message = formatYouTubeDataApiHttpError(res.status, body);
      if (import.meta.env.DEV) {
        youtubeSearchError('youtube-api HTTP', {
          status: res.status,
          statusText: res.statusText,
          body: body.slice(0, 400),
        });
      }
      throw new Error(message);
    }

    try {
      return JSON.parse(body) as T;
    } catch {
      throw new Error('YouTube Data API: respuesta JSON inválida');
    }
  } catch (e) {
    if (signal.aborted) throw e;
    if (e instanceof Error && e.message.includes('YouTube Data API')) throw e;
    if (isNetworkFetchFailure(e)) {
      if (import.meta.env.DEV) {
        youtubeSearchError('youtube-api network', e);
      }
      throw new Error(
        'No se pudo conectar con YouTube. Comprueba tu red y las restricciones HTTP referrer de la API key en Google Cloud.'
      );
    }
    throw e;
  }
}

export async function searchViaYouTubeDataApi(
  query: string,
  signal: AbortSignal
): Promise<YouTubeVideoResult[]> {
  const key = getYouTubeApiKey();
  if (!key) {
    throw new Error('VITE_YOUTUBE_API_KEY no configurada');
  }

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    q: query,
    key,
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    relevanceLanguage: 'es',
    order: 'relevance',
  });

  youtubeSearchLog('search.list', { q: query });

  const searchData = await fetchYouTubeJson<{ items?: YouTubeSearchItem[] }>(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
    signal
  );

  const ids = (searchData.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) return [];

  const videoParams = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: ids.join(','),
    key,
  });

  youtubeSearchLog('videos.list', { count: ids.length });

  const videoData = await fetchYouTubeJson<{ items?: YouTubeVideoItem[] }>(
    `https://www.googleapis.com/youtube/v3/videos?${videoParams}`,
    signal
  );

  const byId = new Map(
    (videoData.items ?? [])
      .filter((v): v is YouTubeVideoItem & { id: string } => Boolean(v.id))
      .map((v) => [v.id, v])
  );

  return ids
    .map((id) => {
      const video = byId.get(id);
      const snippet = video?.snippet;
      const thumb =
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url ??
        thumbnailUrlForVideoId(id);
      const iso = video?.contentDetails?.duration ?? '';
      return {
        id,
        title: snippet?.title ?? 'Sin título',
        channelTitle: snippet?.channelTitle ?? '',
        duration: iso ? formatIso8601Duration(iso) : '',
        thumbnail: thumb,
        publishedAt: snippet?.publishedAt,
        views: formatViewCount(video?.statistics?.viewCount),
        url: toYouTubeWatchUrl(id),
      } satisfies YouTubeVideoResult;
    })
    .filter((v) => v.id);
}
