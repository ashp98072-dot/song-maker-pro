import type { ImportBatchResult, SongImportProvider } from '@/features/song-import/types';

/**
 * AI ingestion (PDF/DOCX/image) — server-side only; requires explicit user upload consent.
 */
export const aiIngestProvider: SongImportProvider = {
  id: 'ai-ingest',
  label: 'IA — PDF, imagen o texto pegado',
  licenseNote: 'Procesamiento en servidor; el usuario confirma derechos sobre el material.',
  canBulkImport: true,
  async parseText(text) {
    return {
      source: 'ai-ingest',
      imported: 0,
      skipped: 1,
      errors: [{ message: 'Ingestión IA pendiente de conectar al backend' }],
      songs: [],
    } satisfies ImportBatchResult;
  },
};
