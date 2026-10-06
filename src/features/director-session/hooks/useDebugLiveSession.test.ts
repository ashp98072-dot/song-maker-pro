import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebugLiveSession } from './useDebugLiveSession';
import { installDebugLiveSession, type DebugLiveSessionSnapshot } from '../utils/debugLiveSession';

const debugWindow = window as Window & { debugLiveSession?: () => DebugLiveSessionSnapshot };
const snapshot: DebugLiveSessionSnapshot = {
  pathname: '/', connection: null, liveIsDirector: false, liveSessionCode: '',
  liveIsFollower: false, liveFollowerCode: '', directorChannelJoin: 'idle',
  directorChannelState: null, followerChannelState: null, remote: null,
  liveSessionStatus: 'idle', followDirector: false,
};

afterEach(() => {
  delete debugWindow.debugLiveSession;
  vi.unstubAllEnvs();
});

describe('development session snapshot', () => {
  it('reads the latest committed session without replacing the console function', () => {
    const { rerender, unmount } = renderHook(
      value => useDebugLiveSession(() => value), { initialProps: snapshot },
    );
    const reader = debugWindow.debugLiveSession;
    expect(reader?.()).toEqual(snapshot);
    const connected = { ...snapshot, liveIsDirector: true, liveSessionCode: 'ABCD', liveSessionStatus: 'connected' };
    rerender(connected);
    expect(debugWindow.debugLiveSession).toBe(reader);
    expect(reader?.()).toEqual(connected);
    unmount();
    expect(debugWindow.debugLiveSession).toBeUndefined();
  });

  it('does not remove a newer registration when an older one cleans up', () => {
    const removeOld = installDebugLiveSession(() => snapshot);
    const newer = { ...snapshot, liveFollowerCode: 'EFGH', liveIsFollower: true };
    const removeNew = installDebugLiveSession(() => newer);
    removeOld();
    expect(debugWindow.debugLiveSession?.()).toEqual(newer);
    removeNew();
    expect(debugWindow.debugLiveSession).toBeUndefined();
  });

  it('does not expose session diagnostics in production', () => {
    vi.stubEnv('DEV', false);
    const { unmount } = renderHook(() => useDebugLiveSession(() => snapshot));
    expect(debugWindow.debugLiveSession).toBeUndefined();
    unmount();
  });
});
