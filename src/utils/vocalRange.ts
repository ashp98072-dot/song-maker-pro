/**
 * Vocal Range Intelligence
 * ------------------------
 * Sistema de transposición avanzado basado en el registro vocal real
 * (no solo "hombre/mujer"). Cada registro tiene un rango cómodo definido
 * en semitonos absolutos (C4 = 60, MIDI standard).
 *
 * Lógica: dado el tono original de la melodía y el rango cómodo del cantante,
 * calcula la transposición óptima por la mínima distancia semitonal,
 * aprovechando el círculo de quintas para preferir tonalidades naturales.
 */

export type VocalRegister =
  | 'soprano'
  | 'mezzosoprano'
  | 'contralto'
  | 'tenor'
  | 'baritono'
  | 'bajo';

export interface VocalRegisterInfo {
  id: VocalRegister;
  label: string;
  shortLabel: string;
  // Centro tonal cómodo en semitonos MIDI (nota tónica ideal de la canción)
  comfortCenterMidi: number;
  rangeLow: number;
  rangeHigh: number;
  description: string;
}

// Notas MIDI de referencia: C4 = 60
// Los centros se eligen para que la tónica de la canción caiga en una zona
// donde la melodía típica de adoración (≈ una octava) quede cómoda.
export const VOCAL_REGISTERS: VocalRegisterInfo[] = [
  {
    id: 'soprano',
    label: 'Soprano',
    shortLabel: 'S',
    comfortCenterMidi: 67, // G4
    rangeLow: 60, // C4
    rangeHigh: 81, // A5
    description: 'Voz femenina aguda',
  },
  {
    id: 'mezzosoprano',
    label: 'Mezzosoprano',
    shortLabel: 'M',
    comfortCenterMidi: 65, // F4
    rangeLow: 57, // A3
    rangeHigh: 77, // F5
    description: 'Voz femenina media',
  },
  {
    id: 'contralto',
    label: 'Contralto',
    shortLabel: 'C',
    comfortCenterMidi: 62, // D4
    rangeLow: 53, // F3
    rangeHigh: 74, // D5
    description: 'Voz femenina grave',
  },
  {
    id: 'tenor',
    label: 'Tenor',
    shortLabel: 'T',
    comfortCenterMidi: 60, // C4
    rangeLow: 48, // C3
    rangeHigh: 69, // A4
    description: 'Voz masculina aguda',
  },
  {
    id: 'baritono',
    label: 'Barítono',
    shortLabel: 'Br',
    comfortCenterMidi: 57, // A3
    rangeLow: 45, // A2
    rangeHigh: 65, // F4
    description: 'Voz masculina media',
  },
  {
    id: 'bajo',
    label: 'Bajo',
    shortLabel: 'B',
    comfortCenterMidi: 53, // F3
    rangeLow: 41, // F2
    rangeHigh: 62, // D4
    description: 'Voz masculina grave',
  },
];

const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// Tonalidades "naturales" (pocas alteraciones) — círculo de quintas central
const NATURAL_KEY_PCS = new Set([0, 2, 4, 5, 7, 9, 11, 10, 3, 8]); // C, D, E, F, G, A, B, Bb, Eb, Ab

function rootPc(key: string): number | null {
  const root = key.replace(/m$/, '').replace('♯', '#').replace('♭', 'b');
  const pc = NOTE_TO_PC[root];
  return pc === undefined ? null : pc;
}

/**
 * Asume que la tónica de la canción suena cerca de C4 (MIDI 60) por defecto
 * para cálculos de centro. Esto es razonable porque las canciones de
 * adoración suelen cantarse alrededor del registro central.
 */
const ASSUMED_TONIC_MIDI = 60;

/**
 * Calcula los semitonos óptimos para llevar una canción al registro vocal.
 * Usa la mínima distancia y prefiere, en empates, tonalidades naturales.
 */
export function getOptimalSemitonesForRegister(
  originalKey: string,
  register: VocalRegister
): number {
  const info = VOCAL_REGISTERS.find(r => r.id === register);
  if (!info) return 0;

  const origPc = rootPc(originalKey);
  if (origPc === null) return 0;

  // Distancia semitonal del centro de comodidad respecto a la tónica original
  const targetMidi = info.comfortCenterMidi;
  const rawShift = targetMidi - ASSUMED_TONIC_MIDI;

  // Llevamos a la octava más cercana: rango ±6 semitonos para evitar
  // saltos absurdos (la melodía siempre se puede cantar una octava arriba/abajo)
  let best = rawShift;
  while (best > 6) best -= 12;
  while (best < -6) best += 12;

  // Preferencia por tonalidades naturales en empates (±1 semitono)
  const candidates = [best - 1, best, best + 1].filter(s => Math.abs(s) <= 7);
  let bestScore = -Infinity;
  let bestShift = best;
  for (const s of candidates) {
    const newPc = ((origPc + s) % 12 + 12) % 12;
    const distance = Math.abs(s - rawShift);
    const naturalBonus = NATURAL_KEY_PCS.has(newPc) ? 0.5 : 0;
    const score = -distance + naturalBonus;
    if (score > bestScore) {
      bestScore = score;
      bestShift = s;
    }
  }

  return bestShift;
}

export function getRegisterInfo(register: VocalRegister): VocalRegisterInfo | undefined {
  return VOCAL_REGISTERS.find(r => r.id === register);
}
