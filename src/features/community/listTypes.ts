import type { Gender, ScaleMode, Song } from '@/types/music';
import { slugifySongTitle } from '@/utils/songSlug';
import { normalizeGenreId } from '@/features/community/genres';

/** Snapshot of a song embedded in a public cadena (setlist). */
export type PublicListSongSnapshot = {
  song_id: string;
  title: string;
  artist: string;
  original_key: string;
  scale_mode: ScaleMode;
  original_gender: Gender;
  chords: string;
  bpm?: number | null;
  genre?: string | null;
  /** Director personal semitones for this song in the cadena. */
  semitones?: number;
};

export type PublicListRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_name: string;
  songs: PublicListSongSnapshot[];
  song_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicListComment = {
  id: string;
  list_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export function buildListSlug(name: string, uniqueSuffix?: string): string {
  const base = slugifySongTitle(name) || 'cadena';
  const suffix = (uniqueSuffix || Date.now().toString(36)).slice(-6);
  return `${base}-${suffix}`;
}

export function songToSnapshot(
  song: Song,
  semitones = 0
): PublicListSongSnapshot {
  return {
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    original_key: song.originalKey || 'C',
    scale_mode: song.scaleMode || 'major',
    original_gender: song.originalGender === 'female' ? 'female' : 'male',
    chords: song.chords || '',
    bpm: song.bpm ?? null,
    genre: song.genre ? normalizeGenreId(song.genre) : null,
    semitones: semitones || 0,
  };
}

export function snapshotToSong(snap: PublicListSongSnapshot): Song {
  return {
    id: snap.song_id,
    title: snap.title,
    artist: snap.artist,
    originalKey: snap.original_key || 'C',
    originalGender: snap.original_gender === 'female' ? 'female' : 'male',
    scaleMode: snap.scale_mode === 'minor' ? 'minor' : 'major',
    lyrics: '',
    chords: snap.chords || '',
    bpm: snap.bpm ?? undefined,
    genre: snap.genre ? normalizeGenreId(snap.genre) : undefined,
  };
}

export function parseListSongsJson(raw: unknown): PublicListSongSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const title = String(o.title || '').trim();
      const song_id = String(o.song_id || '').trim();
      if (!title || !song_id) return null;
      return {
        song_id,
        title,
        artist: String(o.artist || ''),
        original_key: String(o.original_key || 'C'),
        scale_mode: o.scale_mode === 'minor' ? ('minor' as const) : ('major' as const),
        original_gender: o.original_gender === 'female' ? ('female' as const) : ('male' as const),
        chords: String(o.chords || ''),
        bpm: typeof o.bpm === 'number' ? o.bpm : null,
        genre: o.genre ? String(o.genre) : null,
        semitones: typeof o.semitones === 'number' ? o.semitones : 0,
      } satisfies PublicListSongSnapshot;
    })
    .filter((x): x is PublicListSongSnapshot => !!x);
}
