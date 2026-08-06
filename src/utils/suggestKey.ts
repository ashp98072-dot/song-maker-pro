// Analiza los acordes detectados y sugiere la tonalidad principal del canto.
// Estrategia: cuenta apariciones de raíces, pondera el primer y último acorde
// (suelen ser la tónica), y elige entre la candidata mayor o su relativa menor
// según cuál de las dos se repita más en posiciones fuertes.

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_RE = /\b([A-G][#b♯♭]?)((?:m(?:aj)?7?|dim|aug|sus[24]|add9|7|6|9|11|13|maj7|maj9)?)(?:\/[A-G][#b♯♭]?)?\b/g;

function normalizeRoot(root: string): string {
  const r = root.replace('♯', '#').replace('♭', 'b');
  // Convertimos bemoles a sus equivalentes sostenidos para contar consistentemente
  const flatToSharp: Record<string, string> = {
    Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
  };
  return flatToSharp[r] || r;
}

interface Detected {
  root: string;
  isMinor: boolean;
}

function extractChords(text: string): Detected[] {
  const out: Detected[] = [];
  let m: RegExpExecArray | null;
  // Reset regex
  CHORD_RE.lastIndex = 0;
  while ((m = CHORD_RE.exec(text)) !== null) {
    const root = normalizeRoot(m[1]);
    const suffix = m[2] || '';
    // Es menor si el sufijo empieza con "m" pero NO es "maj"
    const isMinor = /^m(?!aj)/.test(suffix);
    out.push({ root, isMinor });
  }
  return out;
}

/**
 * Devuelve la tonalidad sugerida en formato "C", "Am", "F#m", etc.
 * Si no detecta acordes, retorna null.
 */
export function suggestKey(chordsText: string): string | null {
  const chords = extractChords(chordsText);
  if (chords.length === 0) return null;

  // Tabla de puntos: cuenta ponderada por raíz y modo
  const score = new Map<string, number>(); // key = root + (isMinor?'m':'')
  const add = (root: string, isMinor: boolean, weight: number) => {
    const k = root + (isMinor ? 'm' : '');
    score.set(k, (score.get(k) || 0) + weight);
  };

  chords.forEach((c, i) => {
    let w = 1;
    if (i === 0) w += 2;             // primer acorde
    if (i === chords.length - 1) w += 3; // último acorde (resolución)
    add(c.root, c.isMinor, w);
  });

  // Selecciona el más puntuado
  let best: { key: string; score: number } | null = null;
  for (const [k, s] of score.entries()) {
    if (!best || s > best.score) best = { key: k, score: s };
  }
  if (!best) return null;

  // Validación tonal: si la candidata mayor X NO aparece en posición fuerte
  // pero su relativa menor (3 semitonos abajo) sí, preferimos la menor.
  const isMinor = best.key.endsWith('m');
  const root = isMinor ? best.key.slice(0, -1) : best.key;
  const idx = NOTES_SHARP.indexOf(root);
  if (idx === -1) return best.key;

  if (!isMinor) {
    const relMinorRoot = NOTES_SHARP[(idx + 9) % 12]; // -3 semitonos
    const relMinorScore = score.get(relMinorRoot + 'm') || 0;
    if (relMinorScore > best.score * 0.8 && chords[chords.length - 1]?.isMinor) {
      return relMinorRoot + 'm';
    }
  }

  return best.key;
}
