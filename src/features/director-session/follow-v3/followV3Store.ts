import { useSyncExternalStore } from 'react';

export type FollowV3State = {
  currentSongId: string | null;
  seq: number;
  updatedAt: number | null;
};

let state: FollowV3State = {
  currentSongId: null,
  seq: 0,
  updatedAt: null,
};

/** Last songId that resolved to a catalog entry — never index-based. */
let lastResolvedSongId: string | null = null;

const listeners = new Set<() => void>();

export type FollowV3SongResolveResult = {
  incomingSongId: string | null;
  resolvedSongId: string | null;
  found: boolean;
  fallbackUsed: boolean;
  previousSongId: string | null;
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getFollowV3State(): Readonly<FollowV3State> {
  return state;
}

export function setFollowV3Song(songId: string, seq: number): boolean {
  if (seq <= state.seq) return false;

  const previousSongId = state.currentSongId;
  const previousSeq = state.seq;

  state = {
    currentSongId: songId,
    seq,
    updatedAt: Date.now(),
  };
  lastResolvedSongId = songId;

  console.log('[FOLLOW_V3_STORE_UPDATE]', {
    songId,
    seq,
    previousSongId,
    previousSeq,
  });

  emit();
  return true;
}

export function resetFollowV3State(): void {
  if (state.currentSongId === null && state.seq === 0 && state.updatedAt === null) return;

  state = {
    currentSongId: null,
    seq: 0,
    updatedAt: null,
  };
  lastResolvedSongId = null;

  emit();
}

/**
 * Resolve song strictly by id. When missing from catalog, keep last valid song.
 * Never uses route param, index, or songs[0].
 */
export function resolveFollowV3SongById(
  incomingSongId: string | null | undefined,
  catalog: ReadonlyArray<{ id: string }>
): FollowV3SongResolveResult {
  const trimmed = incomingSongId?.trim() ?? null;
  const previousSongId = lastResolvedSongId;

  if (!trimmed) {
    return {
      incomingSongId: null,
      resolvedSongId: lastResolvedSongId,
      found: false,
      fallbackUsed: lastResolvedSongId !== null,
      previousSongId,
    };
  }

  const found = catalog.some((entry) => entry.id === trimmed);
  if (found) {
    return {
      incomingSongId: trimmed,
      resolvedSongId: trimmed,
      found: true,
      fallbackUsed: false,
      previousSongId,
    };
  }

  return {
    incomingSongId: trimmed,
    resolvedSongId: lastResolvedSongId,
    found: false,
    fallbackUsed: lastResolvedSongId !== null,
    previousSongId,
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getCurrentSongIdSnapshot(): string | null {
  return state.currentSongId;
}

export function useFollowV3Song(): string | null {
  return useSyncExternalStore(subscribe, getCurrentSongIdSnapshot, getCurrentSongIdSnapshot);
}
