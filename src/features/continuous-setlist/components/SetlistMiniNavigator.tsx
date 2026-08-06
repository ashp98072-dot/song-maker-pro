import { useMemo, useState } from 'react';
import { ListMusic, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { matchesSearch } from '@/utils/textNormalize';
import type { SetlistSongEntry } from '@/features/continuous-setlist/types';

export interface SetlistMiniNavigatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: SetlistSongEntry[];
  currentSongId: string;
  onJump: (songId: string) => void;
}

export function SetlistMiniNavigator({
  open,
  onOpenChange,
  entries,
  currentSongId,
  onJump,
}: SetlistMiniNavigatorProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    return entries.filter(
      ({ song }) =>
        matchesSearch(song.title, query) || matchesSearch(song.artist, query)
    );
  }, [entries, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] p-0 gap-0 z-[140]">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListMusic className="w-5 h-5 text-gold" />
            Saltar a canción
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary border border-border text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.map(({ song, index }) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => {
                  onJump(song.id);
                  onOpenChange(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/80 ${
                  song.id === currentSongId ? 'bg-gold/10 text-gold border-l-2 border-gold' : ''
                }`}
              >
                <span className="font-mono text-[10px] text-muted-foreground mr-2">
                  {index + 1}
                </span>
                <span className="font-medium">{song.title}</span>
                <span className="text-muted-foreground text-xs ml-1">· {song.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
