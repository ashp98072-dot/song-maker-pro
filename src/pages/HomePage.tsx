import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SongCard from '@/components/SongCard';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getRenderDiagStage } from '@/renderDiag';
import { FEATURES } from '@/config/features';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { sessionJoinBlockedMessage } from '@/features/director-session/utils/checkSessionActive';
import {
  parseJoinCodeFromSearch,
  useSimpleLiveSyncOptional,
} from '@/features/simple-live-sync';
import { navigateAfterSimpleLiveJoin } from '@/features/simple-live-sync/navigateAfterSimpleLiveJoin';
import {
  browseCatalogSongs,
  browseSectionLabel,
} from '@/features/song-discovery/browseSongs';
import { CatalogFilterBar } from '@/features/song-discovery/CatalogFilterBar';
import {
  buildLocalFacets,
  filterCommunitySongs,
} from '@/features/community';

export default function HomePage() {
  useEffect(() => {
    const s = getRenderDiagStage();
    if (s === 4) console.log('[RENDER] HomePage');
  }, []);

  const { userName, songs } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const spectator = useSpectatorSession();
  const simpleLive = useSimpleLiveSyncOptional();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [keyFilter, setKeyFilter] = useState<string | null>(
    () => searchParams.get('tono') || null
  );
  const [artist, setArtist] = useState<string | null>(
    () => searchParams.get('artista') || null
  );
  const [showJoinSession, setShowJoinSession] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [pendingSimpleNav, setPendingSimpleNav] = useState(false);
  const autoJoinTried = useRef(false);

  const facets = useMemo(() => buildLocalFacets(songs), [songs]);

  const filtered = useMemo(() => {
    const hasFacet = !!(keyFilter || artist);
    if (search.trim() || hasFacet) {
      return filterCommunitySongs(songs, {
        search,
        key: keyFilter,
        artist,
      }).slice(0, 120);
    }
    return browseCatalogSongs(songs, '');
  }, [songs, search, keyFilter, artist]);

  const sectionLabel = useMemo(() => {
    if (keyFilter || artist) return 'Resultados filtrados';
    return browseSectionLabel(songs, search);
  }, [songs, search, keyFilter, artist]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q != null && q !== search) setSearch(q);
    setKeyFilter(searchParams.get('tono') || null);
    setArtist(searchParams.get('artista') || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL only
  }, [searchParams]);

  const syncUrl = (nextSearch: string, nextKey: string | null, nextArtist: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (nextSearch.trim()) next.set('q', nextSearch.trim());
    else next.delete('q');
    if (nextKey) next.set('tono', nextKey);
    else next.delete('tono');
    if (nextArtist) next.set('artista', nextArtist);
    else next.delete('artista');
    next.delete('join');
    next.delete('codigo');
    next.delete('code');
    setSearchParams(next, { replace: true });
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    syncUrl(value, keyFilter, artist);
  };

  const onKeyChange = (key: string | null) => {
    setKeyFilter(key);
    syncUrl(search, key, artist);
  };

  const onArtistChange = (value: string | null) => {
    setArtist(value);
    syncUrl(search, keyFilter, value);
  };

  const clearFilters = () => {
    setKeyFilter(null);
    setArtist(null);
    syncUrl(search, null, null);
  };

  const handleJoinSession = async (raw?: string) => {
    const trimmed = (raw ?? joinCode).trim();
    if (trimmed.length < 4) {
      toast.error('Código de sesión inválido (mínimo 4 caracteres)');
      return;
    }

    if (FEATURES.SIMPLE_LIVE_SYNC && simpleLive) {
      const ok = await simpleLive.joinAsFollower(trimmed);
      if (ok) setPendingSimpleNav(true);
      return;
    }

    const result = await spectator.joinWithCode(trimmed);
    if (result === true) return;
    if (result === 'conflict') return;
    if (result === 'busy') {
      toast.error('Ya hay una unión en curso. Espera un momento.');
      return;
    }
    if (result !== 'query_error') return;
    toast.error(sessionJoinBlockedMessage(result));
  };

  useEffect(() => {
    const fromQuery = parseJoinCodeFromSearch(searchParams.toString());
    if (!fromQuery || autoJoinTried.current) return;
    if (FEATURES.SIMPLE_LIVE_SYNC && !simpleLive) return;
    autoJoinTried.current = true;
    setJoinCode(fromQuery);
    setShowJoinSession(true);
    setSearchParams({}, { replace: true });
    void handleJoinSession(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams, simpleLive]);

  useEffect(() => {
    if (!pendingSimpleNav || !simpleLive) return;
    const state = simpleLive.lastState;
    if (!state) return;

    const moved = navigateAfterSimpleLiveJoin(navigate, state, songs);
    if (moved) setPendingSimpleNav(false);
  }, [
    pendingSimpleNav,
    simpleLive?.lastState,
    navigate,
    simpleLive,
    songs,
  ]);

  return (
    <div className="container px-4 py-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Hola, {userName}</h1>
        <p className="text-muted-foreground text-sm">¿Qué canción vamos a transponer hoy?</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, artista o tono..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        <button
          onClick={() => setShowJoinSession((s) => !s)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-gold hover:border-gold transition-colors text-sm font-medium shrink-0"
        >
          <Users className="w-4 h-4" /> Unirse a Sesión
        </button>
      </div>

      {songs.length > 0 && (
        <CatalogFilterBar
          keys={facets.keys}
          artists={facets.artists}
          keyFilter={keyFilter}
          artist={artist}
          onKeyChange={onKeyChange}
          onArtistChange={onArtistChange}
          onClear={clearFilters}
        />
      )}

      {showJoinSession && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6"
        >
          <div className="glass-card p-4 max-w-md">
            <p className="text-sm text-muted-foreground mb-2">Ingresa el código del director:</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ej: A1B2C3"
                maxLength={6}
                className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase font-mono tracking-widest"
              />
              <button
                onClick={() => void handleJoinSession()}
                disabled={joinCode.length < 4}
                className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                Conectar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <h2 className="text-lg font-bold font-display text-foreground mb-4">
        {sectionLabel}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({filtered.length}
          {!search.trim() && !keyFilter && !artist && songs.length > filtered.length
            ? ` de ${songs.length}`
            : ''}
          )
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No se encontraron canciones.</p>
      )}
    </div>
  );
}
