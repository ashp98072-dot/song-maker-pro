import { Link } from 'react-router-dom';
import type { Song } from '@/types/music';
import { getSongPath } from '@/utils/songSlug';
import { relatedSongsByArtist } from '@/features/song-discovery/browseSongs';

type Props = {
  song: Song;
  catalog: Song[];
  limit?: number;
};

/** Compact related-song links for discovery under a song page. */
export function RelatedSongsSection({ song, catalog, limit = 6 }: Props) {
  const related = relatedSongsByArtist(song, catalog, limit);
  if (!related.length) return null;

  return (
    <section className="mt-8 border-t border-border pt-6" data-related-songs>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Más canciones
        {song.artist && song.artist !== 'Artista desconocido' ? ` · ${song.artist}` : ''}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {related.map((item) => (
          <li key={item.id}>
            <Link
              to={getSongPath(item, catalog)}
              className="block rounded-xl border border-border bg-secondary/30 px-3 py-2.5 transition-colors hover:border-gold/40 hover:bg-secondary/50"
            >
              <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.artist}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
