import type { Song } from '@/types/music';
import { supabase } from '@/integrations/supabase/client';
export type CatalogCorrection = { song_id: string; chords: string };

export async function fetchCatalogCorrections(): Promise<CatalogCorrection[]> {
  const result: CatalogCorrection[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.rpc('catalog_song_corrections_read', { p_offset: offset });
    if (error) throw error;
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}

/** Apply after every other source; list IDs, keys and personal settings stay intact. */
export function applyCatalogCorrections(songs: Song[], corrections: CatalogCorrection[]): Song[] {
  const byId = new Map(corrections.map(row => [row.song_id, row.chords]));
  return songs.map(song => {
    const chords = byId.get(song.id);
    return chords !== undefined && chords !== song.chords ? { ...song, chords } : song;
  });
}
