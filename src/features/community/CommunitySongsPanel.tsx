import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Music2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import {
  COMMUNITY_GENRES,
  fetchPublicSongs,
  filterCommunitySongs,
  genreLabel,
  type CommunityGenreId,
} from '@/features/community';
import { findLibraryDuplicate } from '@/features/song-import';
import { CatalogFilterBar } from '@/features/song-discovery/CatalogFilterBar';
import { getSongPath } from '@/utils/songSlug';
import type { Song } from '@/types/music';

type Props = {
  search: string;
};

/**
 * Browse public_songs: filter by genre/key/artist and copy into personal library.
 */
export function CommunitySongsPanel({ search }: Props) {
  const { songs, addSong, isGuest } = useApp();
  const [catalog, setCatalog] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState<string | null>(null);
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchPublicSongs(400);
        if (!cancelled) setCatalog(list);
      } catch {
        if (!cancelled) {
          setCatalog([]);
          toast.error('No se pudieron cargar los cantos públicos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => {
    const keys = new Set<string>();
    const artists = new Set<string>();
    for (const s of catalog) {
      const k = (s.originalKey || s.key || '').trim();
      if (k) keys.add(k);
      if (s.artist?.trim()) artists.add(s.artist.trim());
    }
    return {
      keys: [...keys].sort((a, b) => a.localeCompare(b, 'es')),
      artists: [...artists].sort((a, b) => a.localeCompare(b, 'es')),
      genres: COMMUNITY_GENRES.map((g) => g.id),
    };
  }, [catalog]);

  const filtered = useMemo(
    () =>
      filterCommunitySongs(catalog, {
        search,
        genre,
        key: keyFilter,
        artist,
      }).slice(0, 120),
    [catalog, search, genre, keyFilter, artist]
  );

  const libraryHas = (song: Song) =>
    !!songs.find((s) => s.id === song.id) || !!findLibraryDuplicate(songs, song.title, song.artist);

  const handleAdd = async (song: Song) => {
    if (isGuest) {
      toast.error('Inicia sesión para guardar cantos');
      return;
    }
    if (libraryHas(song)) {
      toast.message('Ya está en tu biblioteca');
      return;
    }
    setAddingId(song.id);
    try {
      await addSong({ ...song, isNew: true });
      toast.success(`“${song.title}” añadida`);
    } catch {
      toast.error('No se pudo añadir');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Cargando cantos…
      </div>
    );
  }

  if (!catalog.length) {
    return (
      <div className="text-center py-16">
        <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground mb-2">Aún no hay cantos públicos.</p>
        <p className="text-xs text-muted-foreground">
          Publícalos desde Agregar canción o Importar catálogo (admin).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CatalogFilterBar
        keys={facets.keys}
        artists={facets.artists}
        keyFilter={keyFilter}
        artist={artist}
        onKeyChange={setKeyFilter}
        onArtistChange={setArtist}
        genres={facets.genres}
        genre={genre}
        onGenreChange={setGenre}
        genreLabel={(id) => genreLabel(id as CommunityGenreId)}
        onClear={() => {
          setGenre(null);
          setKeyFilter(null);
          setArtist(null);
        }}
      />

      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> cantos
        {catalog.length > filtered.length ? ` (de ${catalog.length})` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No hay cantos con ese filtro.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {filtered.map((song) => {
            const owned = libraryHas(song);
            const path = getSongPath(song, owned ? songs : [song, ...songs]);
            return (
              <li
                key={song.id}
                className="rounded-2xl border border-border/70 bg-card/40 p-3.5 flex gap-3 items-start hover:border-gold/35 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={path}
                    state={{ seedSong: song }}
                    className="font-semibold text-foreground hover:text-gold truncate block"
                  >
                    {song.title}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {song.artist}
                    {song.originalKey ? ` · ${song.originalKey}` : ''}
                    {song.genre ? ` · ${genreLabel(song.genre)}` : ''}
                  </p>
                </div>
                {owned ? (
                  <span className="shrink-0 h-9 px-2.5 rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-gold" />
                    Tuya
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={addingId === song.id || isGuest}
                    onClick={() => void handleAdd(song)}
                    className="shrink-0 h-9 px-2.5 rounded-lg border border-gold/40 text-gold text-[11px] font-semibold hover:bg-gold/10 disabled:opacity-50 inline-flex items-center gap-1"
                    title={isGuest ? 'Inicia sesión' : 'Añadir a mi biblioteca'}
                  >
                    {addingId === song.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Añadir
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
