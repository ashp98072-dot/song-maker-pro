import type { YouTubeSearchProvider } from '@/features/youtube-search/types';

import { youtubeSearchLog } from '@/features/youtube-search/api/devLog';

/** Mock solo en dev y con VITE_YOUTUBE_SEARCH_MODE=mock explícito. */
export function isMockSearchForced(): boolean {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.VITE_YOUTUBE_SEARCH_MODE === 'mock'
  );
}

/** Las búsquedas oficiales pasan por el servidor; mock solo en desarrollo. */
export function shouldUseYouTubeDataApiOnly(): boolean {
  return !isMockSearchForced();
}

export function getConfiguredSearchProvider(): YouTubeSearchProvider {
  if (isMockSearchForced()) return 'mock';
  return 'youtube-api';

}

export function logSearchProviderSelection(): void {

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


