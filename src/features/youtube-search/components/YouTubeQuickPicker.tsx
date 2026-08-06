import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Search, Youtube } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { buildYouTubeSearchQuery } from '@/features/youtube-search/utils/buildSearchQuery';
import { useYouTubeSearch } from '@/features/youtube-search/hooks/useYouTubeSearch';
import type { YouTubeVideoResult } from '@/features/youtube-search/types';
import {
  getConfiguredSearchProvider,
  getProviderDisplayName,
} from '@/features/youtube-search/api/getSearchProvider';
import { ytDiagLog } from '@/features/youtube-search/ytDiagnostic';

function ResultSkeleton() {
  return (
    <li className="flex gap-3 p-2 animate-pulse">
      <div className="w-28 h-[4.5rem] rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/4" />
      </div>
    </li>
  );
}

export interface YouTubeQuickPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songTitle: string;
  songArtist?: string;
  onSelect: (video: YouTubeVideoResult) => void;
}

export function YouTubeQuickPicker({
  open,
  onOpenChange,
  songTitle,
  songArtist,
  onSelect,
}: YouTubeQuickPickerProps) {
  useEffect(() => {
    ytDiagLog('mounted', 'YouTubeQuickPicker', { open, songTitle });
  }, [open, songTitle]);

  const {
    results,
    loading,
    error,
    activeProvider,
    search,
    debouncedSearch,
    retry,
    reset,
  } = useYouTubeSearch();
  const [query, setQuery] = useState('');

  const safeResults = Array.isArray(results) ? results : [];
  const defaultQuery = buildYouTubeSearchQuery(songTitle ?? '', songArtist);
  const configured = getConfiguredSearchProvider();
  const providerLabel = activeProvider
    ? getProviderDisplayName(activeProvider)
    : getProviderDisplayName(configured);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    ytDiagLog('open picker', { defaultQuery, provider: configured });
    setQuery(defaultQuery);
    void search(defaultQuery);
  }, [open, defaultQuery, search, reset, configured]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void search(query);
    },
    [query, search]
  );

  const handleSelect = useCallback(
    (video: YouTubeVideoResult) => {
      const url = (video?.url ?? '').trim();
      if (!video?.id || !url) {
        ytDiagLog('invalid video selection', video);
        return;
      }
      onSelect({ ...video, url });
    },
    [onSelect]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg w-[calc(100vw-1.5rem)] sm:max-w-lg p-0 gap-0 overflow-hidden z-[130]"
        data-youtube-quick-picker
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Youtube className="w-5 h-5 text-red-500 shrink-0" />
            Elegir video
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="text-foreground font-medium">{songTitle}</span>
            {songArtist ? ` · ${songArtist}` : ''}
            <span className="block mt-1 text-muted-foreground">
              Fuente: <span className="text-gold font-medium">{providerLabel}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 py-2 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground"
                placeholder="Refinar búsqueda…"
                aria-label="Buscar en YouTube"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-gold text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain px-2 py-2">
          {loading && safeResults.length === 0 && (
            <ul className="space-y-1" aria-busy="true" aria-label="Cargando resultados">
              {Array.from({ length: 4 }).map((_, i) => (
                <ResultSkeleton key={i} />
              ))}
            </ul>
          )}

          {error && !loading && (
            <div className="text-center py-8 px-3 space-y-3">
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && safeResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">
              Sin resultados. Prueba otra búsqueda.
            </p>
          )}

          <ul className="space-y-1">
            {safeResults.map((video) => {
              const thumb =
                video.thumbnail?.trim() ||
                `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
              return (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(video)}
                  className="w-full flex gap-3 p-2 rounded-xl text-left hover:bg-secondary/80 active:bg-secondary transition-colors"
                >
                  <img
                    src={thumb}
                    alt=""
                    className="w-28 h-[4.5rem] object-cover rounded-lg shrink-0 bg-muted"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {video.channelTitle}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-muted-foreground">
                      {video.duration ? (
                        <span className="font-mono text-gold">{video.duration}</span>
                      ) : null}
                      {video.views ? <span>{video.views}</span> : null}
                    </div>
                  </div>
                </button>
              </li>
            );
            })}
          </ul>

          {loading && safeResults.length > 0 ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default YouTubeQuickPicker;
