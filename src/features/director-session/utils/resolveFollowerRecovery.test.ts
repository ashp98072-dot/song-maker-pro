import { describe, expect, it } from 'vitest';
import type { SharedSessionState } from '@/features/director-session/types';
import {
  isStaleHistoricalReplay,
  pickFresherRecovery,
  resolveFollowerRecovery,
  shouldSkipReconnectReplay,
} from '@/features/director-session/utils/resolveFollowerRecovery';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';

function recovery(overrides: Partial<SessionRecoveryState>): SessionRecoveryState {
  return {
    code: 'ABCD',
    directorId: 'd1',
    songId: 'song-a',
    listId: 'list-1',
    listSongIds: ['song-a', 'song-b', 'song-c', 'song-d', 'song-e'],
    semitones: 0,
    bpm: null,
    currentKey: 'C',
    viewMode: 'continuous',
    genderShift: 'original',
    currentIndex: 0,
    sharedSectionAnchor: null,
    followDirector: true,
    isActive: true,
    sessionOrigin: null,
    ...overrides,
  };
}

function remote(overrides: Partial<SharedSessionState>): SharedSessionState {
  return {
    sessionId: 'ABCD',
    currentSongId: 'song-e',
    currentIndex: 4,
    listId: 'list-1',
    listSongIds: ['song-a', 'song-b', 'song-c', 'song-d', 'song-e'],
    viewMode: 'continuous',
    updatedAt: '2026-05-18T12:00:00.000Z',
    ...overrides,
  };
}

describe('resolveFollowerRecovery', () => {
  it('prefers shared-session when remote index is newer than DB', () => {
    const dbRecovery = recovery({ currentIndex: 1, songId: 'song-b' });
    const result = resolveFollowerRecovery({
      code: 'ABCD',
      remote: remote({ currentIndex: 4, currentSongId: 'song-e' }),
      dbRecovery,
    });
    expect(result.source).toBe('shared-session');
    expect(result.recovery?.currentIndex).toBe(4);
    expect(result.recovery?.songId).toBe('song-e');
  });

  it('uses DB when no remote state', () => {
    const dbRecovery = recovery({ currentIndex: 3, songId: 'song-d' });
    const result = resolveFollowerRecovery({
      code: 'ABCD',
      remote: null,
      dbRecovery,
    });
    expect(result.source).toBe('db');
    expect(result.recovery?.currentIndex).toBe(3);
  });

  it('returns fallback when neither source has data', () => {
    const result = resolveFollowerRecovery({
      code: 'ABCD',
      remote: null,
      dbRecovery: null,
    });
    expect(result.source).toBe('fallback');
    expect(result.recovery).toBeNull();
  });
});

describe('isStaleHistoricalReplay', () => {
  it('flags DB recovery behind live remote index', () => {
    const candidate = recovery({ currentIndex: 2, songId: 'song-c' });
    expect(isStaleHistoricalReplay(candidate, remote({ currentIndex: 4 }))).toBe(true);
  });

  it('allows matching remote index', () => {
    const candidate = recovery({ currentIndex: 4, songId: 'song-e' });
    expect(isStaleHistoricalReplay(candidate, remote({ currentIndex: 4 }))).toBe(false);
  });
});

describe('pickFresherRecovery', () => {
  it('picks higher index regardless of source label', () => {
    const older = recovery({ currentIndex: 1 });
    const newer = recovery({ currentIndex: 5, songId: 'song-e' });
    const picked = pickFresherRecovery(older, newer, 'db', 'shared-session');
    expect(picked.recovery.currentIndex).toBe(5);
    expect(picked.source).toBe('shared-session');
  });
});

describe('shouldSkipReconnectReplay', () => {
  it('skips when sequence already handled', () => {
    expect(shouldSkipReconnectReplay(2, 2)).toBe(true);
    expect(shouldSkipReconnectReplay(2, 1)).toBe(false);
  });
});
