import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiveSessionPageHandlers } from '../live/liveSessionTypes';
import { useSessionPageHandlers } from './useSessionPageHandlers';

describe('page handler registration', () => {
  it('uses updated callbacks without unregistering or replaying registration', () => {
    const cleanup = vi.fn();
    const register = vi.fn((_handlers: LiveSessionPageHandlers) => cleanup);
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(
      (callback) => useSessionPageHandlers(true, register, { onDirectorSessionEstablished: callback }),
      { initialProps: first },
    );
    register.mock.calls[0][0].onDirectorSessionEstablished?.('ABCD');
    expect(first).toHaveBeenCalledWith('ABCD');
    rerender(second);
    register.mock.calls[0][0].onDirectorSessionEstablished?.('EFGH');
    expect(second).toHaveBeenCalledWith('EFGH');
    expect(first).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('registers only while enabled and cleans up when disabled', () => {
    const cleanup = vi.fn();
    const register = vi.fn((_handlers: LiveSessionPageHandlers) => cleanup);
    const { rerender } = renderHook(
      (enabled) => useSessionPageHandlers(enabled, register, {}), { initialProps: false },
    );
    expect(register).not.toHaveBeenCalled();
    rerender(true);
    expect(register).toHaveBeenCalledTimes(1);
    rerender(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('updates registration when session-end notification preference changes', () => {
    const cleanup = vi.fn();
    const register = vi.fn((_handlers: LiveSessionPageHandlers) => cleanup);
    const { rerender } = renderHook(
      (notifyOnSessionEnd) => useSessionPageHandlers(true, register, { notifyOnSessionEnd }),
      { initialProps: true },
    );
    rerender(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[1][0].notifyOnSessionEnd).toBe(false);
  });
});
