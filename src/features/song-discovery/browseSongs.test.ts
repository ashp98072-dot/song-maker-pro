import { describe, it, expect } from 'vitest';
import {
  browseCatalogSongs,
  browseSectionLabel,
  relatedSongsByArtist,
} from '@/features/song-discovery/browseSongs';
import type { Song } from '@/types/music';

function song(partial: Partial<Song> & { id: string; title: string }): Song {
  return {
    artist: 'Artista',
    originalKey: 'C',
    originalGender: 'male',
    scaleMode: 'major',
    lyrics: '',
    chords: 'C\nlinea',
    key: 'C',
    ...partial,
  };
}

describe('browseCatalogSongs', () => {
  const catalog = [
    song({ id: '1', title: 'Zion', isPopular: true }),
    song({ id: '2', title: 'Aleluya', artist: 'Hillsong' }),
    song({ id: '3', title: 'Ya no soy esclavo', isNew: true }),
    song({ id: '4', title: 'De gloria en gloria', artist: 'Marcos Witt' }),
  ];

  it('falls back to A–Z catalog when few featured', () => {
    const list = browseCatalogSongs(catalog, '');
    expect(list.map((s) => s.title)).toContain('Aleluya');
    expect(list[0].title).toBe('Aleluya');
  });

  it('searches title and artist', () => {
    const list = browseCatalogSongs(catalog, 'witt');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('4');
  });
});

describe('relatedSongsByArtist', () => {
  it('returns same-artist songs', () => {
    const catalog = [
      song({ id: '1', title: 'Uno', artist: 'Marcos Witt' }),
      song({ id: '2', title: 'Dos', artist: 'Marcos Witt' }),
      song({ id: '3', title: 'Otro', artist: 'Hillsong' }),
    ];
    const related = relatedSongsByArtist(catalog[0], catalog, 6);
    expect(related.map((s) => s.id)).toEqual(['2']);
  });
});

describe('browseSectionLabel', () => {
  it('labels search vs catalog', () => {
    expect(browseSectionLabel([], 'gloria')).toBe('Resultados');
    expect(browseSectionLabel([song({ id: '1', title: 'A' })], '')).toBe('Catálogo');
  });
});
