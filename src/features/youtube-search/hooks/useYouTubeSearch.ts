import { useState, useRef, useCallback, useEffect } from 'react';
import { searchYouTubeVideos } from '@/features/youtube-search/api/youtubeSearchApi';
import { formatSearchErrorForUser } from '@/features/youtube-search/api/searchErrors';
import type { YouTubeVideoResult, YouTubeSearchProvider } from '@/features/youtube-search/types';
import { ytDiagLog } from '@/features/youtube-search/ytDiagnostic';

const DEFAULT_DEBOUNCE_MS = 400;

export interface UseYouTubeSearchOptions {
  debounceMs?: number;
}

export function useYouTubeSearch(options: UseYouTubeSearchOptions = {}) {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [results, setResults] = useState<YouTubeVideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<YouTubeSearchProvider | null>(null);
  const lastQueryRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const cancel = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const search = useCallback(
    async (query: string) => {
      cancel();
      const trimmed = query.trim();
      lastQueryRef.current = trimmed;
      if (!trimmed) {
        setResults([]);
        setError(null);
        setActiveProvider(null);
        setLoading(false);
        return;
      }

      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);

      try {
        ytDiagLog('search start', trimmed);
        const { results: rawItems, provider } = await searchYouTubeVideos(trimmed, ac.signal);
        const items = Array.isArray(rawItems) ? rawItems : [];
        ytDiagLog('provider', provider);
        ytDiagLog('results count', items.length);
        if (import.meta.env.DEV && items.length > 0) {
          ytDiagLog('results sample id', items[0]?.id);
        }
        if (!ac.signal.aborted) {
          setResults(items);
          setActiveProvider(provider);
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        const message = formatSearchErrorForUser(e);
        if (message) {
          ytDiagLog('search error', message);
          setError(message);
        }
        setResults([]);
        setActiveProvider(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [cancel]
  );

  const retry = useCallback(() => {
    if (lastQueryRef.current) void search(lastQueryRef.current);
  }, [search]);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void search(query);
      }, debounceMs);
    },
    [search, debounceMs]
  );

  const reset = useCallback(() => {
    cancel();
    setResults([]);
    setError(null);
    setActiveProvider(null);
    setLoading(false);
    lastQueryRef.current = '';
  }, [cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return {
    results,
    loading,
    error,
    activeProvider,
    search,
    debouncedSearch,
    retry,
    reset,
    cancel,
  };
}
