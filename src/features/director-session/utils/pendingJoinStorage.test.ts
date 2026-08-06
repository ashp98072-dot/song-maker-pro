import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  clearPendingJoin,
  readPendingJoin,
  writePendingJoin,
} from '@/features/director-session/utils/pendingJoinStorage';

describe('pendingJoinStorage TTL', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns pending code within TTL', () => {
    writePendingJoin('hxg3xb');
    expect(readPendingJoin()).toBe('HXG3XB');
  });

  it('expires pending join after 2 minutes', () => {
    writePendingJoin('HXG3XB');
    vi.setSystemTime(new Date('2026-08-06T10:03:00Z'));
    expect(readPendingJoin()).toBeNull();
    expect(sessionStorage.getItem('worship-pending-join')).toBeNull();
  });

  it('clearPendingJoin removes storage', () => {
    writePendingJoin('HXG3XB');
    clearPendingJoin();
    expect(readPendingJoin()).toBeNull();
  });
});
