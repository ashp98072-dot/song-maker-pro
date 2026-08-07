import { describe, expect, it } from 'vitest';
import {
  findLibraryDuplicate,
  importSongId,
  normalizeImportedSong,
} from '@/features/song-import/utils/normalizeImportedSong';
import type { Song } from '@/types/music';

const base: Song = {
  id: '1',
  title: 'Amazing Grace',
  artist: 'Tradicional',
  originalKey: 'G',
  originalGender: 'male',
  scaleMode: 'major',
  lyrics: '',
  chords: '[G]Amazing',
};

describe('normalizeImportedSong', () => {
  it('returns null without title or chords', () => {
    expect(normalizeImportedSong({ title: '', chords: 'x' })).toBeNull();
    expect(normalizeImportedSong({ title: 'A', chords: '' })).toBeNull();
  });

  it('builds a full song with import id', () => {
    const song = normalizeImportedSong({
      title: '  Santo  ',
      artist: 'Hillsong',
      chords: '[C]Santo',
      originalKey: 'C',
    });
    expect(song).toMatchObject({
      title: 'Santo',
      artist: 'Hillsong',
      chords: '[C]Santo',
      originalKey: 'C',
    });
    expect(song?.id).toMatch(/^imp-/);
  });
});

describe('importSongId / duplicates', () => {
  it('is stable for same title and artist', () => {
    expect(importSongId('Santo Espíritu', 'Hillsong')).toBe(
      importSongId('Santo Espíritu', 'Hillsong')
    );
  });

  it('finds library duplicates ignoring case/accents', () => {
    expect(findLibraryDuplicate([base], 'amazing grace', 'tradicional')?.id).toBe('1');
    expect(findLibraryDuplicate([base], 'Otra', 'Tradicional')).toBeUndefined();
  });
});
