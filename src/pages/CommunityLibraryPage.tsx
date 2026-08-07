import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Globe, Loader2, ListMusic, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { matchesSearch } from '@/utils/textNormalize';
import {
  fetchPublicLists,
  fetchPublicListsByOwners,
  type PublicListRow,
} from '@/features/community';
import { fetchFollowingIds } from '@/features/profile/profileApi';
import { supabase } from '@/integrations/supabase/client';

/**
 * Comunidad = cadenas públicas (listas compartidas).
 * Pestaña Siguiendo: cadenas de músicos que sigues.
 */
export default function CommunityLibraryPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'following'>('all');
  const [publicLists, setPublicLists] = useState<PublicListRow[]>([]);
  const [followingLists, setFollowingLists] = useState<PublicListRow[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const loggedIn = !!auth.user;
        if (!cancelled) setHasSession(loggedIn);

        const lists = await fetchPublicLists(80);
        if (cancelled) return;
        setPublicLists(lists);

        if (loggedIn) {
          const ids = await fetchFollowingIds();
          if (cancelled) return;
          setFollowingCount(ids.length);
          const fromFollows = await fetchPublicListsByOwners(ids, 80);
          if (!cancelled) setFollowingLists(fromFollows);
        } else {
          setFollowingCount(0);
          setFollowingLists([]);
        }
      } catch {
        if (!cancelled) {
          setPublicLists([]);
          setFollowingLists([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceLists = tab === 'following' ? followingLists : publicLists;

  const filteredLists = useMemo(() => {
    const q = search.trim();
    if (!q) return sourceLists;
    return sourceLists.filter(
      (l) =>
        matchesSearch(l.name, q) ||
        matchesSearch(l.owner_name, q) ||
        l.songs.some((s) => matchesSearch(s.title, q) || matchesSearch(s.artist, q))
    );
  }, [sourceLists, search]);

  return (
    <div className="container px-4 py-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-6 h-6 text-gold" />
          <h1 className="text-2xl font-bold font-display text-foreground">Comunidad</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Cadenas compartidas. Sigue a músicos y ve sus listas en «Siguiendo».
        </p>
      </motion.div>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
            tab === 'all'
              ? 'bg-gold/15 border-gold text-gold'
              : 'bg-secondary border-border text-muted-foreground'
          }`}
        >
          Todas
          {publicLists.length > 0 && (
            <span className="ml-1 text-[10px] opacity-80">({publicLists.length})</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('following')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors inline-flex items-center gap-2 ${
            tab === 'following'
              ? 'bg-gold/15 border-gold text-gold'
              : 'bg-secondary border-border text-muted-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Siguiendo
          {followingCount > 0 && (
            <span className="text-[10px] opacity-80">({followingLists.length})</span>
          )}
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cadena por nombre, autor o canción..."
          className="w-full max-w-2xl pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando cadenas…
        </div>
      ) : tab === 'following' && !hasSession ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">Inicia sesión para ver a quién sigues.</p>
          <Link to="/login" className="text-gold text-sm font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-16">
          <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">
            {search
              ? 'No hay cadenas con ese criterio.'
              : tab === 'following'
                ? followingCount === 0
                  ? 'Aún no sigues a nadie. Abre un perfil y pulsa Seguir.'
                  : 'Las personas que sigues aún no tienen cadenas públicas.'
                : 'Aún no hay cadenas públicas. Publica una desde Mis Listas.'}
          </p>
          <Link
            to={tab === 'following' ? '/comunidad' : '/listas'}
            className="text-gold text-sm font-semibold hover:underline"
            onClick={() => tab === 'following' && setTab('all')}
          >
            {tab === 'following' ? 'Explorar todas' : 'Ir a Mis Listas'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLists.map((cadena) => (
            <div
              key={cadena.id}
              className="glass-card p-5 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-start gap-3">
                <Link
                  to={`/comunidad/cadena/${cadena.slug}`}
                  className="p-2 rounded-lg bg-gold/10 text-gold shrink-0"
                >
                  <ListMusic className="w-5 h-5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/comunidad/cadena/${cadena.slug}`}
                    className="font-semibold text-foreground truncate block hover:text-gold"
                  >
                    {cadena.name}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    Por{' '}
                    {cadena.owner_id ? (
                      <Link
                        to={`/perfil/${cadena.owner_id}`}
                        className="text-gold hover:underline"
                      >
                        {cadena.owner_name || 'Músico'}
                      </Link>
                    ) : (
                      cadena.owner_name || 'Músico'
                    )}{' '}
                    · {cadena.song_count} canciones
                  </p>
                  <Link
                    to={`/comunidad/cadena/${cadena.slug}`}
                    className="text-xs text-muted-foreground mt-2 line-clamp-2 block"
                  >
                    {cadena.songs
                      .slice(0, 4)
                      .map((s) => s.title)
                      .join(' · ')}
                    {cadena.songs.length > 4 ? '…' : ''}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
