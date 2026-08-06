import { Song } from '@/types/music';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { getSongPath } from '@/utils/songSlug';

interface SongCardProps {
  song: Song;
}

export default function SongCard({ song }: SongCardProps) {
  const { songs } = useApp();
  // Priorizamos el tono personalizado (key) sobre el original
  const currentKey = song.key || song.originalKey;
  
  // Determinamos si el tono actual es menor (buscando la 'm')
  // Esto sirve como respaldo visual si scaleMode no se actualizó
  const isMinor = song.scaleMode === 'minor' || currentKey.toLowerCase().includes('m');

  return (
    <Link to={getSongPath(song, songs)} className="glass-card p-4 hover:bg-surface-hover transition-colors group block">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-gold transition-colors">
            {song.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        </div>
        {song.isPopular && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full gold-gradient text-primary-foreground shrink-0">
            Popular
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        {/* Tono Dorado: Si song.key existe, significa que el usuario lo cambió */}
        <span className={`text-xs font-bold ${song.key ? 'text-gold' : 'text-muted-foreground'}`}>
          Tono: {currentKey}
        </span>

        {/* Género: Azul para hombre, Rosa para mujer */}
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
          song.originalGender === 'male' 
            ? 'border-[hsl(199,89%,48%)] text-[hsl(199,89%,48%)]' 
            : 'border-[hsl(330,81%,60%)] text-[hsl(330,81%,60%)]'
        }`}>
          {song.originalGender === 'male' ? '♂ Hombre' : '♀ Mujer'}
        </span>

        {/* Etiqueta de Escala: Púrpura "Mágico" si es menor */}
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border transition-all ${
          isMinor 
            ? 'border-magic text-magic bg-magic/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
            : 'border-border text-muted-foreground'
        }`}>
          {isMinor ? 'Menor' : 'Mayor'}
        </span>
      </div>
    </Link>
  );
}
