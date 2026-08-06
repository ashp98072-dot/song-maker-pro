import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

export type LiveSessionAssertionSnapshot = {
  liveSessionStatus: LiveSessionStatus;
  liveIsFollower: boolean;
  sessionConnected: boolean;
  hasDetected: boolean;
  activeJoinCode: string | null;
  liveFollowerCode: string;
  otherSessionCode?: string | null;
  pendingLanding?: boolean;
  settledIndex?: number | null;
};

function warnAssertion(message: string, detail: Record<string, unknown>): void {
  console.warn('[LIVE_ASSERTION_FAILED]', { message, ...detail });
}

/**
 * DEV-only runtime checks for impossible session/landing combinations.
 * Never throws — warnings only.
 */
export function assertLiveSessionInvariants(snapshot: LiveSessionAssertionSnapshot): void {
  if (!import.meta.env.DEV) return;

  const { liveSessionStatus: status } = snapshot;

  if (status === 'active' && snapshot.hasDetected) {
    warnAssertion('active + detected banner state', snapshot as unknown as Record<string, unknown>);
  }

  if (status === 'joining' && snapshot.sessionConnected && snapshot.liveIsFollower) {
    warnAssertion('joining while follower already connected', snapshot as unknown as Record<string, unknown>);
  }

  if (
    snapshot.pendingLanding &&
    snapshot.settledIndex != null &&
    typeof snapshot.settledIndex === 'number'
  ) {
    warnAssertion('pendingLanding while settled at same beat', {
      settledIndex: snapshot.settledIndex,
    });
  }

  const codes = new Set<string>();
  if (snapshot.liveFollowerCode.length >= 4) codes.add(snapshot.liveFollowerCode);
  if (snapshot.activeJoinCode && snapshot.activeJoinCode.length >= 4) {
    codes.add(snapshot.activeJoinCode);
  }
  if (snapshot.otherSessionCode && snapshot.otherSessionCode.length >= 4) {
    codes.add(snapshot.otherSessionCode);
  }
  if (codes.size > 1) {
    warnAssertion('multiple active session codes', {
      codes: [...codes],
    });
  }
}

export function assertFollowerLandingConcurrency(
  pendingLandingCount: number,
  context: string
): void {
  if (!import.meta.env.DEV) return;
  if (pendingLandingCount > 1) {
    warnAssertion('more than one simultaneous follower landing', { pendingLandingCount, context });
  }
}
