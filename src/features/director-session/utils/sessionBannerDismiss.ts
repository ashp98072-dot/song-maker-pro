const STORAGE_KEY = 'wt_dismissed_session_banner';

export function sessionBannerLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SESSION_BANNER] ${message}`, detail);
  } else {
    console.log(`[SESSION_BANNER] ${message}`);
  }
}

export function readDismissedSessionBannerCode(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    return code.length >= 4 ? code : null;
  } catch {
    return null;
  }
}

export function writeDismissedSessionBanner(code: string): void {
  try {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    sessionStorage.setItem(STORAGE_KEY, normalized);
    sessionBannerLog('dismissed manually', { code: normalized });
  } catch {
    /* ignore */
  }
}

export function clearDismissedSessionBanner(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionBannerLog('removed — session ended or code changed');
  } catch {
    /* ignore */
  }
}

export function isSessionBannerDismissedForCode(code: string | null): boolean {
  if (!code) return false;
  const dismissed = readDismissedSessionBannerCode();
  return dismissed === code.trim().toUpperCase();
}
