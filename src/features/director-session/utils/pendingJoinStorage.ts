const PENDING_JOIN_KEY = 'worship-pending-join';
const PENDING_JOIN_MAX_AGE_MS = 2 * 60 * 1000;

type PendingJoinPayload = { code: string; at: number };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function writePendingJoin(code: string): void {
  try {
    const normalized = normalizeCode(code);
    if (normalized.length < 4) return;
    const payload: PendingJoinPayload = { code: normalized, at: Date.now() };
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingJoin(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_JOIN_KEY);
    if (!raw) return null;

    // Legacy: plain code string
    if (!raw.startsWith('{')) {
      const code = normalizeCode(raw);
      if (code.length < 4) {
        clearPendingJoin();
        return null;
      }
      // Re-stamp with TTL so stale legacy pendings expire next read cycle.
      writePendingJoin(code);
      return code;
    }

    const parsed = JSON.parse(raw) as PendingJoinPayload;
    const code = normalizeCode(parsed?.code ?? '');
    if (code.length < 4 || typeof parsed.at !== 'number') {
      clearPendingJoin();
      return null;
    }
    if (Date.now() - parsed.at > PENDING_JOIN_MAX_AGE_MS) {
      clearPendingJoin();
      return null;
    }
    return code;
  } catch {
    clearPendingJoin();
    return null;
  }
}

export function clearPendingJoin(): void {
  try {
    sessionStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    /* ignore */
  }
}
