import type { SongList } from '@/types/music';
import { readContinuousListSync } from '@/features/continuous-setlist/utils/continuousListSyncCache';

export type SetlistSongIdSource =
  | 'route'
  | 'appContext'
  | 'shared'
  | 'sessionStorage'
  | 'liveSession'
  | 'none';

export interface ResolveSetlistSongIdsInput {
  listId?: string;
  routeSongIds?: string[] | null;
  appList?: SongList | null;
  sharedSongIds?: string[] | null;
  /** Fallback desde live_sessions (join tardío / refresh). */
  liveSessionSongIds?: string[] | null;
}

export interface ResolveSetlistSongIdsResult {
  songIds: string[];
  source: SetlistSongIdSource;
}

function nonEmptyIds(ids: string[] | null | undefined): string[] {
  if (!ids?.length) return [];
  return ids.filter((id) => typeof id === 'string' && id.length > 0);
}

/** Prioridad: route state → AppContext list → shared-session → sessionStorage cache. */
export function resolveSetlistSongIds(input: ResolveSetlistSongIdsInput): ResolveSetlistSongIdsResult {
  const route = nonEmptyIds(input.routeSongIds ?? undefined);
  if (route.length > 0) {
    return { songIds: route, source: 'route' };
  }

  const fromApp = nonEmptyIds(input.appList?.songIds);
  if (fromApp.length > 0) {
    return { songIds: fromApp, source: 'appContext' };
  }

  const shared = nonEmptyIds(input.sharedSongIds ?? undefined);
  if (shared.length > 0) {
    return { songIds: shared, source: 'shared' };
  }

  if (input.listId) {
    const cached = readContinuousListSync(input.listId);
    if (cached?.length) {
      return { songIds: cached, source: 'sessionStorage' };
    }
  }

  const liveSession = nonEmptyIds(input.liveSessionSongIds ?? undefined);
  if (liveSession.length > 0) {
    return { songIds: liveSession, source: 'liveSession' };
  }

  return { songIds: [], source: 'none' };
}
