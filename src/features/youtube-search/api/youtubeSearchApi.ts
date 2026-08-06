import type { YouTubeSearchResponse, YouTubeVideoResult } from '@/features/youtube-search/types';
import {
  getConfiguredSearchProvider,
  isMockSearchForced,
  logSearchProviderSelection,
  shouldUseYouTubeDataApiOnly,
} from '@/features/youtube-search/api/getSearchProvider';
import { searchViaYouTubeDataApi } from '@/features/youtube-search/api/youtubeDataApi';
import { searchViaPiped } from '@/features/youtube-search/api/pipedProvider';
import { youtubeSearchLog, youtubeSearchError } from '@/features/youtube-search/api/devLog';
import { formatSearchErrorForUser } from '@/features/youtube-search/api/searchErrors';
import {
  getCachedSearch,
  getInflightSearch,
  setCachedSearch,
  setInflightSearch,
} from '@/features/youtube-search/api/searchCache';
import { formatVideoDuration } from '@/features/youtube-search/utils/formatDuration';
import { thumbnailUrlForVideoId, toYouTubeWatchUrl } from '@/features/youtube-search/utils/youtubeUrl';

function normalizeResults(raw: unknown): YouTubeVideoResult[] {
  return Array.isArray(raw) ? raw : [];
}

function normalizeResponse(resp: YouTubeSearchResponse): YouTubeSearchResponse {
  return {
    ...resp,
    results: normalizeResults(resp.results),
  };
}

function getMockResults(query: string): YouTubeVideoResult[] {
  const slug = query.slice(0, 48) || 'worship';
  return [
    {
      id: 'mock-live-1',
      title: `${slug} — Live worship (demo)`,
      channelTitle: 'Modo demo (solo DEV)',
      duration: formatVideoDuration(372),
      thumbnail: thumbnailUrlForVideoId('jfKfPfyJRdk'),
      url: toYouTubeWatchUrl('jfKfPfyJRdk'),
    },
  ];
}

function rethrowSearchError(error: unknown): never {
  const friendly = formatSearchErrorForUser(error);
  if (friendly) throw new Error(friendly);
  throw error;
}

async function executeSearch(
  query: string,
  signal: AbortSignal
): Promise<YouTubeSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], provider: getConfiguredSearchProvider() };
  }

  logSearchProviderSelection();

  if (isMockSearchForced()) {
    youtubeSearchLog('provider', 'mock (forced)');
    await new Promise((r) => setTimeout(r, 200));
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return { results: getMockResults(trimmed), provider: 'mock' };
  }

  if (shouldUseYouTubeDataApiOnly()) {
    try {
      const results = await searchViaYouTubeDataApi(trimmed, signal);
      youtubeSearchLog('success', { provider: 'youtube-api', count: results.length });
      return { results, provider: 'youtube-api' };
    } catch (e) {
      if (signal.aborted) throw e;
      youtubeSearchError('youtube-api failed', e);
      rethrowSearchError(e);
    }
  }

  const configured = getConfiguredSearchProvider();
  youtubeSearchLog('using piped (no API key)', { mode: import.meta.env.VITE_YOUTUBE_SEARCH_MODE });

  try {
    const results = await searchViaPiped(trimmed, signal);
    youtubeSearchLog('success', { provider: 'piped', count: results.length });
    return { results, provider: 'piped' };
  } catch (e) {
    if (signal.aborted) throw e;
    youtubeSearchError('piped failed', e);
    rethrowSearchError(e);
  }
}

/**
 * Búsqueda con caché, deduplicación de requests en vuelo.
 * Con VITE_YOUTUBE_API_KEY → solo YouTube Data API (sin fallback Piped).
 */
export async function searchYouTubeVideos(
  query: string,
  outerSignal?: AbortSignal
): Promise<YouTubeSearchResponse> {
  const trimmed = query.trim();

  if (!trimmed) {
    return { results: [], provider: getConfiguredSearchProvider() };
  }

  const ownedAbort = outerSignal ? null : new AbortController();
  const signal = outerSignal ?? ownedAbort!.signal;

  const cached = getCachedSearch(trimmed);
  if (cached) {
    youtubeSearchLog('cache hit', trimmed);
    return normalizeResponse(cached);
  }

  const inflight = getInflightSearch(trimmed);
  if (inflight) {
    youtubeSearchLog('dedupe inflight', trimmed);
    return inflight;
  }

  const promise = executeSearch(trimmed, signal).then((response) => {
    const normalized = normalizeResponse(response);
    if (!signal.aborted) setCachedSearch(trimmed, normalized);
    return normalized;
  });

  setInflightSearch(trimmed, promise);
  return promise;
}

/** Compat: solo lista de videos (usa searchYouTubeVideos). */
export async function searchYouTubeVideoList(
  query: string,
  signal?: AbortSignal
): Promise<YouTubeVideoResult[]> {
  const { results } = await searchYouTubeVideos(query, signal);
  return results;
}
