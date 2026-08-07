import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
  { id: 'guitar' as const, label: 'Guitarra' },
  { id: 'piano' as const, label: 'Piano' },
  { id: 'bass' as const, label: 'Bajo' },
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
  const selectClass =
    'h-10 rounded-lg bg-secondary border border-border text-foreground text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className={className} data-chord-library>
      {!hideHeader && (
        <p className="text-sm font-semibold text-foreground mb-3">Biblioteca de acordes</p>
      )}

      {/* Instrument — single compact row */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 mb-4">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => {
              setInstrument(inst.id);
              setSelected(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              instrument === inst.id
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {inst.label}
          </button>
        ))}
      </div>

      {/* Search + filters in one band */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar acorde…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-[220px] shrink-0">
          <select
            value={root}
            onChange={(e) => setRoot(e.target.value as string | 'all')}
            className={selectClass}
            aria-label="Tono"
          >
            <option value="all">Tono</option>
            {ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className={selectClass}
            aria-label="Tipo"
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        {filtered.length} acordes
        {(root !== 'all' || quality !== 'all' || query.trim()) && (
          <button
            type="button"
            className="ml-2 text-gold hover:underline"
            onClick={() => {
              setRoot('all');
              setQuality('all');
              setQuery('');
            }}
          >
            Limpiar
          </button>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No hay acordes con ese filtro.
        </p>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 ${
            compact ? 'max-h-[min(50vh,360px)]' : 'max-h-[min(70vh,560px)]'
          } overflow-y-auto pr-0.5`}
        >
          {filtered.map((name) => {
            const diagram = getChordDiagram(name);
            if (!diagram) return null;
            return (
              <button
                key={`${instrument}-${name}`}
                type="button"
                onClick={() => setSelected(name)}
                className="rounded-xl border border-border/80 bg-background/40 hover:border-gold/40 hover:bg-secondary/50 p-2.5 text-left transition-colors"
              >
                <p className="text-xs font-bold text-gold text-center mb-1.5 truncate">{name}</p>
                {instrument === 'piano' ? (
                  <div className="flex flex-col items-center gap-1">
                    <PianoDiagram keys={diagram.piano} />
                    <p className="text-[9px] text-muted-foreground font-mono text-center">
                      {diagram.piano.join(' ')}
                    </p>
                  </div>
                ) : instrument === 'bass' ? (
                  <div className="flex justify-center">
                    <GuitarDiagram
                      frets={diagram.guitar.frets.slice(0, 4)}
                      barFret={diagram.guitar.barFret}
                      startFret={diagram.guitar.startFret}
                      scale={0.9}
                      stringCount={4}
                    />
                  </div>
                ) : diagram.guitar.frets.some((f) => f >= 0) ? (
                  <div className="flex justify-center">
                    <GuitarDiagram
                      frets={diagram.guitar.frets}
                      barFret={diagram.guitar.barFret}
                      startFret={diagram.guitar.startFret}
                      scale={0.9}
                      stringCount={6}
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-6">Sin diagrama</p>
                )}
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
