import { supabase } from '@/integrations/supabase/client';
import type { Gender, ScaleMode, Song } from '@/types/music';
import { slugifySongTitle } from '@/utils/songSlug';
import { matchesSearch, normalizeText } from '@/utils/textNormalize';
import { normalizeGenreId, type CommunityGenreId } from '@/features/community/genres';

export type PublicSongRow = {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  original_key: string;
  scale_mode: string;
  chords: string;
  bpm: number | null;
  suggested_key: string | null;
  title_slug: string;
  is_cover: boolean;
  uploader_id: string;
  genre: string;
  original_gender: string;
  created_at: string;
  updated_at: string;
};

export type CommunityFacets = {
  genres: string[];
  keys: string[];
  artists: string[];
  total: number;
};

export type CommunityBrowseFilters = {
  search?: string;
  genre?: string | null;
  key?: string | null;
  artist?: string | null;
};

export type PublishPublicSongInput = {
  song: Song;
  genre: CommunityGenreId;
  isCover?: boolean;
};

function asGender(value: string | null | undefined): Gender {
  return value === 'female' ? 'female' : 'male';
}

function asScaleMode(value: string | null | undefined): ScaleMode {
  return value === 'minor' ? 'minor' : 'major';
}

export function mapPublicSongRow(row: PublicSongRow): Song {
  return {
    id: row.song_id,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key || 'C',
    originalGender: asGender(row.original_gender),
    scaleMode: asScaleMode(row.scale_mode),
    lyrics: '',
    chords: row.chords || '',
    bpm: row.bpm ?? undefined,
    key: row.suggested_key || row.original_key || undefined,
    genre: normalizeGenreId(row.genre),
    createdAt: row.created_at,
  };
}

export async function fetchPublicSongs(limit = 300): Promise<Song[]> {
  const { data, error } = await supabase
    .from('public_songs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[community] fetchPublicSongs', error);
    throw error;
  }

  return ((data ?? []) as PublicSongRow[]).map(mapPublicSongRow);
}

export async function fetchCommunityFacets(): Promise<CommunityFacets> {
  const { data, error } = await supabase.rpc('public_song_filter_facets');
  if (error) {
    console.error('[community] facets', error);
    return { genres: [], keys: [], artists: [], total: 0 };
  }
  const raw = (data ?? {}) as Partial<CommunityFacets>;
  return {
    genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    keys: Array.isArray(raw.keys) ? raw.keys.map(String) : [],
    artists: Array.isArray(raw.artists) ? raw.artists.map(String) : [],
    total: typeof raw.total === 'number' ? raw.total : 0,
  };
}

export function filterCommunitySongs(
  songs: Song[],
  filters: CommunityBrowseFilters
): Song[] {
  const q = filters.search?.trim() ?? '';
  const genre = filters.genre?.trim() || null;
  const key = filters.key?.trim() || null;
  const artist = filters.artist?.trim() || null;

  return songs.filter((s) => {
    if (genre) {
      if (!s.genre) return false;
      if (normalizeGenreId(s.genre) !== genre) return false;
    }
    if (key) {
      const songKey = (s.originalKey || s.key || '').trim();
      if (normalizeText(songKey) !== normalizeText(key)) return false;
    }
    if (artist && normalizeText(s.artist) !== normalizeText(artist)) return false;
    if (!q) return true;
    return (
      matchesSearch(s.title, q) ||
      matchesSearch(s.artist, q) ||
      matchesSearch(s.originalKey, q) ||
      matchesSearch(s.genre, q)
    );
  });
}

/** Distinct filter options from an in-memory song list (catalog fallback). */
export function buildLocalFacets(songs: Song[]): CommunityFacets {
  const genres = new Set<string>();
  const keys = new Set<string>();
  const artists = new Set<string>();
  for (const s of songs) {
    if (s.genre) genres.add(s.genre);
    const k = (s.originalKey || s.key || '').trim();
    if (k) keys.add(k);
    const a = (s.artist || '').trim();
    if (a) artists.add(a);
  }
  return {
    genres: [...genres].sort((a, b) => a.localeCompare(b, 'es')),
    keys: [...keys].sort((a, b) => a.localeCompare(b, 'es')),
    artists: [...artists].sort((a, b) => a.localeCompare(b, 'es')),
    total: songs.length,
  };
}

export async function publishSongToPublicLibrary(
  input: PublishPublicSongInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { song, genre, isCover = false } = input;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      ok: false,
      error: 'Inicia sesión para publicar en la biblioteca comunitaria',
    };
  }

  const titleSlug = slugifySongTitle(song.title);
  const payload = {
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    original_key: song.originalKey || 'C',
    scale_mode: song.scaleMode || 'major',
    chords: song.chords || '',
    bpm: song.bpm ?? null,
    suggested_key: song.key ?? song.originalKey ?? null,
    title_slug: titleSlug,
    is_cover: isCover,
    uploader_id: authData.user.id,
    genre: normalizeGenreId(genre),
    original_gender: song.originalGender === 'female' ? 'female' : 'male',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('public_songs').upsert(payload, {
    onConflict: 'song_id',
  });

  if (error) {
    console.error('[community] publish', error);
    return { ok: false, error: error.message || 'No se pudo publicar' };
  }

  return { ok: true };
}
