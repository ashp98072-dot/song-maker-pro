import { describe, expect, it } from 'vitest';
import {
  evaluateRealtimeReconnectRequest,
  RECONNECT_COOLDOWN_MS,
} from '@/features/director-session/utils/realtimeReconnectGuard';

describe('evaluateRealtimeReconnectRequest', () => {
  it('allows transport errors when cooldown elapsed', () => {
    expect(evaluateRealtimeReconnectRequest('CHANNEL_ERROR', null).allowed).toBe(true);
    expect(evaluateRealtimeReconnectRequest('TIMED_OUT', null).allowed).toBe(true);
    expect(evaluateRealtimeReconnectRequest('OFFLINE', null).allowed).toBe(true);
  });

  it('blocks SUBSCRIBED and navigation-like reasons', () => {
    expect(evaluateRealtimeReconnectRequest('SUBSCRIBED', null).allowed).toBe(false);
    expect(evaluateRealtimeReconnectRequest('SOCKET_DISCONNECTED', null).allowed).toBe(false);
    expect(evaluateRealtimeReconnectRequest('realtime-subscribed-remote', null).allowed).toBe(false);
  });

  it('blocks within cooldown window', () => {
    const now = 10_000;
    const last = now - 1000;
    const result = evaluateRealtimeReconnectRequest('CHANNEL_ERROR', last, now);
    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toBe('cooldown');
    expect(now - last).toBeLessThan(RECONNECT_COOLDOWN_MS);
  });
});
