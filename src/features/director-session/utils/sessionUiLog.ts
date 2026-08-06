import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

export function sessionUiLog(
  detail: {
    status: LiveSessionStatus;
    bannerVisible: boolean;
    reason: string;
  }
): void {
  console.log('[SESSION_UI]', detail);
}

export function sessionGuardLog(
  detail: {
    action: string;
    allowed: boolean;
    status: LiveSessionStatus;
    reason?: string;
  }
): void {
  console.log('[SESSION_GUARD]', detail);
}
