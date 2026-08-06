const STORAGE_KEY = 'worship-continuous-list-sync';

export interface ContinuousListSyncCache {
  listId: string;
  listSongIds: string[];
  updatedAt: number;
}

export function persistContinuousListSync(listId: string, listSongIds: string[]): void {
  if (!listId || listSongIds.length === 0) return;
  try {
    const payload: ContinuousListSyncCache = {
      listId,
      listSongIds,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage no disponible */
  }
}

export function clearContinuousListSyncStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readContinuousListSync(listId: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContinuousListSyncCache;
    if (parsed?.listId !== listId || !Array.isArray(parsed.listSongIds)) return null;
    return parsed.listSongIds.filter((id) => typeof id === 'string' && id.length > 0);
  } catch {
    return null;
  }
}
