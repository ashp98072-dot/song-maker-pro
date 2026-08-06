import { describe, expect, it, beforeEach } from 'vitest';
import {
  LIVE_SESSION_PERSISTENCE_KEY,
  clearLiveSessionPersistence,
  readLiveSessionPersistence,
  writeLiveSessionPersistence,
} from '@/features/director-session/utils/liveSessionPersistence';
import { LIVE_SESSION_STORAGE_KEY } from '@/features/director-session/utils/sessionRecovery';

describe('liveSessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('writes and reads modern persistence state', () => {
    writeLiveSessionPersistence({
      role: 'follower',
      sessionCode: 'abcd',
      connected: true,
      followDirector: false,
      passiveMode: true,
      joinedAt: 1,
    });

    const state = readLiveSessionPersistence();
    expect(state?.sessionCode).toBe('ABCD');
    expect(state?.role).toBe('follower');
    expect(state?.passiveMode).toBe(true);
    expect(state?.followDirector).toBe(false);
  });

  it('migrates legacy worship-live-session storage', () => {
    localStorage.setItem(
      LIVE_SESSION_STORAGE_KEY,
      JSON.stringify({ code: 'wxyz', role: 'director' })
    );

    const state = readLiveSessionPersistence();
    expect(state?.sessionCode).toBe('WXYZ');
    expect(state?.role).toBe('director');
    expect(localStorage.getItem(LIVE_SESSION_PERSISTENCE_KEY)).toBeTruthy();
  });

  it('clears modern and legacy keys', () => {
    writeLiveSessionPersistence({
      role: 'director',
      sessionCode: 'test',
      connected: true,
      followDirector: true,
      passiveMode: false,
      joinedAt: Date.now(),
    });
    localStorage.setItem(LIVE_SESSION_STORAGE_KEY, JSON.stringify({ code: 'test', role: 'director' }));

    clearLiveSessionPersistence();

    expect(readLiveSessionPersistence()).toBeNull();
    expect(localStorage.getItem(LIVE_SESSION_STORAGE_KEY)).toBeNull();
  });
});
