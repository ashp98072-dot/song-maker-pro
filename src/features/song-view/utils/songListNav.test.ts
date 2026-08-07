import { describe, expect, it } from 'vitest';
import {
  buildSongListSearch,
  mergeSongListIntoSearch,
  parseSongListSearch,
} from '@/features/song-view/utils/songListNav';

describe('songListNav', () => {
  it('builds and parses lista/ids', () => {
    const qs = buildSongListSearch({ listId: 'L1', listSongIds: ['a', 'b'] });
    expect(qs).toBe('?lista=L1&ids=a%2Cb');
    expect(parseSongListSearch(qs)).toEqual({ listId: 'L1', listSongIds: ['a', 'b'] });
  });

  it('merges without dropping transpose', () => {
    const next = mergeSongListIntoSearch('?transpose=2', {
      listId: 'L1',
      listSongIds: ['a'],
    });
    expect(next).toContain('transpose=2');
    expect(next).toContain('lista=L1');
    expect(next).toContain('ids=a');
  });
});
