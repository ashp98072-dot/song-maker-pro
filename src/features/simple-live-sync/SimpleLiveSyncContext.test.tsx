import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleLiveSyncProvider } from './SimpleLiveSyncContext';
import { useSimpleLiveSync } from './useSimpleLiveSync';
import { SIMPLE_LIVE_END_EVENT, SIMPLE_LIVE_REQUEST_EVENT, SIMPLE_LIVE_STATE_EVENT } from './types';

type EventHandler = (data: { payload?: unknown; key?: string }) => void;
type StatusHandler = (status: string, error?: Error) => void | Promise<void>;

const mocks = vi.hoisted(() => {
  const channels: Array<{
    handlers: Map<string, EventHandler>;
    status: StatusHandler;
    send: ReturnType<typeof vi.fn>;
    track: ReturnType<typeof vi.fn>;
  }> = [];
  return {
    channels,
    autoSubscribe: true,
    removeChannel: vi.fn(async () => undefined),
    create: vi.fn(async () => ({ ok: true })),
    active: vi.fn(async () => ({ active: true, reason: 'ok' })),
    auth: vi.fn(async () => ({ ok: true, userId: 'user-1' })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    deactivate: vi.fn(async () => undefined),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    realtime: { setAuth: vi.fn() },
    removeChannel: mocks.removeChannel,
    channel: vi.fn(() => {
      const channel = {
        handlers: new Map<string, EventHandler>(),
        status: (() => undefined) as StatusHandler,
        send: vi.fn(async () => 'ok'),
        track: vi.fn(async () => 'ok'),
        presenceState: () => ({ director: [{}] }),
        on(type: string, filter: { event: string }, callback: EventHandler) {
          this.handlers.set(`${type}:${filter.event}`, callback);
          return this;
        },
        subscribe(callback: StatusHandler) {
          this.status = callback;
          if (mocks.autoSubscribe) void callback('SUBSCRIBED');
          return this;
        },
      };
      mocks.channels.push(channel);
      return channel;
    }),
  },
}));
vi.mock('@/features/director-session/utils/persistDirectorLiveSession', () => ({
  createDirectorLiveSessionRpc: mocks.create,
  resolveAuthenticatedDirector: mocks.auth,
}));
vi.mock('@/features/director-session/utils/liveSessionActive', () => ({ deactivateLiveSessionRow: mocks.deactivate }));
vi.mock('@/features/director-session/utils/ghostSessionCleanup', () => ({
  deactivateAllMyPreviousSessions: vi.fn(async () => undefined),
  protectDirectorLiveSessionCode: vi.fn(),
}));
vi.mock('@/features/director-session/utils/checkSessionActive', () => ({
  querySessionActive: mocks.active,
  sessionJoinBlockedMessage: () => 'inactive',
}));
vi.mock('@/features/director-session/utils/sessionStateCleanup', () => ({ clearAllLiveSessionLocalState: vi.fn() }));
vi.mock('@/features/director-session/utils/pendingJoinStorage', () => ({ clearPendingJoin: vi.fn() }));

describe('Simple Live channel lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.channels.length = 0;
    mocks.autoSubscribe = true;
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('publishes list changes even when length and first song stay the same', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.createAsDirector({ songId: 'a', listSongIds: ['a', 'b', 'c'] }); });
    const channel = mocks.channels[0];
    channel.send.mockClear();
    act(() => result.current.publish({ listSongIds: ['a', 'c', 'b'] }));
    expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({
      event: SIMPLE_LIVE_STATE_EVENT,
      payload: expect.objectContaining({ listSongIds: ['a', 'c', 'b'] }),
    }));
    act(() => result.current.publish({ listSongIds: ['a', 'c', 'b'] }));
    expect(channel.send).toHaveBeenCalledTimes(1);
  });

  it('keeps the channel during rerenders and removes it on unmount', async () => {
    const { result, rerender, unmount } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.joinAsFollower('ABCD'); });
    const channel = mocks.channels[0];
    rerender();
    expect(mocks.channels).toHaveLength(1);
    expect(mocks.removeChannel).not.toHaveBeenCalled();
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
    const calls = channel.track.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(channel.track).toHaveBeenCalledTimes(calls);
  });

  it('ignores old channel callbacks after switching sessions', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.joinAsFollower('ABCD'); });
    const previous = mocks.channels[0];
    await act(async () => { await result.current.joinAsFollower('EFGH'); });
    await act(async () => {
      await previous.status('CHANNEL_ERROR', new Error('old error'));
      previous.handlers.get(`broadcast:${SIMPLE_LIVE_STATE_EVENT}`)?.({ payload: { sessionCode: 'ABCD', songId: 'old-song' } });
      previous.handlers.get(`broadcast:${SIMPLE_LIVE_END_EVENT}`)?.({});
    });
    expect(result.current.code).toBe('EFGH');
    expect(result.current.status).toBe('connected');
    expect(result.current.lastState).toBeNull();
  });

  it('does not restart heartbeat when a closed channel reports subscribed after leave', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.joinAsFollower('ABCD'); });
    const channel = mocks.channels[0];
    await act(async () => { await result.current.leave(); });
    channel.track.mockClear();
    await act(async () => { await channel.status('SUBSCRIBED'); await vi.advanceTimersByTimeAsync(45_000); });
    expect(result.current.status).toBe('idle');
    expect(channel.track).not.toHaveBeenCalled();
  });

  it('cancels delayed presence publication when leaving', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.createAsDirector({ songId: 'a' }); });
    const channel = mocks.channels[0];
    act(() => channel.handlers.get('presence:join')?.({ key: 'follower' }));
    await act(async () => { await result.current.leave(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(result.current.lastState).toBeNull();
  });

  it('requests the current state again after reconnecting on the same channel', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.joinAsFollower('ABCD'); });
    const channel = mocks.channels[0];
    channel.send.mockClear();
    await act(async () => { await channel.status('CHANNEL_ERROR'); await channel.status('SUBSCRIBED'); });
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();
    expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({ event: SIMPLE_LIVE_REQUEST_EVENT }));
  });

  it('removes a channel that never confirms subscription', async () => {
    mocks.autoSubscribe = false;
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    let joined = true;
    await act(async () => {
      const pending = result.current.joinAsFollower('ABCD');
      await vi.advanceTimersByTimeAsync(12_000);
      joined = await pending;
    });
    expect(joined).toBe(false);
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channels[0]);
    await act(async () => { await mocks.channels[0].status('SUBSCRIBED'); });
    expect(result.current.status).toBe('idle');
    expect(mocks.channels[0].track).not.toHaveBeenCalled();
  });

  it('does not restart heartbeat if tracking completes after leave', async () => {
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    await act(async () => { await result.current.joinAsFollower('ABCD'); });
    const channel = mocks.channels[0];
    let finishTrack!: (value: string) => void;
    channel.track.mockImplementationOnce(() => new Promise<string>((resolve) => { finishTrack = resolve; }));
    await act(async () => {
      const pending = channel.status('SUBSCRIBED');
      await result.current.leave();
      finishTrack('ok');
      await pending;
    });
    expect(result.current.status).toBe('idle');
    channel.track.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
    expect(channel.track).not.toHaveBeenCalled();
  });

  it('does not create a channel if authentication completes after unmount', async () => {
    let finishAuth!: (value: { data: { session: null } }) => void;
    mocks.getSession.mockImplementationOnce(() => new Promise((resolve) => { finishAuth = resolve; }));
    const { result, unmount } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.joinAsFollower('ABCD');
      await vi.advanceTimersByTimeAsync(0);
    });
    unmount();
    await act(async () => { finishAuth({ data: { session: null } }); await pending; });
    expect(mocks.channels).toHaveLength(0);
  });

  it('cancels a pending subscription without resetting the replacement session', async () => {
    mocks.autoSubscribe = false;
    const { result } = renderHook(useSimpleLiveSync, { wrapper: SimpleLiveSyncProvider });
    let previousJoin!: Promise<boolean>;
    await act(async () => {
      previousJoin = result.current.joinAsFollower('ABCD');
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.channels).toHaveLength(1);
    mocks.autoSubscribe = true;
    await act(async () => {
      expect(await result.current.joinAsFollower('EFGH')).toBe(true);
      expect(await previousJoin).toBe(false);
    });
    expect(result.current.role).toBe('follower');
    expect(result.current.code).toBe('EFGH');
    expect(result.current.status).toBe('connected');
  });
});
