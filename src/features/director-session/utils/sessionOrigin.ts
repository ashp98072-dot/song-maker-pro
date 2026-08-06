import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';

export type SessionOrigin = {
  type: 'song' | 'setlist';
  songId?: string;
  listId?: string;
  listName?: string;
};

export type PageSessionContext = {
  songId?: string;
  listId?: string;
  listSongIds?: string[];
};

export function buildSessionOrigin(
  page: PageSessionContext & { listName?: string }
): SessionOrigin | null {
  if (page.listId && page.listSongIds && page.listSongIds.length > 0) {
    return {
      type: 'setlist',
      listId: page.listId,
      listName: page.listName,
      ...(page.songId ? { songId: page.songId } : {}),
    };
  }
  if (page.songId) {
    return { type: 'song', songId: page.songId };
  }
  return null;
}

export function parseSessionOriginJson(raw: unknown): SessionOrigin | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.type === 'setlist' && typeof o.listId === 'string') {
    return {
      type: 'setlist',
      listId: o.listId,
      listName: typeof o.listName === 'string' ? o.listName : undefined,
      songId: typeof o.songId === 'string' ? o.songId : undefined,
    };
  }
  if (o.type === 'song' && typeof o.songId === 'string') {
    return { type: 'song', songId: o.songId };
  }
  return null;
}

export function inferSessionOriginFromRecovery(
  recovery: Pick<SessionRecoveryState, 'sessionOrigin' | 'listId' | 'listSongIds' | 'songId'>
): SessionOrigin | null {
  if (recovery.sessionOrigin) return recovery.sessionOrigin;
  if (recovery.listId && recovery.listSongIds.length > 0) {
    return { type: 'setlist', listId: recovery.listId, songId: recovery.songId ?? undefined };
  }
  if (recovery.songId) {
    return { type: 'song', songId: recovery.songId };
  }
  return null;
}

export function isPageInSessionScope(
  origin: SessionOrigin | null | undefined,
  page: PageSessionContext
): boolean {
  if (!origin) return false;

  if (origin.type === 'song') {
    return !!page.songId && page.songId === origin.songId;
  }

  if (!origin.listId) return false;
  if (page.listId === origin.listId) return true;
  if (page.songId && page.listSongIds?.length) {
    return page.listSongIds.includes(page.songId);
  }
  return false;
}

export function sessionOriginLabel(origin: SessionOrigin): string {
  if (origin.type === 'setlist') {
    return origin.listName?.trim() || 'esta lista';
  }
  return 'esta canción';
}

export function sessionOriginsEqual(a: SessionOrigin, b: SessionOrigin): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'song') return a.songId === b.songId;
  return a.listId === b.listId;
}
