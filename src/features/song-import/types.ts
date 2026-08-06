import type { Song } from '@/types/music';

/** Legal import source — no scraping; each provider declares its license. */
export type SongImportSourceId =
  | 'chordpro'
  | 'opensong'
  | 'community'
  | 'external-api'
  | 'ai-ingest';

export type ImportBatchResult = {
  source: SongImportSourceId;
  imported: number;
  skipped: number;
  errors: { file?: string; message: string }[];
  songs: Partial<Song>[];
};

export type SongImportProvider = {
  id: SongImportSourceId;
  label: string;
  /** Human-readable license / terms summary */
  licenseNote: string;
  canBulkImport: boolean;
  parseFiles?: (files: File[]) => Promise<ImportBatchResult>;
  parseText?: (text: string, filename?: string) => Promise<ImportBatchResult>;
};
