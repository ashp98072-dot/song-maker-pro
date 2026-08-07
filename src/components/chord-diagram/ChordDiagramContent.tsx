import type { ChordDiagramResult } from '@/utils/chordDiagrams';

export function GuitarDiagram({
  frets,
  barFret,
  startFret = 0,
  scale = 1,
  stringCount,
}: {
  frets: number[];
  barFret?: number;
  startFret?: number;
  scale?: number;
  /** 6 = guitar, 4 = bass (E A D G) */
  stringCount?: number;
}) {
  const numFrets = 4;
  const strings = stringCount ?? frets.length ?? 6;
  const w = 80 * scale;
  const h = 90 * scale;
  const sx = 10 * scale;
  const sy = 15 * scale;
  const sw = 60 * scale;
  const sh = 70 * scale;
  const stringGap = strings > 1 ? sw / (strings - 1) : 0;
  const fretGap = sh / numFrets;
  const shown = frets.slice(0, strings);

  return (
    <svg width={w} height={h + 10 * scale} viewBox={`0 0 ${w} ${h + 10 * scale}`} className="block overflow-visible">
      {startFret > 0 && (
        <text x={2} y={sy + fretGap / 2 + 4} className="fill-muted-foreground" fontSize={8 * scale}>
          {startFret}
        </text>
      )}
      <line x1={sx} y1={sy} x2={sx + sw} y2={sy} stroke="hsl(var(--foreground))" strokeWidth={startFret > 0 ? 1 : 3} />
      {Array.from({ length: numFrets }, (_, i) => (
        <line
          key={i}
          x1={sx}
          y1={sy + (i + 1) * fretGap}
          x2={sx + sw}
          y2={sy + (i + 1) * fretGap}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: strings }, (_, i) => (
        <line
          key={i}
          x1={sx + i * stringGap}
          y1={sy}
          x2={sx + i * stringGap}
          y2={sy + sh}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={0.8}
        />
      ))}
      {barFret !== undefined && (
        <rect
          x={sx}
          y={sy + (barFret - (startFret || 0)) * fretGap - fretGap / 2 - 3}
          width={sw}
          height={6}
          rx={3}
          fill="hsl(var(--gold))"
          opacity={0.7}
        />
      )}
      {shown.map((f, i) => {
        if (f === -1)
          return (
            <text key={i} x={sx + i * stringGap} y={10} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
              ×
            </text>
          );
        if (f === 0)
          return (
            <circle
              key={i}
              cx={sx + i * stringGap}
              cy={10}
              r={3}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth={1}
            />
          );
        const displayFret = f - (startFret || 0);
        return (
          <circle
            key={i}
            cx={sx + i * stringGap}
            cy={sy + displayFret * fretGap - fretGap / 2}
            r={5 * scale}
            fill="hsl(var(--gold))"
          />
        );
      })}
    </svg>
  );
}

export function PianoDiagram({ keys }: { keys: string[] }) {
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackKeys: Record<string, number> = {
    'C#': 0,
    Db: 0,
    'D#': 1,
    Eb: 1,
    'F#': 3,
    Gb: 3,
    'G#': 4,
    Ab: 4,
    'A#': 5,
    Bb: 5,
  };
  const kw = 14;
  const kh = 50;
  const bw = 10;
  const bh = 32;

  const isHighlighted = (note: string) => keys.includes(note);
  const isBlackHighlighted = (note: string) => {
    const aliases: Record<string, string> = {
      'C#': 'Db',
      Db: 'C#',
      'D#': 'Eb',
      Eb: 'D#',
      'F#': 'Gb',
      Gb: 'F#',
      'G#': 'Ab',
      Ab: 'G#',
      'A#': 'Bb',
      Bb: 'A#',
    };
    return keys.includes(note) || keys.includes(aliases[note] || '');
  };

  return (
    <svg width={7 * kw + 2} height={kh + 4} viewBox={`0 0 ${7 * kw + 2} ${kh + 4}`} className="block overflow-visible">
      {whiteKeys.map((k, i) => (
        <rect
          key={k}
          x={i * kw + 1}
          y={1}
          width={kw - 1}
          height={kh}
          rx={2}
          fill={isHighlighted(k) ? 'hsl(var(--gold))' : 'hsl(var(--foreground))'}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          opacity={isHighlighted(k) ? 1 : 0.9}
        />
      ))}
      {Object.entries(blackKeys)
        .filter(([n]) => !n.includes('b'))
        .map(([note, pos]) => (
          <rect
            key={note}
            x={pos * kw + kw - bw / 2 + 1}
            y={1}
            width={bw}
            height={bh}
            rx={1}
            fill={isBlackHighlighted(note) ? 'hsl(var(--gold))' : 'hsl(var(--background))'}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />
        ))}
    </svg>
  );
}

type ChordDiagramContentProps = {
  chord: string;
  diagram: ChordDiagramResult;
  scale?: number;
  showExpandAction?: boolean;
  onExpand?: () => void;
  /** Focus one instrument in the detail view */
  instrument?: 'guitar' | 'piano' | 'bass' | 'all';
};

export function ChordDiagramContent({
  chord,
  diagram,
  scale = 1,
  showExpandAction = true,
  onExpand,
  instrument = 'all',
}: ChordDiagramContentProps) {
  const hasGuitar = diagram.guitar.frets.some((f) => f >= 0);
  const bassFrets = diagram.guitar.frets.slice(0, 4);
  const hasBass = bassFrets.some((f) => f >= 0);
  const showGuitar = instrument === 'all' || instrument === 'guitar';
  const showBass = instrument === 'all' || instrument === 'bass';
  const showPiano = instrument === 'all' || instrument === 'piano';

  return (
    <>
      <p className="text-xs font-bold text-gold mb-1 text-center">{chord}</p>
      {diagram.approximate && (
        <p className="text-[10px] text-amber-300/80 text-center mb-2">Voicing aproximado</p>
      )}
      {diagram.matchType && diagram.matchType !== 'exact' && !diagram.approximate && (
        <p className="text-[10px] text-muted-foreground text-center mb-2 capitalize">
          {diagram.matchType}
        </p>
      )}
      <div className="flex gap-4 items-start justify-center flex-wrap">
        {showGuitar && hasGuitar && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 text-center">Guitarra</p>
            <GuitarDiagram
              frets={diagram.guitar.frets}
              barFret={diagram.guitar.barFret}
              startFret={diagram.guitar.startFret}
              scale={scale}
              stringCount={6}
            />
          </div>
        )}
        {showBass && hasBass && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 text-center">Bajo (E A D G)</p>
            <GuitarDiagram
              frets={bassFrets}
              barFret={diagram.guitar.barFret}
              startFret={diagram.guitar.startFret}
              scale={scale}
              stringCount={4}
            />
          </div>
        )}
        {showPiano && diagram.piano.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 text-center">Piano</p>
            <PianoDiagram keys={diagram.piano} />
            <p className="text-[10px] text-muted-foreground text-center mt-1 font-mono">
              {diagram.piano.join(' · ')}
            </p>
          </div>
        )}
      </div>
      {showExpandAction && onExpand && (
        <button
          type="button"
          className="mt-3 w-full py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          Ampliar diagrama
        </button>
      )}
    </>
  );
}
