import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/types/music';
import { slugifySongTitle } from '@/utils/songSlug';

export async function saveAdminImportBatch(songs: Song[], publish: boolean, updateExisting = false) {
  const { data, error } = await supabase.rpc('admin_import_songs', {
    p_publish: publish,
    p_songs: songs.map(song => ({
      id: song.id, title: song.title, artist: song.artist, chords: song.chords,
      originalKey: song.originalKey, scaleMode: song.scaleMode, originalGender: song.originalGender,
      genre: song.genre || 'adoracion', bpm: song.bpm ?? null, youtubeUrl: song.youtubeUrl ?? null,
      titleSlug: slugifySongTitle(song.title), updateExisting,
    })),
  });
  if (error) throw new Error(error.code === 'PGRST202'
    ? 'Falta habilitar la importación administrativa en la base de datos (migración admin_import_songs).'
    : error.message);
  if (updateExisting && data?.some(row => !row.target_id)) {
    throw new Error('Aplica la migración 20261007100000_admin_import_updates antes de actualizar canciones');
  }
  if (!data || data.length !== songs.length || data.some((row, index) =>
    row.song_id !== songs[index].id || (row.status === 'updated' && !row.target_id) || !['imported', 'updated', 'skipped', 'error'].includes(row.status))) {
    throw new Error('Respuesta incompleta del servidor; revisa el catálogo antes de reintentar');
  }
  return data;
}
