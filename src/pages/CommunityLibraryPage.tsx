import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Search, Globe, Plus, Eye, Star, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song } from '@/types/music';
import { toast } from 'sonner';
import { matchesSearch } from '@/utils/textNormalize';
import { browseCatalogSongs } from '@/features/song-discovery/browseSongs';
import { getSongPath } from '@/utils/songSlug';
import SongCard from '@/components/SongCard';

const COMMUNITY_STORAGE_KEY = 'worship-community-songs';
const COMMUNITY_RATINGS_KEY = 'worship-community-ratings';

interface CommunityRatings {
  [songId: string]: { stars: number; count: number; verified: boolean };
}

function getCommunityLibrary(): Song[] {
  try {
    const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveCommunityLibrary(songs: Song[]) {
  localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(songs));
}

function getRatings(): CommunityRatings {
  try {
    const saved = localStorage.getItem(COMMUNITY_RATINGS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveRatings(ratings: CommunityRatings) {
  localStorage.setItem(COMMUNITY_RATINGS_KEY, JSON.stringify(ratings));
}

export function publishSongToLibrary(song: Song) {
  const lib = getCommunityLibrary();
  if (!lib.find(s => s.id === song.id)) {
    lib.push({ ...song, isPopular: false });
    saveCommunityLibrary(lib);
  }
}

export default function CommunityLibraryPage() {
  const { songs, addSong } = useApp();
  const [search, setSearch] = useState('');
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [ratings, setRatings] = useState<CommunityRatings>(getRatings);

  const communitySongs = useMemo(() => getCommunityLibrary(), []);
  
  const filtered = useMemo(() => {
    const published = [...communitySongs].sort((a, b) => {
      const rA = ratings[a.id]?.stars || 0;
      const rB = ratings[b.id]?.stars || 0;
      const vA = ratings[a.id]?.verified ? 1 : 0;
      const vB = ratings[b.id]?.verified ? 1 : 0;
      return (vB - vA) || (rB - rA);
    });
    if (published.length > 0) {
      if (!search) return published;
      return published.filter(s =>
        matchesSearch(s.title, search) ||
        matchesSearch(s.artist, search) ||
        matchesSearch(s.originalKey, search)
      );
    }
    // Fallback: global cloud catalog when nobody published to local community yet
    return browseCatalogSongs(songs, search);
  }, [communitySongs, search, ratings, songs]);

  const usingGlobalCatalog = communitySongs.length === 0;

  const isInMyRepertoire = (songId: string) => songs.some(s => s.id === songId || s.title === communitySongs.find(cs => cs.id === songId)?.title);

  const addToRepertoire = (song: Song) => {
    const newSong: Song = { ...song, id: `community-${Date.now()}`, isPopular: false };
    addSong(newSong);
    toast.success(`"${song.title}" agregada a tu repertorio`);
  };

  const rateSong = (songId: string, star: number) => {
    const updated = { ...ratings };
    const existing = updated[songId] || { stars: 0, count: 0, verified: false };
    const newCount = existing.count + 1;
    const newStars = ((existing.stars * existing.count) + star) / newCount;
    updated[songId] = { stars: Math.round(newStars * 10) / 10, count: newCount, verified: newStars >= 4 && newCount >= 3 };
    setRatings(updated);
    saveRatings(updated);
    toast.success(`Calificaste con ${star} ⭐`);
  };

  const StarRating = ({ songId }: { songId: string }) => {
    const r = ratings[songId];
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={(e) => { e.stopPropagation(); rateSong(songId, s); }}
            className="hover:scale-125 transition-transform">
            <Star className={`w-3.5 h-3.5 ${r && r.stars >= s ? 'text-gold fill-gold' : 'text-muted-foreground'}`} />
          </button>
        ))}
        {r && <span className="text-[10px] text-muted-foreground ml-1">({r.count})</span>}
        {r?.verified && <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))] ml-1" />}
      </div>
    );
  };

  return (
    <div className="container px-4 py-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-6 h-6 text-gold" />
          <h1 className="text-2xl font-bold font-display text-foreground">Biblioteca Comunitaria</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {usingGlobalCatalog
            ? 'Explora el catálogo compartido. Busca por título o artista.'
            : 'Descubre canciones compartidas por otros músicos. Las mejor calificadas aparecen primero.'}
        </p>
      </motion.div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en la biblioteca global por título, artista o tono..."
          className="w-full max-w-2xl pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      </div>

      {previewSong && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewSong(null)}>
          <div className="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-foreground">{previewSong.title}</h2>
                <p className="text-muted-foreground text-sm">{previewSong.artist} • Tono: {previewSong.originalKey}</p>
              </div>
              <button onClick={() => setPreviewSong(null)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="mb-3"><StarRating songId={previewSong.id} /></div>
            <pre className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap">{previewSong.chords}</pre>
            <div className="flex gap-3 mt-4 pt-4 border-t border-border">
              <button onClick={() => { addToRepertoire(previewSong); setPreviewSong(null); }}
                className="flex-1 py-2.5 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar a Mi Repertorio
              </button>
              <button onClick={() => setPreviewSong(null)}
                className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">
            {search ? 'No se encontraron canciones con ese criterio.' : 'La biblioteca está vacía.'}
          </p>
        </div>
      ) : usingGlobalCatalog ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(song => (
            <div key={song.id} className="glass-card p-4 hover:bg-surface-hover transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={getSongPath(song, songs)} className="font-semibold text-foreground truncate hover:text-gold">
                      {song.title}
                    </Link>
                    {ratings[song.id]?.verified && <CheckCircle className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tono: {song.originalKey}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                    song.originalGender === 'male' ? 'border-[hsl(199,89%,48%)] text-[hsl(199,89%,48%)]' : 'border-[hsl(330,81%,60%)] text-[hsl(330,81%,60%)]'
                  }`}>
                    {song.originalGender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
                <StarRating songId={song.id} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreviewSong(song)}
                  className="flex-1 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> Vista Previa
                </button>
                <button onClick={() => addToRepertoire(song)}
                  disabled={isInMyRepertoire(song.id)}
                  className="flex-1 py-1.5 rounded-lg gold-gradient text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1 transition-opacity">
                  <Plus className="w-3 h-3" /> {isInMyRepertoire(song.id) ? 'Ya agregada' : 'Agregar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
