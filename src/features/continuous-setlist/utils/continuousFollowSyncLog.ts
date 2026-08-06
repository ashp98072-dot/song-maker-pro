import { followTrace } from '@/features/director-session/utils/followTrace';

/** Logs estándar FASE 1 / 5.5 — sync follower modo continuo (shared-session only). */

export function continuousFollowSyncLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[CONTINUOUS_SYNC] ${message}`, detail);
  } else {
    console.log(`[CONTINUOUS_SYNC] ${message}`);
  }
}

export function followApplyLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FOLLOW_APPLY] ${message}`, detail);
  } else {
    console.log(`[FOLLOW_APPLY] ${message}`);
  }
}

export function followApplyAllowedLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_APPLY_ALLOWED]', detail);
}

export function followApplyBlockedLog(detail: Record<string, unknown>): void {
  console.log('[FOLLOW_APPLY_BLOCKED]', detail);
}

export function followSkipLog(detail: { reason: string } & Record<string, unknown>): void {
  console.log('[FOLLOW_SKIP]', detail);
}

export function followLandingLog(detail: {
  remoteIndex: number;
  remoteSongId: string;
}): void {
  console.log('[FOLLOW_LANDING]', detail);
  followTrace('FOLLOW_LANDING_START', {
    actor: 'spectator',
    page: 'continuous-live',
    remoteIndex: detail.remoteIndex,
    remoteSongId: detail.remoteSongId,
    songId: detail.remoteSongId,
  });
}

export function followRenderReadyLog(detail: { remoteIndex: number }): void {
  console.log('[FOLLOW_RENDER_READY]', detail);
}

export function followScrollLog(detail: {
  success: boolean;
  retry: number;
  reason?: string;
}): void {
  console.log('[FOLLOW_SCROLL]', detail);
}

export function followSettledLog(detail: { landedIndex: number } & Record<string, unknown>): void {
  console.log('[FOLLOW_SETTLED]', detail);
  followTrace('FOLLOW_SETTLED', {
    actor: 'spectator',
    page: 'continuous-live',
    remoteIndex: detail.landedIndex,
    localIndex: detail.landedIndex,
    extra: { ...detail },
  });
}

export function followDesyncWarningLog(detail: Record<string, unknown>): void {
  console.warn('[FOLLOW_DESYNC_WARNING]', detail);
}

export function followFailedLog(detail: { reason: string } & Record<string, unknown>): void {
  console.log('[FOLLOW_FAILED]', detail);
}

export {
  followPipelineLog,
  followResidualLog,
  followDuplicateLog,
  followIgnoreLog,
  followUnexpectedScrollLog,
} from '@/features/continuous-setlist/utils/continuousFollowAudit';

export { followDiagnosisLog } from '@/features/continuous-setlist/utils/continuousFollowRuntimeDiagnosis';

export function remoteSectionLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[REMOTE_SECTION] ${message}`, detail);
  } else {
    console.log(`[REMOTE_SECTION] ${message}`);
  }
}
