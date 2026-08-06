import { describe, expect, it } from 'vitest';
import {
  isFollowerInContinuousMode,
  isExploringOutsideSessionScope,
  resolveFollowerPreferredView,
  enforceFollowerLiveRetention,
  shouldRetainFollowerViewMode,
} from '@/features/director-session/utils/followerViewMode';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';

function recovery(overrides: Partial<SessionRecoveryState>): SessionRecoveryState {
  return {
    code: 'ABCD',
    directorId: 'd1',
    songId: 'song-3',
    listId: 'list-1',
    listSongIds: ['song-1', 'song-2', 'song-3'],
    semitones: 0,
    bpm: null,
    currentKey: 'C',
    viewMode: 'continuous',
    genderShift: 'original',
    currentIndex: 2,
    sharedSectionAnchor: null,
    followDirector: true,
    isActive: true,
    sessionOrigin: null,
    ...overrides,
  };
}

describe('isFollowerInContinuousMode', () => {
  it('is true on live route', () => {
    expect(isFollowerInContinuousMode('/setlist/list-1/live', 'list-1')).toBe(true);
  });

  it('is false on song view', () => {
    expect(isFollowerInContinuousMode('/cancion/song-2', 'list-1')).toBe(false);
  });
});

describe('shouldRetainFollowerViewMode', () => {
  it('is true when on same list live page', () => {
    expect(shouldRetainFollowerViewMode('/setlist/list-1/live', 'list-1')).toBe(true);
  });
});

describe('enforceFollowerLiveRetention', () => {
  it('blocks SongView navigation while follower is on live', () => {
    const result = enforceFollowerLiveRetention({
      pathname: '/setlist/list-1/live',
      followDirector: true,
      targetPath: '/cancion/song-9',
      source: 'reconnect-recovery',
      listId: 'list-1',
    });
    expect(result.blocked).toBe(true);
    expect(result.retainedLiveMode).toBe(true);
  });
});

describe('resolveFollowerPreferredView', () => {
  it('keeps continuous when already on live', () => {
    const r = recovery({ viewMode: 'continuous' });
    expect(resolveFollowerPreferredView('/setlist/list-1/live', r).type).toBe('continuous-live');
  });

  it('uses song view when director is continuous but follower is not on live', () => {
    const r = recovery({ viewMode: 'continuous' });
    expect(resolveFollowerPreferredView('/cancion/song-2', r).type).toBe('song');
  });

  it('retains live when director is musician but follower stays on live', () => {
    const r = recovery({ viewMode: 'musician', currentIndex: 2 });
    expect(resolveFollowerPreferredView('/setlist/list-1/live', r).type).toBe('continuous-live');
  });
});

describe('isExploringOutsideSessionScope', () => {
  it('detects director away from scope', () => {
    expect(
      isExploringOutsideSessionScope({
        liveIsDirector: true,
        liveIsFollower: false,
        directorAwayFromScope: true,
        passiveListenMode: false,
      })
    ).toBe(true);
  });
});
