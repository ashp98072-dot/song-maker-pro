import { describe, expect, it } from 'vitest';
import { resolveSetlistSongIds } from '@/features/continuous-setlist/utils/resolveSetlistSongIds';
import type { SongList } from '@/types/music';

const appList: SongList = {
  id: 'list-1',
  name: 'Domingo',
  songIds: ['a', 'b', 'c'],
  createdAt: '2024-01-01',
};

describe('resolveSetlistSongIds', () => {
  it('prefers route state over app context and shared', () => {
    const result = resolveSetlistSongIds({
      listId: 'list-1',
      routeSongIds: ['r1', 'r2'],
      appList,
      sharedSongIds: ['s1'],
    });
    expect(result.source).toBe('route');
    expect(result.songIds).toEqual(['r1', 'r2']);
  });

  it('falls back to app context when route is empty', () => {
    const result = resolveSetlistSongIds({
      listId: 'list-1',
      routeSongIds: [],
      appList,
      sharedSongIds: ['s1', 's2'],
    });
    expect(result.source).toBe('appContext');
    expect(result.songIds).toEqual(['a', 'b', 'c']);
  });

  it('falls back to shared payload when route and app list are empty', () => {
    const result = resolveSetlistSongIds({
      listId: 'list-1',
      routeSongIds: undefined,
      appList: { ...appList, songIds: [] },
      sharedSongIds: ['x', 'y'],
    });
    expect(result.source).toBe('shared');
    expect(result.songIds).toEqual(['x', 'y']);
  });

  it('falls back to live_sessions ids when other sources are empty', () => {
    const result = resolveSetlistSongIds({
      listId: 'list-1',
      liveSessionSongIds: ['ls-1', 'ls-2'],
    });
    expect(result.source).toBe('liveSession');
    expect(result.songIds).toEqual(['ls-1', 'ls-2']);
  });
});
