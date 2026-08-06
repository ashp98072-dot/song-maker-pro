import type { SongImportProvider, SongImportSourceId } from '@/features/song-import/types';
import { chordProProvider } from '@/features/song-import/providers/chordProProvider';
import { communityProvider } from '@/features/song-import/providers/communityProvider';
import { aiIngestProvider } from '@/features/song-import/providers/aiIngestProvider';

const providers: SongImportProvider[] = [chordProProvider, communityProvider, aiIngestProvider];

export function listSongImportProviders(): SongImportProvider[] {
  return providers;
}

export function getSongImportProvider(id: SongImportSourceId): SongImportProvider | undefined {
  return providers.find((p) => p.id === id);
}

/**
 * External APIs (SongSelect/CCLI, PraiseCharts, etc.) require partner agreements.
 * Register here only after legal review — no scraping.
 */
export const EXTERNAL_API_PLACEHOLDER: SongImportProvider = {
  id: 'external-api',
  label: 'Integraciones licenciadas (pendiente)',
  licenseNote: 'SongSelect/CCLI y similares requieren contrato; no implementar sin API oficial.',
  canBulkImport: false,
};
