import { describe, it, expect } from 'vitest';
import {
  planWorshipServiceMode,
  resolveWorshipServiceModeInput,
} from '@/features/mobile-worship/utils/worshipServiceMode';

describe('planWorshipServiceMode', () => {
  it('blocks followers', () => {
    const plan = planWorshipServiceMode('follower');
    expect(plan.kind).toBe('blocked');
  });

  it('creates when idle and hides when already director', () => {
    expect(planWorshipServiceMode('idle')).toEqual({ kind: 'start', needsCreate: true });
    expect(planWorshipServiceMode(null)).toEqual({ kind: 'start', needsCreate: true });
    expect(planWorshipServiceMode('director')).toEqual({ kind: 'start', needsCreate: false });
  });
});

describe('resolveWorshipServiceModeInput', () => {
  it('forces continuous when list has multiple songs', () => {
    const resolved = resolveWorshipServiceModeInput({
      songId: 'b',
      viewMode: 'musician',
      listId: 'list-1',
      listSongIds: ['a', 'b', 'c'],
      currentIndex: 1,
    });
    expect(resolved.viewMode).toBe('continuous');
    expect(resolved.listSongIds).toEqual(['a', 'b', 'c']);
    expect(resolved.currentIndex).toBe(1);
  });

  it('keeps single-song viewMode when no chain', () => {
    const resolved = resolveWorshipServiceModeInput({
      songId: 'a',
      viewMode: 'singer',
      listId: 'list-1',
      listSongIds: ['a'],
    });
    expect(resolved.viewMode).toBe('singer');
  });
});
