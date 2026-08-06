import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cacheVisitedSong } from '@/pwa/visitedSongsCache';

/** Registra canciones visitadas para uso offline (sin tocar SongViewPage). */
export default function VisitedSongsRegistrar() {
  const location = useLocation();
  const { songs } = useApp();

  useEffect(() => {
    const match = location.pathname.match(/^\/cancion\/([^/]+)/);
    if (!match) return;
    const song = songs.find((s) => s.id === match[1]);
    if (song) void cacheVisitedSong(song);
  }, [location.pathname, songs]);

  return null;
}
