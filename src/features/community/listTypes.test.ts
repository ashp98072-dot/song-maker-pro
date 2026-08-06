import { describe, expect, it } from 'vitest';
import { buildListSlug, parseListSongsJson, snapshotToSong, songToSnapshot } from '@/features/community/listTypes';
import type { Song } from '@/types/music';

describe('community cadenas', () => {
  it('builds stable slug', () => {
    expect(buildListSlug('Domingo AM', 'abcdef')).toMatch(/^domingo-am-/);
  });

  it('roundtrips song snapshot', () => {
    const song: Song = {
      id: '1',
      title: 'Oceans',
      artist: 'Hillsong',
      originalKey: 'D',
      originalGender: 'female',
      scaleMode: 'major',
      lyrics: '',
      chords: 'D A Bm G',
      genre: 'adoracion',
    };
    const snap = songToSnapshot(song, 2);
    expect(snap.semitones).toBe(2);
    expect(snapshotToSong(snap).title).toBe('Oceans');
  });

  it('parses songs json', () => {
    const parsed = parseListSongsJson([
      { song_id: '1', title: 'A', artist: 'B', original_key: 'C', chords: 'C' },
      { title: 'missing id' },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].song_id).toBe('1');
  });
});
