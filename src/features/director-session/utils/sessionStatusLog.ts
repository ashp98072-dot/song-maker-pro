import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

export function logSessionStatusTransition(
  from: LiveSessionStatus,
  to: LiveSessionStatus,
  reason: string
): void {
  console.log('[SESSION_STATUS]', { from, to, reason });
}
