import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURES } from '@/config/features';
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), location: { pathname: '/' } }));
vi.mock('react-router-dom', () => ({ useLocation: () => mocks.location, useNavigate: () => mocks.navigate }));
vi.mock('./isFollowV3Active', () => ({ isFollowV3SpectatorActive: (enabled: boolean) => enabled }));
vi.mock('./followV3Store', () => ({ useFollowV3Song: () => null }));
import { useFollowV3RouteMount } from './useFollowV3RouteMount';

const originalFlag = FEATURES.USE_FOLLOW_V3;
describe('Follow V3 route retry lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); mocks.navigate.mockReset(); });
  afterEach(() => { FEATURES.USE_FOLLOW_V3 = originalFlag; vi.useRealTimers(); });
  it('does not schedule retries while the legacy feature is disabled', () => {
    FEATURES.USE_FOLLOW_V3 = false;
    const retry = vi.fn();
    const { unmount } = renderHook(() => useFollowV3RouteMount({ liveIsFollower:true, retryRemoteNavigation:retry }));
    act(() => vi.advanceTimersByTime(3000));
    expect(retry).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    unmount();
  });
  it('keeps the retry deadline across equivalent option objects and cancels on unmount', () => {
    FEATURES.USE_FOLLOW_V3 = true;
    const retry = vi.fn();
    const options = { liveIsFollower:true, retryRemoteNavigation:retry };
    const { rerender, unmount } = renderHook(opts => useFollowV3RouteMount(opts), {initialProps:options});
    act(() => vi.advanceTimersByTime(600));
    rerender({...options});
    act(() => vi.advanceTimersByTime(600));
    expect(retry).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(3000));
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('cancels pending retries when follower mode ends', () => {
    FEATURES.USE_FOLLOW_V3 = true;
    const retry = vi.fn();
    const { rerender, unmount } = renderHook(enabled => useFollowV3RouteMount({liveIsFollower:enabled,retryRemoteNavigation:retry}), {initialProps:true});
    act(() => vi.advanceTimersByTime(600));
    rerender(false);
    act(() => vi.advanceTimersByTime(3000));
    expect(retry).not.toHaveBeenCalled();
    unmount();
  });
});
