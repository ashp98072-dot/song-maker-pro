import { followTrace } from '@/features/director-session/utils/followTrace';

export type FollowerRecoverySource = 'shared-session' | 'db' | 'route' | 'fallback';

export function followRecoveryLog(detail: {
  source: FollowerRecoverySource;
  code: string;
  currentIndex?: number | null;
  songId?: string | null;
  reason?: string;
}): void {
  console.log('[FOLLOW_RECOVERY]', detail);
}

export function followRecoverySuccess(detail: {
  source: FollowerRecoverySource;
  code: string;
  currentIndex?: number | null;
  songId?: string | null;
}): void {
  console.log('[FOLLOW_RECOVERY_SUCCESS]', detail);
}

export function followRecoveryFailed(detail: {
  code: string;
  reason: string;
}): void {
  console.log('[FOLLOW_RECOVERY_FAILED]', detail);
}

export function followJoinLog(detail: {
  remoteTargetIndex: number | null;
  songId?: string | null;
  source?: string;
}): void {
  console.log('[FOLLOW_JOIN]', detail);
}

export function followCleanupLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_CLEANUP]', detail);
}

export function sessionEndLog(detail: Record<string, unknown>): void {
  console.log('[SESSION_END]', detail);
}

export function sessionEndSuccessLog(detail?: Record<string, unknown>): void {
  console.log('[SESSION_END_SUCCESS]', detail ?? {});
}

export function realtimeReconnectLog(detail: { sequenceId: number; role: string; reason?: string }): void {
  console.log('[REALTIME_RECONNECT]', detail);
}

export function realtimeRecoveredLog(detail: { sequenceId: number; role: string; code: string }): void {
  console.log('[REALTIME_RECOVERED]', detail);
}

export function followIgnoreRecoveryLog(detail: { reason: string; [key: string]: unknown }): void {
  console.log('[FOLLOW_IGNORE]', detail);
  if (
    detail.reason.includes('page recovery') ||
    detail.reason.includes('nav already applied')
  ) {
    followTrace('FOLLOW_RECOVERY_BLOCK_ACTIVE', {
      extra: {
        ...detail,
        callStack: new Error('FOLLOW_RECOVERY_BLOCK_ACTIVE').stack?.split('\n').slice(1, 6),
      },
    });
  }
}

export function followRecoveryBlockedLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_RECOVERY_BLOCKED]', detail);
}

export function followViewmodeLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_VIEWMODE]', detail);
}

export function joinFastpathLog(detail: {
  source: 'shared-session' | 'db' | 'fallback';
  code: string;
  joinSource?: string;
}): void {
  console.log('[JOIN_FASTPATH]', detail);
}

export function sessionStatusBarLog(detail: Record<string, unknown>): void {
  console.log('[SESSION_STATUSBAR]', detail);
}
