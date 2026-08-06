const SESSION_KEY = 'worship-continuous-list-sync';
const LOCAL_KEY = 'worship-continuous-list-sync-v1';

export interface ContinuousListSyncCache {
  listId: string;
  listSongIds: string[];
  updatedAt: number;
}

function writeBoth(payload: ContinuousListSyncCache): void {
  const raw = JSON.stringify(payload);
  try {
    sessionStorage.setItem(SESSION_KEY, raw);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(LOCAL_KEY, raw);
  } catch {
    /* ignore */
  }
}

function readRaw(): ContinuousListSyncCache | null {
  try {
    const sessionRaw = sessionStorage.getItem(SESSION_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as ContinuousListSyncCache;
      if (parsed?.listId && Array.isArray(parsed.listSongIds)) return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const localRaw = localStorage.getItem(LOCAL_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as ContinuousListSyncCache;
      if (parsed?.listId && Array.isArray(parsed.listSongIds)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function persistContinuousListSync(listId: string, listSongIds: string[]): void {
  if (!listId || listSongIds.length === 0) return;
  writeBoth({
    listId,
    listSongIds,
    updatedAt: Date.now(),
  });
}

export function clearContinuousListSyncStorage(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

export function readContinuousListSync(listId: string): string[] | null {
  const parsed = readRaw();
  if (!parsed || parsed.listId !== listId) return null;
  return parsed.listSongIds.filter((id) => typeof id === 'string' && id.length > 0);
}
