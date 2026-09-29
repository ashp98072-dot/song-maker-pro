import type { ImportBatchResult, SongImportProvider } from '../types';
import { parseHolyrics } from '../parsers/holyricsParser';

export const holyricsProvider: SongImportProvider = {
  id: 'holyrics', label: 'Holyrics (.muf / .mufl)',
  licenseNote: 'Archivos del administrador; revisar antes de publicar.', canBulkImport: true,
  async parseFiles(files) {
    const result: ImportBatchResult = { source: 'holyrics', songs: [], imported: 0, skipped: 0, errors: [] };
    for (const file of files) {
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera 10 MB');
        const parsed = parseHolyrics(await file.arrayBuffer());
        result.songs.push(...parsed.songs);
        result.skipped += parsed.errors.length;
        result.errors.push(...parsed.errors.map(message => ({ file: file.name, message })));
      } catch (error) {
        result.errors.push({ file: file.name, message: error instanceof Error ? error.message : 'Error de lectura' });
      }
    }
    result.imported = result.songs.length;
    return result;
  },
};
