import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Globe, Loader2, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { matchesSearch } from '@/utils/textNormalize';
import { fetchPublicLists, type PublicListRow } from '@/features/community';

/**
 * Comunidad = cadenas públicas (listas compartidas).
 * Las canciones se exploran en Inicio.
 */
export default function CommunityLibraryPage() {
  const [search, setSearch] = useState('');
  const [publicLists, setPublicLists] = useState<PublicListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const lists = await fetchPublicLists(80);
        if (!cancelled) setPublicLists(lists);
      } catch {
        if (!cancelled) setPublicLists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLists = useMemo(() => {
    const q = search.trim();
    if (!q) return publicLists;
    return publicLists.filter(
      (l) =>
        matchesSearch(l.name, q) ||
        matchesSearch(l.owner_name, q) ||
        l.songs.some((s) => matchesSearch(s.title, q) || matchesSearch(s.artist, q))
    );
  }, [publicLists, search]);

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
          Cadenas (listas) compartidas. Importa, comenta y visita perfiles de otros músicos.
        </p>
      </motion.div>

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
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-16">
          <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">
            {search
              ? 'No hay cadenas con ese criterio.'
              : 'Aún no hay cadenas públicas. Publica una desde Mis Listas.'}
          </p>
          <Link to="/listas" className="text-gold text-sm font-semibold hover:underline">
            Ir a Mis Listas
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
