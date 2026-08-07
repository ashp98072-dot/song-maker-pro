import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { SetlistSongEntry } from '@/features/continuous-setlist/types';
import type { SongList } from '@/types/music';
import { resolveSetlistSongIds } from '@/features/continuous-setlist/utils/resolveSetlistSongIds';
import { continuousSyncLog } from '@/features/director-session/utils/continuousSyncLog';

export interface UseSetlistSongsOptions {
  routeSongIds?: string[];
  sharedSongIds?: string[];
  liveSessionSongIds?: string[];
}

export function useSetlistSongs(listId: string | undefined, options?: UseSetlistSongsOptions) {
  const { lists, songs } = useApp();

  const appList = useMemo(
    () => (listId ? lists.find((l) => l.id === listId) : undefined),
    [lists, listId]
  );

  const { songIds: resolvedSongIds, source: resolvedSource } = useMemo(() => {
    continuousSyncLog('route state', {
      listId,
      routeSongIds: options?.routeSongIds,
    });
    continuousSyncLog('appContext list', {
      listId,
      appList: appList
        ? { id: appList.id, name: appList.name, count: appList.songIds.length }
        : null,
    });
    continuousSyncLog('shared payload', {
      listId,
      sharedSongIds: options?.sharedSongIds,
    });

    continuousSyncLog('liveSession payload', {
      listId,
      liveSessionSongIds: options?.liveSessionSongIds,
    });

    const resolved = resolveSetlistSongIds({
      listId,
      routeSongIds: options?.routeSongIds,
      appList,
      sharedSongIds: options?.sharedSongIds,
      liveSessionSongIds: options?.liveSessionSongIds,
    });

    continuousSyncLog('resolved list', {
      listId,
      source: resolved.source,
      count: resolved.songIds.length,
      songIds: resolved.songIds,
    });

    return resolved;
  }, [listId, options?.routeSongIds, options?.sharedSongIds, options?.liveSessionSongIds, appList]);

  const list = useMemo((): SongList | undefined => {
    if (appList) return appList;
    if (listId && resolvedSongIds.length > 0) {
      return {
        id: listId,
        name: 'Setlist en vivo',
        songIds: resolvedSongIds,
        createdAt: new Date().toISOString(),
      };
    }
    return undefined;
  }, [appList, listId, resolvedSongIds]);

  const entries = useMemo((): SetlistSongEntry[] => {
    if (resolvedSongIds.length === 0) return [];
    let denseIndex = 0;
    const out: SetlistSongEntry[] = [];
    for (const id of resolvedSongIds) {
      const song = songs.find((s) => s.id === id);
      if (!song) continue;
      out.push({ song, index: denseIndex });
      denseIndex += 1;
    }
    return out;
  }, [resolvedSongIds, songs]);

  const songIds = useMemo(() => entries.map((e) => e.song.id), [entries]);
  const missingSongCount = Math.max(0, resolvedSongIds.length - entries.length);

  return { list, entries, songIds, resolvedSongIds, resolvedSource, missingSongCount };
}
