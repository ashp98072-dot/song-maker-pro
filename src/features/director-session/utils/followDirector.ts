const STORAGE_KEY = 'wt_follow_director';
const LEGACY_SESSION_KEY = 'worship-follow-director';

let defaultLogged = false;

export function followPrefLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FOLLOW_PREF] ${message}`, detail);
  } else {
    console.log(`[FOLLOW_PREF] ${message}`);
  }
}

export function followBlockedLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FOLLOW_BLOCKED] ${message}`, detail);
  } else {
    console.log(`[FOLLOW_BLOCKED] ${message}`);
  }
}

export function followRestoreLog(message: string, detail?: unknown): void {
  followRestoredLog(message, detail);
}

export function followRestoredLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FOLLOW_RESTORED] ${message}`, detail);
  } else {
    console.log(`[FOLLOW_RESTORED] ${message}`);
  }
}

function parseBool(raw: string | null): boolean | null {
  if (raw === null) return null;
  return raw === '1' || raw === 'true';
}

function migrateLegacySessionStorage(): boolean | null {
  try {
    const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
    const parsed = parseBool(legacy);
    if (parsed !== null) {
      localStorage.setItem(STORAGE_KEY, parsed ? '1' : '0');
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      followRestoredLog('migrated sessionStorage → localStorage', { value: parsed });
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readFollowDirector(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = parseBool(raw);
    if (parsed !== null) return parsed;

    const migrated = migrateLegacySessionStorage();
    if (migrated !== null) return migrated;

    // Persist default once so re-renders / StatusBar do not flood the console.
    localStorage.setItem(STORAGE_KEY, '1');
    if (!defaultLogged) {
      defaultLogged = true;
      followRestoredLog('default true (no stored preference)');
    }
    return true;
  } catch {
    return true;
  }
}

export function writeFollowDirector(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    followPrefLog('saved', { followDirector: value });
  } catch {
    followPrefLog('save failed', { followDirector: value });
  }
}

export function clearFollowDirectorStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    defaultLogged = false;
  } catch {
    /* ignore */
  }
}
