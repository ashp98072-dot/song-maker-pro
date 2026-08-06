import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { readStoredLiveSession, writeStoredLiveSession } from '@/features/director-session/utils/sessionRecovery';
import { readFollowDirector, writeFollowDirector } from '@/features/director-session/utils/followDirector';
import { readPendingJoin, writePendingJoin } from '@/features/director-session/utils/pendingJoinStorage';

describe('clearAllLiveSessionLocalState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes stored session but keeps follow-director preference', () => {
    writeStoredLiveSession('ABC123', 'director');
    writeFollowDirector(false);
    writePendingJoin('ABC123');

    clearAllLiveSessionLocalState('ABC123');

    expect(readStoredLiveSession()).toBeNull();
    expect(readPendingJoin()).toBeNull();
    expect(readFollowDirector()).toBe(false);
  });
});
