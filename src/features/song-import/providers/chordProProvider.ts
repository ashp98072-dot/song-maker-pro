import type { ImportBatchResult, SongImportProvider } from '@/features/song-import/types';
import { parseChordProDocument } from '@/features/song-import/parsers/chordProParser';

export const chordProProvider: SongImportProvider = {
  id: 'chordpro',
  label: 'ChordPro / texto (.pro, .chopro, .txt)',
  licenseNote: 'Archivos locales del usuario; sin redistribución automática.',
  canBulkImport: true,
  async parseFiles(files) {
    const songs: ImportBatchResult['songs'] = [];
    const errors: { file?: string; message: string }[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseChordProDocument(text, file.name);
        if (parsed) songs.push(parsed);
        else errors.push({ file: file.name, message: 'No se pudo interpretar el archivo' });
      } catch (e) {
        errors.push({ file: file.name, message: e instanceof Error ? e.message : 'Error de lectura' });
      }
    }
    return {
      source: 'chordpro',
      imported: songs.length,
      skipped: files.length - songs.length,
      errors,
      songs,
    };
  },
};
