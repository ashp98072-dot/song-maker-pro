import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cacheVisitedSong } from '@/pwa/visitedSongsCache';
import { resolveSongIdFromRouteParam } from '@/utils/songSlug';

/** Registra canciones visitadas (por id o slug) para uso offline. */
export default function VisitedSongsRegistrar() {
  const location = useLocation();
  const { songs } = useApp();

  useEffect(() => {
    const match = location.pathname.match(/^\/cancion\/([^/]+)/);
    if (!match?.[1]) return;
    const param = decodeURIComponent(match[1]);
    const songId = resolveSongIdFromRouteParam(param, songs);
    const song = songId ? songs.find((s) => s.id === songId) : undefined;
    if (song) void cacheVisitedSong(song);
  }, [location.pathname, songs]);

  return null;
}
