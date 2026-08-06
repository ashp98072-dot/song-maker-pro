import { sessionGuardLog } from '@/features/director-session/utils/sessionUiLog';
import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

export type JoinInFlightRef = { current: boolean };

export function tryAcquireJoinInFlight(
  ref: JoinInFlightRef,
  action: string,
  status: LiveSessionStatus
): boolean {
  if (ref.current) {
    sessionGuardLog({
      action,
      allowed: false,
      status,
      reason: 'join already in flight',
    });
    console.log('[SESSION_GUARD]', { reason: 'join already in flight', action });
    return false;
  }
  ref.current = true;
  return true;
}

export function releaseJoinInFlight(ref: JoinInFlightRef): void {
  ref.current = false;
}

export async function withJoinInFlight<T>(
  ref: JoinInFlightRef,
  action: string,
  status: LiveSessionStatus,
  fn: () => Promise<T>
): Promise<T | undefined> {
  if (!tryAcquireJoinInFlight(ref, action, status)) return undefined;
  try {
    return await fn();
  } finally {
    releaseJoinInFlight(ref);
  }
}
