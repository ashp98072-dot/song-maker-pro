import { describe, expect, it } from 'vitest';
import { shouldSkipSubscribedRecovery } from '@/features/director-session/utils/subscribedRecoveryGuard';

describe('shouldSkipSubscribedRecovery', () => {
  it('skips duplicate subscribe key', () => {
    const r = shouldSkipSubscribedRecovery({
      sessionCode: 'ABCD',
      reconnectSequence: 2,
      replayHandledForSequence: -1,
      hasPageHandler: true,
      lastRemoteStateAgeMs: 100,
      lastRemoteStateValid: true,
      lastSubscribedKey: 'ABCD|2',
    });
    expect(r.skip).toBe(true);
    expect(r.reason).toBe('duplicate-subscribe');
  });

  it('skips when replay already handled for sequence', () => {
    const r = shouldSkipSubscribedRecovery({
      sessionCode: 'ABCD',
      reconnectSequence: 3,
      replayHandledForSequence: 3,
      hasPageHandler: true,
      lastRemoteStateAgeMs: 500,
      lastRemoteStateValid: true,
      lastSubscribedKey: null,
    });
    expect(r.skip).toBe(true);
    expect(r.reason).toBe('replay-already-handled');
  });

  it('allows cold join without remote state', () => {
    const r = shouldSkipSubscribedRecovery({
      sessionCode: 'ABCD',
      reconnectSequence: 1,
      replayHandledForSequence: -1,
      hasPageHandler: false,
      lastRemoteStateAgeMs: null,
      lastRemoteStateValid: false,
      lastSubscribedKey: null,
    });
    expect(r.skip).toBe(false);
  });
});
