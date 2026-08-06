const RECENT_REMOTE_STATE_MS = 30_000;

export type SubscribedRecoverySkipReason =
  | 'duplicate-subscribe'
  | 'healthy-channel'
  | 'replay-already-handled'
  | 'recent-remote-state';

export function realtimeSkipLog(detail: {
  reason: SubscribedRecoverySkipReason;
  sessionCode: string;
  reconnectSequence: number;
  extra?: Record<string, unknown>;
}): void {
  console.log('[REALTIME_SKIP]', detail);
}

export function shouldSkipSubscribedRecovery(opts: {
  sessionCode: string;
  reconnectSequence: number;
  replayHandledForSequence: number;
  hasPageHandler: boolean;
  lastRemoteStateAgeMs: number | null;
  lastRemoteStateValid: boolean;
  lastSubscribedKey: string | null;
}): { skip: boolean; reason?: SubscribedRecoverySkipReason } {
  const subscribeKey = `${opts.sessionCode}|${opts.reconnectSequence}`;

  if (opts.lastSubscribedKey === subscribeKey) {
    return { skip: true, reason: 'duplicate-subscribe' };
  }

  if (opts.replayHandledForSequence === opts.reconnectSequence) {
    return { skip: true, reason: 'replay-already-handled' };
  }

  if (
    opts.hasPageHandler &&
    opts.lastRemoteStateValid &&
    opts.lastRemoteStateAgeMs != null &&
    opts.lastRemoteStateAgeMs < RECENT_REMOTE_STATE_MS
  ) {
    return { skip: true, reason: 'recent-remote-state' };
  }

  if (opts.hasPageHandler && opts.lastRemoteStateValid) {
    return { skip: true, reason: 'healthy-channel' };
  }

  return { skip: false };
}
