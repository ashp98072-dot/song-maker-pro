import type { ReactNode } from 'react';

type ChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function FilterChip({ active, label, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? 'bg-gold/15 border-gold text-gold'
          : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

/** Horizontal chip scroller with visible scrollbar (mouse + touch). */
export function FilterChipScroller({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 w-full">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 font-bold pt-2 w-14">
          {label}
        </span>
        <div
          className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:hsl(var(--gold)/0.45)_transparent]"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="flex items-center gap-2 w-max pr-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

type CatalogFilterBarProps = {
  keys: string[];
  artists: string[];
  keyFilter: string | null;
  artist: string | null;
  onKeyChange: (key: string | null) => void;
  onArtistChange: (artist: string | null) => void;
  onClear?: () => void;
  /** Optional genre chips (community only). */
  genres?: string[];
  genre?: string | null;
  onGenreChange?: (genre: string | null) => void;
  genreLabel?: (id: string) => string;
};

/**
 * Catalog filters: tono as scrollable chips, artista as full select (all names reachable).
 */
export function CatalogFilterBar({
  keys,
  artists,
  keyFilter,
  artist,
  onKeyChange,
  onArtistChange,
  onClear,
  genres,
  genre,
  onGenreChange,
  genreLabel,
}: CatalogFilterBarProps) {
  const hasFilters = !!(keyFilter || artist || genre);

  return (
    <div className="space-y-3 mb-6 min-w-0">
      {genres && genres.length > 0 && onGenreChange && (
        <FilterChipScroller label="Género">
          <FilterChip active={!genre} label="Todos" onClick={() => onGenreChange(null)} />
          {genres.map((id) => (
            <FilterChip
              key={id}
              active={genre === id}
              label={genreLabel ? genreLabel(id) : id}
              onClick={() => onGenreChange(genre === id ? null : id)}
            />
          ))}
        </FilterChipScroller>
      )}

      {keys.length > 0 && (
        <FilterChipScroller label="Tono">
          <FilterChip active={!keyFilter} label="Todos" onClick={() => onKeyChange(null)} />
          {keys.map((k) => (
            <FilterChip
              key={k}
              active={keyFilter === k}
              label={k}
              onClick={() => onKeyChange(keyFilter === k ? null : k)}
            />
          ))}
        </FilterChipScroller>
      )}

      {artists.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 font-bold w-14">
            Artista
          </span>
          <select
            value={artist ?? ''}
            onChange={(e) => onArtistChange(e.target.value || null)}
            className="flex-1 min-w-0 max-w-xl px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los artistas</option>
            {artists.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasFilters && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gold hover:underline font-medium"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
