import type { YouTubeSearchProvider } from '@/features/youtube-search/types';
import {
  getYouTubeApiKey,
  hasYouTubeApiKey,
  logYouTubeApiKeyDiagnostics,
} from '@/features/youtube-search/api/getYouTubeApiKey';
import { youtubeSearchLog } from '@/features/youtube-search/api/devLog';

/** Mock solo en dev y con VITE_YOUTUBE_SEARCH_MODE=mock explícito. */
export function isMockSearchForced(): boolean {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.VITE_YOUTUBE_SEARCH_MODE === 'mock'
  );
}

/** Con API key válida → solo YouTube Data API (sin Piped automático). */
export function shouldUseYouTubeDataApiOnly(): boolean {
  return hasYouTubeApiKey() && !isMockSearchForced();
}

export function getConfiguredSearchProvider(): YouTubeSearchProvider {
  if (isMockSearchForced()) return 'mock';
  if (hasYouTubeApiKey()) return 'youtube-api';
  if (import.meta.env.VITE_YOUTUBE_SEARCH_MODE === 'piped') return 'piped';
  return 'piped';
}

export function logSearchProviderSelection(): void {
  logYouTubeApiKeyDiagnostics();
  const provider = getConfiguredSearchProvider();
  youtubeSearchLog('provider selected', provider);
}

export function getProviderDisplayName(provider: YouTubeSearchProvider): string {
  switch (provider) {
    case 'youtube-api':
      return 'YouTube API';
    case 'piped':
      return 'Piped fallback';
    case 'mock':
      return 'Modo demo (dev)';
    default:
      return provider;
  }
}
