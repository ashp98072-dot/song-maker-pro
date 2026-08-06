import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/types/music';
import { normalizeText } from '@/utils/textNormalize';

/** URL-safe slug from song title (no accents, lowercase, hyphens). */
export function slugifySongTitle(title: string | null | undefined): string {
  const normalized = normalizeText(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, 80) || 'cancion';
}

/** Unique slug; appends song id when titles collide in the library. */
export function buildSongSlug(
  song: Pick<Song, 'id' | 'title'>,
  allSongs?: Pick<Song, 'id' | 'title'>[]
): string {
  const base = slugifySongTitle(song.title);
  if (!allSongs?.length) return base;
  const sameBase = allSongs.filter((s) => slugifySongTitle(s.title) === base);
  if (sameBase.length > 1) return `${base}-${song.id}`;
  return base;
}

export function isNumericSongId(param: string): boolean {
  return /^\d+$/.test(param);
}

export function resolveSongIdFromRouteParam(
  param: string | undefined,
  songs: Pick<Song, 'id' | 'title'>[]
): string | null {
  if (!param) return null;
  const trimmed = param.trim();
  if (isNumericSongId(trimmed)) {
    // Only resolve when the id exists in catalog — avoid treating list Date.now() ids as songs.
    return songs.find((s) => s.id === trimmed)?.id ?? null;
  }
  const match = songs.find((s) => buildSongSlug(s, songs) === trimmed);
  return match?.id ?? null;
}

export function getSongPath(
  song: Pick<Song, 'id' | 'title'>,
  allSongs?: Pick<Song, 'id' | 'title'>[]
): string {
  return `/cancion/${buildSongSlug(song, allSongs)}`;
}

/** Resolve path when only the song id is known (falls back to id URL until catalog loads). */
export function getSongPathById(
  songId: string,
  allSongs?: Pick<Song, 'id' | 'title'>[]
): string {
  const song = allSongs?.find((s) => s.id === songId);
  return song ? getSongPath(song, allSongs) : `/cancion/${songId}`;
}

type UserSongRow = {
  song_id: string;
  title: string | null;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  chords: string | null;
  youtube_url: string | null;
};

function userSongRowToSong(row: UserSongRow): Song {
  const baseKey = row.key || 'C';
  const isMinor = typeof baseKey === 'string' && /m($|[^a-z])/i.test(baseKey);
  return {
    id: row.song_id,
    title: row.title || 'Canción',
    artist: row.artist || 'Artista desconocido',
    originalKey: baseKey,
    originalGender: 'male',
    scaleMode: isMinor ? 'minor' : 'major',
    lyrics: '',
    chords: row.chords || '',
    key: baseKey,
    bpm: row.bpm ?? undefined,
    youtubeUrl: row.youtube_url?.trim() || undefined,
  };
}

async function fetchSongFromDatabaseById(songId: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from('user_songs')
    .select('song_id, title, artist, key, bpm, chords, youtube_url')
    .eq('song_id', songId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return userSongRowToSong(data);
}

type SeoCatalogRow = {
  song_id: string;
  title: string | null;
  artist: string | null;
  chords: string | null;
};

function seoRowToSong(row: SeoCatalogRow): Song {
  return {
    id: String(row.song_id),
    title: row.title || 'Canción',
    artist: row.artist || 'Artista desconocido',
    originalKey: 'C',
    originalGender: 'male',
    scaleMode: 'major',
    lyrics: '',
    chords: row.chords || '',
    key: 'C',
  };
}

/** Public catalog via SECURITY DEFINER RPC (works for anon / guests). */
export async function fetchSongsViaSeoCatalog(limit = 5000): Promise<Song[]> {
  const { data, error } = await supabase.rpc('seo_song_catalog', { p_limit: limit });
  if (error || !Array.isArray(data) || !data.length) return [];
  const byId = new Map<string, Song>();
  for (const row of data as SeoCatalogRow[]) {
    if (!row?.song_id || byId.has(String(row.song_id))) continue;
    byId.set(String(row.song_id), seoRowToSong(row));
  }
  return [...byId.values()];
}

/**
 * Resolves a song by numeric id or slug.
 * Uses in-memory catalog first, then Supabase (user_songs), then seo_song_catalog RPC.
 */
export async function getSongFromSlugOrId(
  slugOrId: string,
  catalog: Song[] = []
): Promise<Song | null> {
  const trimmed = slugOrId?.trim();
  if (!trimmed) return null;

  const catalogId = resolveSongIdFromRouteParam(trimmed, catalog);
  if (catalogId) {
    const fromCatalog = catalog.find((s) => s.id === catalogId);
    if (fromCatalog) return fromCatalog;
    const fromDb = await fetchSongFromDatabaseById(catalogId);
    if (fromDb) return fromDb;
  }

  if (isNumericSongId(trimmed)) {
    const fromDb = await fetchSongFromDatabaseById(trimmed);
    if (fromDb) return fromDb;
  }

  const { data, error } = await supabase
    .from('user_songs')
    .select('song_id, title, artist, key, bpm, chords, youtube_url')
    .limit(1000);

  if (!error && data?.length) {
    const mapped = data.map(userSongRowToSong);
    const resolvedId = resolveSongIdFromRouteParam(trimmed, mapped);
    if (resolvedId) return mapped.find((s) => s.id === resolvedId) ?? null;
  }

  const seoSongs = await fetchSongsViaSeoCatalog();
  if (!seoSongs.length) return null;
  const seoId = resolveSongIdFromRouteParam(trimmed, seoSongs);
  return seoId ? seoSongs.find((s) => s.id === seoId) ?? null : null;
}
