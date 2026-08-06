import { getYouTubeApiKeyFromEnv, getOptionalEnv } from '@/config/env';
import { youtubeSearchLog } from '@/features/youtube-search/api/devLog';

export function getYouTubeApiKey(): string | undefined {
  const key = getYouTubeApiKeyFromEnv();
  return key && key.length > 10 ? key : undefined;
}

export function hasYouTubeApiKey(): boolean {
  return Boolean(getYouTubeApiKey());
}

/** Solo DEV — nunca loguea el valor de la clave. */
export function logYouTubeApiKeyDiagnostics(): void {
  if (!import.meta.env.DEV) return;
  const raw = getOptionalEnv('VITE_YOUTUBE_API_KEY');
  const key = getYouTubeApiKey();
  youtubeSearchLog('api key exists', {
    configured: Boolean(key),
    rawEnvPresent: Boolean(raw),
    length: key?.length ?? 0,
  });
}
