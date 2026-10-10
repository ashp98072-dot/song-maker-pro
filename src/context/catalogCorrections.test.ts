import { expect, it } from 'vitest';
import { applyCatalogCorrections } from './catalogCorrections';
import type { Song } from '@/types/music';
const song: Song = { id: 'catalog-1', title: 'Song', artist: 'Artist', chords: 'old', lyrics: '', originalKey: 'C', key: 'D', scaleMode: 'major', originalGender: 'male' };
it('replaces stale chords by stable ID while preserving keys and independent copies', () => {
  const copy = { ...song, id: 'personal-copy' };
  const result = applyCatalogCorrections([song, copy], [{ song_id: song.id, chords: 'corrected' }]);
  expect(result[0]).toEqual({ ...song, chords: 'corrected' });
  expect(result[1]).toBe(copy);
  expect(song.chords).toBe('old');
});
