import { describe, expect, it } from 'vitest';
import { filterCommunitySongs } from '@/features/community/publicSongsApi';
import { genreLabel, normalizeGenreId } from '@/features/community/genres';
import type { Song } from '@/types/music';

const base = (partial: Partial<Song> & Pick<Song, 'id' | 'title'>): Song => ({
  artist: 'Hillsong',
  originalKey: 'G',
  originalGender: 'male',
  scaleMode: 'major',
  lyrics: '',
  chords: 'G D Em C',
  genre: 'adoracion',
  ...partial,
});

describe('community genres', () => {
  it('normalizes unknown genre to adoracion', () => {
    expect(normalizeGenreId('nope')).toBe('adoracion');
    expect(normalizeGenreId('alabanza')).toBe('alabanza');
  });

  it('labels known genres', () => {
    expect(genreLabel('ninos')).toBe('Niños');
  });
});

describe('filterCommunitySongs', () => {
  const songs = [
    base({ id: '1', title: 'Oceans', artist: 'Hillsong', originalKey: 'D', genre: 'adoracion' }),
    base({ id: '2', title: 'Alabaré', artist: 'Marcos Witt', originalKey: 'G', genre: 'alabanza' }),
    base({ id: '3', title: 'Himno', artist: 'Tradicional', originalKey: 'C', genre: 'himno' }),
  ];

  it('filters by genre', () => {
    expect(filterCommunitySongs(songs, { genre: 'alabanza' }).map((s) => s.id)).toEqual(['2']);
  });

  it('filters by key and artist', () => {
    expect(
      filterCommunitySongs(songs, { key: 'D', artist: 'Hillsong' }).map((s) => s.id)
    ).toEqual(['1']);
  });

  it('searches title', () => {
    expect(filterCommunitySongs(songs, { search: 'ocean' }).map((s) => s.id)).toEqual(['1']);
  });
});
