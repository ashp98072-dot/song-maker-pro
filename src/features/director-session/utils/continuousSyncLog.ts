import type { SharedSessionState } from '@/features/director-session/types';

export function continuousSyncLog(message: string, payload?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (payload !== undefined) {
    console.log(`[ContinuousSync] ${message}`, payload);
  } else {
    console.log(`[ContinuousSync] ${message}`);
  }
}

export function logContinuousPublish(state: SharedSessionState): void {
  continuousSyncLog('publish', state);
}
