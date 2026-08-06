import { describe, expect, it } from 'vitest';
import {
  buildSessionOrigin,
  inferSessionOriginFromRecovery,
  isPageInSessionScope,
} from '@/features/director-session/utils/sessionOrigin';

describe('sessionOrigin', () => {
  it('buildSessionOrigin prefers setlist when list context exists', () => {
    expect(
      buildSessionOrigin({
        listId: 'l1',
        listSongIds: ['a', 'b'],
        songId: 'a',
        listName: 'Domingo',
      })
    ).toEqual({
      type: 'setlist',
      listId: 'l1',
      listName: 'Domingo',
      songId: 'a',
    });
  });

  it('isPageInSessionScope for setlist allows songs in list', () => {
    const origin = { type: 'setlist' as const, listId: 'l1', listName: 'Domingo' };
    expect(
      isPageInSessionScope(origin, {
        songId: 'b',
        listSongIds: ['a', 'b'],
      })
    ).toBe(true);
    expect(
      isPageInSessionScope(origin, {
        songId: 'z',
        listSongIds: ['a', 'b'],
      })
    ).toBe(false);
  });

  it('isPageInSessionScope for song requires same songId', () => {
    const origin = { type: 'song' as const, songId: 'a' };
    expect(isPageInSessionScope(origin, { songId: 'a' })).toBe(true);
    expect(isPageInSessionScope(origin, { songId: 'b' })).toBe(false);
  });

  it('inferSessionOriginFromRecovery falls back to list/song fields', () => {
    expect(
      inferSessionOriginFromRecovery({
        sessionOrigin: null,
        listId: 'l1',
        listSongIds: ['a'],
        songId: 'a',
      })
    ).toEqual({ type: 'setlist', listId: 'l1', songId: 'a' });
  });
});
