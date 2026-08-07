import type { Song } from '@/types/music';
import { slugifySongTitle } from '@/utils/songSlug';
import { normalizeText } from '@/utils/textNormalize';

/** Stable-ish id so re-importing the same title/artist upserts instead of cloning. */
export function importSongId(title: string, artist: string): string {
  const t = slugifySongTitle(title) || 'sin-titulo';
  const a = slugifySongTitle(artist || 'desconocido') || 'desconocido';
  return `imp-${t.slice(0, 48)}-${a.slice(0, 32)}`;
}

export function normalizeImportedSong(partial: Partial<Song>, index = 0): Song | null {
  const title = (partial.title || '').trim();
  const chords = (partial.chords || '').trim();
  if (!title || !chords) return null;

  const artist = (partial.artist || 'Desconocido').trim() || 'Desconocido';
  const originalKey = (partial.originalKey || partial.key || 'C').trim() || 'C';
  const id = partial.id?.startsWith('imp-')
    ? partial.id
    : `${importSongId(title, artist)}${index > 0 ? `-${index}` : ''}`;

  return {
    id,
    title,
    artist,
    originalKey,
    originalGender: partial.originalGender === 'female' ? 'female' : 'male',
    scaleMode: partial.scaleMode === 'minor' ? 'minor' : 'major',
    lyrics: partial.lyrics || '',
    chords,
    key: partial.key || originalKey,
    bpm: typeof partial.bpm === 'number' ? partial.bpm : undefined,
    youtubeUrl: partial.youtubeUrl,
    genre: partial.genre,
    isNew: true,
    createdAt: new Date().toLocaleDateString(),
  };
}

export function songDedupeKey(title: string, artist: string): string {
  return `${normalizeText(title)}::${normalizeText(artist)}`;
}

export function findLibraryDuplicate(
  catalog: Song[],
  title: string,
  artist: string
): Song | undefined {
  const key = songDedupeKey(title, artist);
  return catalog.find((s) => songDedupeKey(s.title, s.artist) === key);
}
