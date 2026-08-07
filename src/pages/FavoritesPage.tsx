import { useApp } from '@/context/AppContext';
import SongCard from '@/components/SongCard';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { songs, favorites } = useApp();
  const favSongs = songs.filter(s => favorites.includes(s.id));

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Favoritos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Tus canciones marcadas como favoritas</p>
      </div>

      {favSongs.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aún no tienes favoritos</p>
          <p className="text-sm text-muted-foreground mt-1">Marca canciones con el corazón para verlas aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {favSongs.map(song => <SongCard key={song.id} song={song} />)}
        </div>
      )}
    </div>
  );
}
