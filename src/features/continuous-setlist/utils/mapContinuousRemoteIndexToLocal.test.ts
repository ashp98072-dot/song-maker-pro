import { describe, expect, it } from 'vitest';
import { mapContinuousRemoteIndexToLocal } from '@/features/continuous-setlist/utils/mapContinuousRemoteIndexToLocal';

describe('mapContinuousRemoteIndexToLocal', () => {
  it('maps by song id when middle songs are missing locally', () => {
    const local = mapContinuousRemoteIndexToLocal({
      remoteIndex: 4,
      remoteListIds: ['a', 'b', 'c', 'd', 'e'],
      localSongIds: ['a', 'c', 'e'],
      remoteSongId: 'e',
    });
    expect(local).toBe(2);
  });

  it('uses remote list id at index when songId omitted', () => {
    const local = mapContinuousRemoteIndexToLocal({
      remoteIndex: 2,
      remoteListIds: ['a', 'b', 'c'],
      localSongIds: ['a', 'b', 'c'],
    });
    expect(local).toBe(2);
  });

  it('clamps when song is not local yet', () => {
    const local = mapContinuousRemoteIndexToLocal({
      remoteIndex: 9,
      remoteListIds: ['a', 'b'],
      localSongIds: ['a'],
      remoteSongId: 'missing',
    });
    expect(local).toBe(0);
  });
});
