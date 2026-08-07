import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Globe, Loader2, ListMusic, Music2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { matchesSearch } from '@/utils/textNormalize';
import {
  CommunitySongsPanel,
  fetchPublicLists,
  fetchPublicListsByOwners,
  type PublicListRow,
} from '@/features/community';
import { fetchFollowingIds, fetchProfilesByIds, type ProfileLite } from '@/features/profile/profileApi';
import { ProfileAvatar } from '@/features/profile/ProfileAvatar';
import { supabase } from '@/integrations/supabase/client';

type HubTab = 'cantos' | 'all' | 'following';

function tabFromParams(raw: string | null): HubTab {
  if (raw === 'siguiendo' || raw === 'following') return 'following';
  if (raw === 'cadenas' || raw === 'all') return 'all';
  return 'cantos';
}

/**
 * Comunidad = cantos públicos + cadenas compartidas.
 * Pestaña Siguiendo: cadenas de músicos que sigues.
 */
export default function CommunityLibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = tabFromParams(params.get('tab'));
  const [search, setSearch] = useState('');
  const [publicLists, setPublicLists] = useState<PublicListRow[]>([]);
  const [followingLists, setFollowingLists] = useState<PublicListRow[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const setTab = (next: HubTab) => {
    if (next === 'cantos') setParams({}, { replace: true });
    else if (next === 'all') setParams({ tab: 'cadenas' }, { replace: true });
    else setParams({ tab: 'siguiendo' }, { replace: true });
  };

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

        let followLists: PublicListRow[] = [];
        if (loggedIn) {
          const ids = await fetchFollowingIds();
          if (cancelled) return;
          setFollowingCount(ids.length);
          followLists = await fetchPublicListsByOwners(ids, 80);
          if (!cancelled) setFollowingLists(followLists);
        } else {
          setFollowingCount(0);
          setFollowingLists([]);
        }

        const ownerIds = [...lists, ...followLists].map((l) => l.owner_id).filter(Boolean);
        const profiles = await fetchProfilesByIds(ownerIds);
        if (cancelled) return;
        const map: Record<string, ProfileLite> = {};
        for (const p of profiles) map[p.userId] = p;
        setProfilesById(map);
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
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
          <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-gold shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
            Comunidad
          </h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Explora cantos públicos y cadenas compartidas. Copia a tu biblioteca con un toque.
        </p>
      </motion.div>

      <div className="sticky top-[var(--app-chrome-top,3.5rem)] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 mb-3 sm:mb-5 bg-background/95 backdrop-blur-sm border-b border-border/60 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:static sm:z-auto">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('cantos')}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors inline-flex items-center gap-2 ${
              tab === 'cantos'
                ? 'bg-gold/15 border-gold text-gold'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
          >
            <Music2 className="w-4 h-4" />
            Cantos
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              tab === 'all'
                ? 'bg-gold/15 border-gold text-gold'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
          >
            Cadenas
            {publicLists.length > 0 && (
              <span className="ml-1 text-[10px] opacity-80">({publicLists.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('following')}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors inline-flex items-center gap-2 ${
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
      </div>

      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            tab === 'cantos'
              ? 'Buscar canto, artista o tono…'
              : 'Buscar cadena, autor o canción…'
          }
          className="w-full max-w-2xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      {tab === 'cantos' ? (
        <CommunitySongsPanel search={search} />
      ) : loading ? (
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
            to={tab === 'following' ? '/comunidad?tab=cadenas' : '/listas'}
            className="text-gold text-sm font-semibold hover:underline"
            onClick={() => tab === 'following' && setTab('all')}
          >
            {tab === 'following' ? 'Explorar cadenas' : 'Ir a Mis Listas'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredLists.map((cadena) => {
            const owner = profilesById[cadena.owner_id];
            const ownerName = owner?.displayName || cadena.owner_name || 'Músico';
            return (
              <div
                key={cadena.id}
                className="glass-card p-4 sm:p-5 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  {cadena.owner_id ? (
                    <ProfileAvatar
                      profile={
                        owner ?? {
                          userId: cadena.owner_id,
                          displayName: ownerName,
                          avatarUrl: null,
                        }
                      }
                      size="md"
                    />
                  ) : (
                    <Link
                      to={`/comunidad/cadena/${cadena.slug}`}
                      className="p-2 rounded-lg bg-gold/10 text-gold shrink-0"
                    >
                      <ListMusic className="w-5 h-5" />
                    </Link>
                  )}
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
                          {ownerName}
                        </Link>
                      ) : (
                        ownerName
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
            );
          })}
        </div>
      )}
    </div>
  );
}
