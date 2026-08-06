import type { YouTubeSearchResponse } from '@/features/youtube-search/types';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  data: YouTubeSearchResponse;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<YouTubeSearchResponse>>();

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

export function getCachedSearch(query: string): YouTubeSearchResponse | null {
  const key = cacheKey(query);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedSearch(query: string, data: YouTubeSearchResponse): void {
  cache.set(cacheKey(query), {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function getInflightSearch(
  query: string
): Promise<YouTubeSearchResponse> | undefined {
  return inflight.get(cacheKey(query));
}

export function setInflightSearch(
  query: string,
  promise: Promise<YouTubeSearchResponse>
): void {
  const key = cacheKey(query);
  inflight.set(key, promise);
  promise.finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
}
