import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Users } from 'lucide-react';
import { matchesSearch } from '@/utils/textNormalize';
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
  const [search, setSearch] = useState('');
  const [showJoinSession, setShowJoinSession] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [pendingSimpleNav, setPendingSimpleNav] = useState(false);
  const autoJoinTried = useRef(false);

  const filtered = useMemo(() => {
    if (!search) {
      // Muestra populares + las recién agregadas por usuarios (isNew)
      const visible = songs.filter(s => s.isPopular || s.isNew);
      // Las nuevas primero
      return visible.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return 0;
      });
    }
    return songs.filter(s => matchesSearch(s.title, search) || matchesSearch(s.artist, search));
  }, [songs, search]);

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
    // joinWithCode already toasts on precheck failure; avoid duplicate for known reasons.
    if (result !== 'query_error') return;
    toast.error(sessionJoinBlockedMessage(result));
  };

  // Deep link: /?join=CODE
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

  // After simple-live join from home, open the director song/list once.
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

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar canciones por título o artista..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        </div>
        <button
          onClick={() => setShowJoinSession(s => !s)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-gold hover:border-gold transition-colors text-sm font-medium shrink-0"
        >
          <Users className="w-4 h-4" /> Unirse a Sesión
        </button>
      </div>

      {showJoinSession && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
          <div className="glass-card p-4 max-w-md">
            <p className="text-sm text-muted-foreground mb-2">Ingresa el código del director:</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
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

      <h2 className="text-lg font-bold font-display text-foreground mb-4">{search ? 'Resultados' : 'Canciones Populares y Recién Agregadas'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(song => <SongCard key={song.id} song={song} />)}
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">No se encontraron canciones.</p>}
    </div>
  );
}
