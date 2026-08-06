import { describe, expect, it } from 'vitest';
import { resolveRemoteListSongIds } from '@/features/continuous-setlist/utils/resolveRemoteListSongIds';
import type { SongList } from '@/types/music';

const lists: SongList[] = [
  { id: 'list-1', name: 'Domingo', songIds: ['a', 'b'], createdAt: '2024-01-01' },
];

describe('resolveRemoteListSongIds', () => {
  it('prefers broadcast listSongIds', () => {
    expect(
      resolveRemoteListSongIds({ listId: 'list-1', listSongIds: ['x', 'y'] }, lists)
    ).toEqual(['x', 'y']);
  });

  it('falls back to follower app list when broadcast ids missing', () => {
    expect(resolveRemoteListSongIds({ listId: 'list-1' }, lists)).toEqual(['a', 'b']);
  });
});
