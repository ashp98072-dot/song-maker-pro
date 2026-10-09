import type { YouTubeSearchResponse, YouTubeVideoResult } from '@/features/youtube-search/types';
import {
  getConfiguredSearchProvider,
  isMockSearchForced,
  logSearchProviderSelection,

} from '@/features/youtube-search/api/getSearchProvider';
import { Capacitor } from '@capacitor/core';

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

  try {
    const base = Capacitor.isNativePlatform() ? 'https://worshiptranspose.com' : '';
    const response = await fetch(`${base}/api/youtube-search?q=${encodeURIComponent(trimmed)}`, { signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'No se pudo buscar videos en YouTube.');
    return { results: normalizeResults(body.results), provider: 'youtube-api' };
  } catch (error) {
    if (signal.aborted) throw error;
    youtubeSearchError('server search failed', error);
    rethrowSearchError(error);
  }
}
/**
 * Búsqueda con caché, deduplicación de requests en vuelo.
 * La clave privada permanece en el servidor de Vercel.
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

