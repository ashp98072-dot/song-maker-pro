import { useMemo, useState } from 'react';
import { Guitar, Music2, Piano, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  getChordDiagram,
  listBassChordNames,
  listKnownChordNames,
  listPianoChordNames,
} from '@/utils/chordDiagrams';
import { GuitarDiagram, PianoDiagram } from '@/components/chord-diagram/ChordDiagramContent';
import { ChordDiagramModal } from '@/components/chord-diagram/ChordDiagramModal';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const INSTRUMENTS = [
  { id: 'guitar' as const, label: 'Guitarra', Icon: Guitar },
  { id: 'piano' as const, label: 'Piano', Icon: Piano },
  { id: 'bass' as const, label: 'Bajo', Icon: Music2 },
];

const QUALITIES: { id: string; label: string; match: (name: string) => boolean }[] = [
  { id: 'all', label: 'Todos', match: () => true },
  {
    id: 'maj',
    label: 'Mayores',
    match: (n) => {
      const quality = n.replace(/^[A-G][#b]?/, '').split('/')[0];
      return quality === '';
    },
  },
  {
    id: 'min',
    label: 'Menores',
    match: (n) => {
      const quality = n.replace(/^[A-G][#b]?/, '').split('/')[0];
      return /^m(?!aj)/.test(quality);
    },
  },
  { id: '7', label: '7ª', match: (n) => /7|9|11|13/.test(n) },
  { id: 'sus', label: 'Sus', match: (n) => /sus/.test(n) },
  { id: 'slash', label: 'Inversiones', match: (n) => n.includes('/') },
];

function chordRoot(name: string): string {
  const m = name.match(/^[A-G][#b]?/);
  return m ? m[0] : '';
}

function hasGuitarShape(frets: number[]): boolean {
  return frets.some((f) => f >= 0);
}

type InstrumentId = (typeof INSTRUMENTS)[number]['id'];

type Props = {
  compact?: boolean;
  className?: string;
  /** Hide internal title when page already has one */
  hideHeader?: boolean;
};

export function ChordLibraryPanel({
  compact = false,
  className = '',
  hideHeader = false,
}: Props) {
  const [instrument, setInstrument] = useState<InstrumentId>('guitar');
  const [query, setQuery] = useState('');
  const [root, setRoot] = useState<string | 'all'>('all');
  const [quality, setQuality] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  const catalog = useMemo(() => {
    if (instrument === 'piano') return listPianoChordNames();
    if (instrument === 'bass') return listBassChordNames();
    return listKnownChordNames();
  }, [instrument]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qualityFn = QUALITIES.find((x) => x.id === quality)?.match ?? (() => true);
    return catalog.filter((name) => {
      if (root !== 'all' && chordRoot(name) !== root) return false;
      if (!qualityFn(name)) return false;
      if (q && !name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, query, root, quality]);

  const selectedDiagram = selected ? getChordDiagram(selected) : null;
  const filtersActive = root !== 'all' || quality !== 'all' || query.trim().length > 0;

  const clearFilters = () => {
    setRoot('all');
    setQuality('all');
    setQuery('');
  };

  return (
    <div className={className} data-chord-library>
      {!hideHeader && (
        <p className="text-sm font-semibold text-foreground mb-3">Biblioteca de acordes</p>
      )}

      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-sm p-3 sm:p-4 mb-4 space-y-3 shadow-sm">
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/70">
          {INSTRUMENTS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setInstrument(id);
                setSelected(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                instrument === id
                  ? 'bg-background text-gold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar acorde…"
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-background/70 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query ? (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
            Tono
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setRoot('all')}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                root === 'all'
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'bg-background/50 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {ROOTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoot(r)}
                className={`shrink-0 h-8 min-w-8 px-2.5 rounded-full text-xs font-semibold border transition-colors ${
                  root === r
                    ? 'bg-gold/15 border-gold/40 text-gold'
                    : 'bg-background/50 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Tipo
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuality(q.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                  quality === q.id
                    ? 'bg-gold/15 border-gold/40 text-gold'
                    : 'bg-background/50 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
          acordes
          {instrument === 'guitar' ? ' · guitarra' : instrument === 'bass' ? ' · bajo' : ' · piano'}
        </p>
        {filtersActive ? (
          <button
            type="button"
            className="text-xs font-semibold text-gold hover:underline"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="text-sm text-muted-foreground">No hay acordes con ese filtro.</p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-gold hover:underline"
            onClick={clearFilters}
          >
            Restablecer
          </button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 ${
            compact ? 'max-h-[min(50vh,360px)] overflow-y-auto pr-0.5' : ''
          }`}
        >
          {filtered.map((name) => {
            const diagram = getChordDiagram(name);
            if (!diagram) return null;
            const guitarOk = hasGuitarShape(diagram.guitar.frets);
            const bassOk = hasGuitarShape(diagram.guitar.frets.slice(0, 4));

            return (
              <button
                key={`${instrument}-${name}`}
                type="button"
                onClick={() => setSelected(name)}
                className="group rounded-2xl border border-border/70 bg-gradient-to-b from-background/80 to-secondary/20 hover:border-gold/45 hover:shadow-[0_8px_24px_-12px_hsl(var(--gold)/0.35)] p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-sm font-bold font-display text-gold truncate leading-none">
                    {name}
                  </p>
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Ver
                  </span>
                </div>

                <div className="rounded-xl bg-background/60 border border-border/50 py-2.5 px-1 min-h-[6.5rem] flex items-center justify-center">
                  {instrument === 'piano' ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <PianoDiagram keys={diagram.piano} />
                      <p className="text-[9px] text-muted-foreground font-mono text-center leading-tight px-1">
                        {diagram.piano.join(' · ')}
                      </p>
                    </div>
                  ) : instrument === 'bass' && bassOk ? (
                    <GuitarDiagram
                      frets={diagram.guitar.frets.slice(0, 4)}
                      barFret={diagram.guitar.barFret}
                      startFret={diagram.guitar.startFret}
                      scale={1.05}
                      stringCount={4}
                    />
                  ) : instrument === 'guitar' && guitarOk ? (
                    <GuitarDiagram
                      frets={diagram.guitar.frets}
                      barFret={diagram.guitar.barFret}
                      startFret={diagram.guitar.startFret}
                      scale={1.05}
                      stringCount={6}
                    />
                  ) : diagram.piano.length > 0 ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <p className="text-[9px] font-medium text-muted-foreground">Teclado</p>
                      <PianoDiagram keys={diagram.piano} />
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground text-center py-4">
                      Sin diagrama
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && selectedDiagram && (
        <ChordDiagramModal
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          chord={selected}
          diagram={selectedDiagram}
          instrument={instrument}
        />
      )}
    </div>
  );
}
