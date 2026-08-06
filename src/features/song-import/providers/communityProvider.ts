import type { SongImportProvider } from '@/features/song-import/types';

/**
 * Community library: user uploads, votes, versioning (DB-backed — wire to Supabase later).
 */
export const communityProvider: SongImportProvider = {
  id: 'community',
  label: 'Biblioteca comunitaria',
  licenseNote: 'Contenido subido por usuarios bajo términos de la app; moderación y reportes.',
  canBulkImport: false,
};
