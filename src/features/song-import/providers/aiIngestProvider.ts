import type { ImportBatchResult, SongImportProvider } from '@/features/song-import/types';
import { parseBulkPastedSongs } from '@/features/song-import/utils/pasteBulkSongs';

/**
 * Client-side “AI-ish” ingest: smart paste + multi-song split.
 * No web scraping — user pastes material they have rights to use.
 * Server/OCR can plug in later via the same parseText contract.
 */
export const aiIngestProvider: SongImportProvider = {
  id: 'ai-ingest',
  label: 'Pegado inteligente (texto / lote)',
  licenseNote: 'El usuario confirma derechos sobre el material pegado; sin scrapear la web.',
  canBulkImport: true,
  async parseText(text) {
    const { songs, errors, skipped } = parseBulkPastedSongs(text);
    return {
      source: 'ai-ingest',
      imported: songs.length,
      skipped,
      errors,
      songs,
    } satisfies ImportBatchResult;
  },
};
