import { useEffect } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SharedSessionState } from '../types';
import { useLiveSessionUpdateHandler } from './useLiveSessionUpdateHandler';

describe('live session update handler', () => {
  it('delivers broadcasts to the latest handler without resubscribing', () => {
    const initial = vi.fn();
    const updated = vi.fn();
    const subscribe = vi.fn();
    const unsubscribe = vi.fn();
    const state: SharedSessionState = {
      sessionId: 'ABCD', currentSongId: 'song-1', customSemitones: 0,
      genderShift: 'original', viewMode: 'singer', updatedAt: '2026-10-06T00:00:00Z',
    };
    const { result, rerender, unmount } = renderHook(handler => {
      const dispatch = useLiveSessionUpdateHandler(handler);
      useEffect(() => {
        subscribe(dispatch);
        return unsubscribe;
      }, [dispatch]);
      return dispatch;
    }, { initialProps: initial });
    const subscribed = result.current;
    act(() => subscribed(state));
    expect(initial).toHaveBeenCalledWith(state);
    rerender(updated);
    act(() => subscribed(state));
    expect(updated).toHaveBeenCalledWith(state);
    expect(initial).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(subscribed);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
