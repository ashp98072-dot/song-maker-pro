import type { Song } from '@/types/music';
import { matchesSearch, normalizeText } from '@/utils/textNormalize';

const UNKNOWN_ARTISTS = new Set(['', 'artista desconocido', 'unknown', 'desconocido']);

function titleSort(a: Song, b: Song) {
  return (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
}

/** Home / browse: search all songs; otherwise featured, with A–Z fallback. */
export function browseCatalogSongs(
  songs: Song[],
  query: string,
  opts?: { browseLimit?: number; searchLimit?: number }
): Song[] {
  const browseLimit = opts?.browseLimit ?? 72;
  const searchLimit = opts?.searchLimit ?? 100;
  const q = query.trim();

  if (q) {
    return songs
      .filter(
        (s) => matchesSearch(s.title, q) || matchesSearch(s.artist, q) || matchesSearch(s.key, q)
      )
      .sort(titleSort)
      .slice(0, searchLimit);
  }

  const featured = songs.filter((s) => s.isPopular || s.isNew);
  if (featured.length >= 6) {
    return [...featured].sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return titleSort(a, b);
    }).slice(0, browseLimit);
  }

  return [...songs]
    .filter((s) => (s.title || '').trim().length > 0)
    .sort(titleSort)
    .slice(0, browseLimit);
}

export function relatedSongsByArtist(
  song: Pick<Song, 'id' | 'artist' | 'title'>,
  catalog: Song[],
  limit = 6
): Song[] {
  const artist = normalizeText(song.artist);
  if (artist && !UNKNOWN_ARTISTS.has(artist)) {
    const same = catalog
      .filter((s) => s.id !== song.id && normalizeText(s.artist) === artist)
      .sort(titleSort);
    if (same.length) return same.slice(0, limit);
  }

  // Soft fallback: titles that share a significant word
  const words = normalizeText(song.title)
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  if (!words.length) return [];
  return catalog
    .filter((s) => {
      if (s.id === song.id) return false;
      const t = normalizeText(s.title);
      return words.some((w) => t.includes(w));
    })
    .sort(titleSort)
    .slice(0, limit);
}

export function browseSectionLabel(songs: Song[], query: string): string {
  if (query.trim()) return 'Resultados';
  const featured = songs.filter((s) => s.isPopular || s.isNew);
  if (featured.length >= 6) return 'Populares y recién agregadas';
  return 'Catálogo';
}
