import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { cacheSongsForOffline } from '@/pwa/visitedSongsCache';

/**
 * Prefetch active setlist / live session songs into IndexedDB for mid-service offline.
 */
export default function SetlistOfflinePrefetcher() {
  const location = useLocation();
  const { songs, lists } = useApp();
  const simpleLive = useSimpleLiveSyncOptional();

  const targetIds = useMemo(() => {
    const ids = new Set<string>();

    const listMatch = location.pathname.match(/^\/lista\/([^/]+)/);
    if (listMatch?.[1]) {
      const list = lists.find((l) => l.id === listMatch[1]);
      list?.songIds?.forEach((id) => ids.add(id));
    }

    const liveMatch = location.pathname.match(/^\/setlist\/([^/]+)\/live/);
    if (liveMatch?.[1]) {
      const list = lists.find((l) => l.id === liveMatch[1]);
      list?.songIds?.forEach((id) => ids.add(id));
    }

    const remote = simpleLive?.lastState;
    remote?.listSongIds?.forEach((id) => ids.add(id));
    if (remote?.songId) ids.add(remote.songId);

    return [...ids];
  }, [location.pathname, lists, simpleLive?.lastState]);

  useEffect(() => {
    if (!targetIds.length || !songs.length) return;
    const idSet = new Set(targetIds);
    const pack = songs.filter((s) => idSet.has(s.id));
    if (!pack.length) return;
    void cacheSongsForOffline(pack);
  }, [targetIds, songs]);

  return null;
}
