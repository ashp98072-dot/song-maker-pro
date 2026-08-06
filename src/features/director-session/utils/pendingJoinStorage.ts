const PENDING_JOIN_KEY = 'worship-pending-join';

export function writePendingJoin(code: string): void {
  try {
    sessionStorage.setItem(PENDING_JOIN_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function readPendingJoin(): string | null {
  try {
    const code = sessionStorage.getItem(PENDING_JOIN_KEY);
    return code && code.length >= 4 ? code : null;
  } catch {
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
