import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { readStoredLiveSession, writeStoredLiveSession } from '@/features/director-session/utils/sessionRecovery';
import { readFollowDirector, writeFollowDirector } from '@/features/director-session/utils/followDirector';

describe('clearAllLiveSessionLocalState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes stored session but keeps follow-director preference', () => {
    writeStoredLiveSession('ABC123', 'director');
    writeFollowDirector(false);

    clearAllLiveSessionLocalState('ABC123');

    expect(readStoredLiveSession()).toBeNull();
    expect(readFollowDirector()).toBe(false);
  });
});
