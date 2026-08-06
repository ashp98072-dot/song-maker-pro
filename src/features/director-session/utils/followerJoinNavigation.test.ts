import { describe, expect, it } from 'vitest';
import {
  describeJoinNavigationTarget,
  shouldNavigateToContinuousLive,
} from '@/features/director-session/utils/followerJoinNavigation';
import { resolveFollowerNavigationTarget } from '@/features/director-session/utils/followerViewMode';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';

function baseRecovery(overrides: Partial<SessionRecoveryState>): SessionRecoveryState {
  return {
    code: 'ABC123',
    directorId: 'dir-1',
    songId: 'song-1',
    listSongIds: ['song-1'],
    listId: 'list-1',
    semitones: 0,
    bpm: null,
    currentKey: 'C',
    viewMode: 'musician',
    genderShift: 'original',
    currentIndex: 0,
    sharedSectionAnchor: null,
    followDirector: true,
    isActive: true,
    sessionOrigin: null,
    ...overrides,
  };
}

describe('followerJoinNavigation', () => {
  it('navigates to continuous live when viewMode is continuous and listId exists', () => {
    const recovery = baseRecovery({ viewMode: 'continuous', listId: 'list-1' });
    expect(shouldNavigateToContinuousLive(recovery)).toBe(true);
    expect(describeJoinNavigationTarget(recovery).type).toBe('continuous-live');
  });

  it('navigates to song when songId exists and not continuous', () => {
    const recovery = baseRecovery({ viewMode: 'musician' });
    expect(describeJoinNavigationTarget(recovery).type).toBe('song');
  });

  it('follower on song view stays on song when director is continuous', () => {
    const recovery = baseRecovery({ viewMode: 'continuous', listId: 'list-1' });
    const target = resolveFollowerNavigationTarget(recovery, '/cancion/song-1');
    expect(target.type).toBe('song');
  });

  it('follower already on live keeps continuous target', () => {
    const recovery = baseRecovery({ viewMode: 'continuous', listId: 'list-1' });
    const target = resolveFollowerNavigationTarget(recovery, '/setlist/list-1/live');
    expect(target.type).toBe('continuous-live');
  });
});
