import { ChevronLeft, ChevronRight, ListMusic } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SetlistNavProps {
  currentSongId: string;
  listSongIds: string[];
  listId?: string;
  onNavigate: (newSongId: string) => void;
  position?: 'top' | 'bottom';
}

/**
 * Navegación de canción anterior/siguiente dentro de una lista.
 * Se renderiza tanto arriba como abajo del SongView para máxima comodidad en vivo.
 */
export default function SetlistNav({
  currentSongId,
  listSongIds,
  listId,
  onNavigate,
  position = 'top',
}: SetlistNavProps) {
  const { songs, lists } = useApp();

  if (!listSongIds || listSongIds.length < 2) return null;

  const idx = listSongIds.indexOf(currentSongId);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < listSongIds.length - 1;

  const prevSong = hasPrev ? songs.find(s => s.id === listSongIds[idx - 1]) : null;
  const nextSong = hasNext ? songs.find(s => s.id === listSongIds[idx + 1]) : null;
  const list = listId ? lists.find(l => l.id === listId) : null;

  return (
    <div
      className={`flex items-stretch gap-2 ${
        position === 'top' ? 'mb-4' : 'mt-6'
      }`}
    >
      <button
        onClick={() => hasPrev && prevSong && onNavigate(prevSong.id)}
        disabled={!hasPrev}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground hover:border-gold hover:bg-gold/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-secondary/40 text-left min-w-0"
      >
        <ChevronLeft className="w-4 h-4 text-gold shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            Anterior
          </p>
          <p className="text-xs font-medium truncate">
            {prevSong?.title || '—'}
          </p>
        </div>
      </button>

      <div className="flex flex-col items-center justify-center px-3 rounded-xl border border-gold/30 bg-gold/5 min-w-[80px]">
        <ListMusic className="w-3.5 h-3.5 text-gold" />
        <p className="text-[9px] uppercase tracking-widest text-gold/70 font-bold mt-0.5">
          {list?.name || 'Setlist'}
        </p>
        <p className="text-xs font-mono text-gold font-bold">
          {idx + 1} / {listSongIds.length}
        </p>
      </div>

      <button
        onClick={() => hasNext && nextSong && onNavigate(nextSong.id)}
        disabled={!hasNext}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground hover:border-gold hover:bg-gold/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-secondary/40 text-right min-w-0"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            Siguiente
          </p>
          <p className="text-xs font-medium truncate">
            {nextSong?.title || '—'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gold shrink-0" />
      </button>
    </div>
  );
}
