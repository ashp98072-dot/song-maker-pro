import { act, renderHook } from '@testing-library/react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDirectorPublisherActive } from './liveSessionAuthority';
import { useLiveSessionBroadcast } from './useLiveSessionBroadcast';

describe('broadcast timer lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDirectorPublisherActive(true);
  });
  afterEach(() => {
    setDirectorPublisherActive(false);
    vi.useRealTimers();
  });

  function setup() {
    const send = vi.fn().mockResolvedValue('ok');
    const channelRef = { current: { state: 'joined', send } as unknown as RealtimeChannel };
    const hook = renderHook(() => useLiveSessionBroadcast(channelRef));
    act(() => {
      hook.result.current.updateBroadcastState({ songId: 'song-1', semitones: 0, currentKey: 'C' });
      hook.result.current.scheduleBroadcast();
    });
    return { ...hook, send };
  }

  it('cancels pending publication when the hook unmounts', () => {
    const { unmount, send } = setup();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(100));
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps a pending publication across renders and sends the latest state', () => {
    const { result, rerender, unmount, send } = setup();
    const originalRef = result.current.broadcastStateRef;
    act(() => vi.advanceTimersByTime(50));
    rerender();
    expect(result.current.broadcastStateRef).toBe(originalRef);
    act(() => {
      result.current.updateBroadcastState({ songId: 'song-2', semitones: 2, currentKey: 'D' });
      vi.advanceTimersByTime(50);
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ songId: 'song-2', semitones: 2, key: 'D' }),
    }));
    unmount();
  });
});
