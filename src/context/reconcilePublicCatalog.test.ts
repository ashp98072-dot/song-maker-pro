import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/music';
import { reconcilePublicCatalog } from './reconcilePublicCatalog';

const song = (id: string, chords = 'C'): Song => ({ id, title: 'Mismo título', artist: 'Artista', chords,
  lyrics: '', originalKey: 'C', originalGender: 'male', scaleMode: 'major' });

describe('reconcilePublicCatalog', () => {
  it('updates existing records by ID without duplicating them or changing list references', () => {
    const result = reconcilePublicCatalog([song('a')], [{ ...song('a', 'G'), originalKey: 'G', bpm: undefined }], new Set());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'a', chords: 'G', originalKey: 'G' });
  });
  it('preserves personal copies and pending local edits while adding other arrangements', () => {
    const personal = song('a', 'Dm');
    const result = reconcilePublicCatalog([personal], [song('a'), song('b')], new Set(['a']));
    expect(result).toEqual([personal, song('b')]);
    expect(result[0]).toBe(personal);
  });
  it('retains offline records when a snapshot is empty and does not mutate inputs', () => {
    const current = [song('a')];
    expect(reconcilePublicCatalog(current, [], new Set())).toEqual(current);
    reconcilePublicCatalog(current, [song('a', 'F')], new Set());
    expect(current[0].chords).toBe('C');
  });
});
