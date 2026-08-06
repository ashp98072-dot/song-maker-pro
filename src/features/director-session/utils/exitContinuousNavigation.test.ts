import { describe, expect, it } from 'vitest';
import {
  buildExitContinuousNavState,
  resolveExitContinuousSongId,
} from '@/features/director-session/utils/exitContinuousNavigation';

describe('exitContinuousNavigation', () => {
  it('resolveExitContinuousSongId prefers visible song then index', () => {
    const ids = ['a', 'b', 'c'];
    expect(resolveExitContinuousSongId('x', null, ids, 1)).toBe('x');
    expect(resolveExitContinuousSongId(null, 'b', ids, 0)).toBe('b');
    expect(resolveExitContinuousSongId(null, null, ids, 2)).toBe('c');
    expect(resolveExitContinuousSongId(null, null, ids, -1)).toBe('a');
  });

  it('buildExitContinuousNavState marks fromContinuous and list context', () => {
    expect(
      buildExitContinuousNavState({
        listId: 'list-1',
        listSongIds: ['s1', 's2'],
        targetSongId: 's2',
        joinSessionCode: 'ABC',
      })
    ).toEqual({
      listId: 'list-1',
      listSongIds: ['s1', 's2'],
      currentIndex: 1,
      joinSessionCode: 'ABC',
      fromContinuous: true,
    });
  });
});
