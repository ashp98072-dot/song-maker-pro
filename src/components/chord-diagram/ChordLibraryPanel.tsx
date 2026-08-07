import { useMemo, useState } from 'react';
import { Library, Search } from 'lucide-react';
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
};

export function ChordLibraryPanel({ compact = false, className = '' }: Props) {
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

  return (
    <div className={className} data-chord-library>
      <div className="flex items-center gap-2 mb-3">
        <Library className="w-4 h-4 text-gold shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Biblioteca de acordes</p>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {catalog.length} · {INSTRUMENTS.find((i) => i.id === instrument)?.label}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => {
              setInstrument(inst.id);
              setSelected(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
              instrument === inst.id
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {inst.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar (Am7, F#, Bb…)"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2 pb-0.5">
        <button
          type="button"
          onClick={() => setRoot('all')}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
            root === 'all' ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'
          }`}
        >
          Todas
        </button>
        {ROOTS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoot(r)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${
              root === r ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-0.5">
        {QUALITIES.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuality(q.id)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              quality === q.id
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-muted-foreground'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay acordes con ese filtro.
        </p>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${
            compact ? 'max-h-[min(42vh,320px)]' : 'max-h-[min(55vh,480px)]'
          } overflow-y-auto pr-1`}
        >
          {filtered.map((name) => {
            const diagram = getChordDiagram(name);
            if (!diagram) return null;
            return (
              <button
                key={`${instrument}-${name}`}
                type="button"
                onClick={() => setSelected(name)}
                className="rounded-xl border border-border bg-secondary/40 hover:bg-secondary hover:border-gold/40 p-2 text-left transition-colors"
              >
                <p className="text-xs font-bold text-gold text-center mb-1 truncate">{name}</p>
                {instrument === 'piano' ? (
                  <div className="flex flex-col items-center gap-1 py-1">
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
                      scale={0.85}
                      stringCount={4}
                    />
                  </div>
                ) : diagram.guitar.frets.some((f) => f >= 0) ? (
                  <div className="flex justify-center">
                    <GuitarDiagram
                      frets={diagram.guitar.frets}
                      barFret={diagram.guitar.barFret}
                      startFret={diagram.guitar.startFret}
                      scale={0.85}
                      stringCount={6}
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4">Sin diagrama</p>
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
