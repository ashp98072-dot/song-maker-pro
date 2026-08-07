import { noteNameFromMidi } from '@/features/tuner/tunerMath';
import {
  VOCAL_REGISTERS,
  type VocalRegister,
  type VocalRegisterInfo,
} from '@/utils/vocalRange';

export type VocalTestMethod = 'keyboard' | 'microphone';

export type SingerVocalProfile = {
  lowMidi: number;
  highMidi: number;
  register: VocalRegister;
  method: VocalTestMethod;
  updatedAt: number;
};

/** Typical singing span for the guided keyboard (G2–C6). */
export const KEYBOARD_MIDI_LOW = 43;
export const KEYBOARD_MIDI_HIGH = 84;

/** Minimum measured span (semitones) to classify a register. */
export const MIN_RANGE_SEMITONES = 5;

const REGISTER_IDS = new Set<string>(VOCAL_REGISTERS.map((r) => r.id));

export function isVocalRegister(id: unknown): id is VocalRegister {
  return typeof id === 'string' && REGISTER_IDS.has(id);
}

export function normalizeRange(lowMidi: number, highMidi: number): { low: number; high: number } {
  return {
    low: Math.min(lowMidi, highMidi),
    high: Math.max(lowMidi, highMidi),
  };
}

export function canClassifyRange(lowMidi: number, highMidi: number): boolean {
  const { low, high } = normalizeRange(lowMidi, highMidi);
  return high - low >= MIN_RANGE_SEMITONES;
}

/**
 * Clasifica un rango medido al registro más cercano por solape + centro.
 */
export function matchClosestRegister(lowMidi: number, highMidi: number): VocalRegisterInfo {
  const { low, high } = normalizeRange(lowMidi, highMidi);
  const center = (low + high) / 2;
  const span = Math.max(1, high - low);

  let best = VOCAL_REGISTERS[0];
  let bestScore = -Infinity;

  for (const r of VOCAL_REGISTERS) {
    const overlapLow = Math.max(low, r.rangeLow);
    const overlapHigh = Math.min(high, r.rangeHigh);
    const overlap = Math.max(0, overlapHigh - overlapLow);
    const overlapRatio = overlap / span;
    const centerDist = Math.abs(center - r.comfortCenterMidi);
    const regSpan = Math.max(1, r.rangeHigh - r.rangeLow);
    const spanDist = Math.abs(span - regSpan);
    const score = overlapRatio * 10 - centerDist * 0.35 - spanDist * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return best;
}

export function midiNoteLabel(midi: number): string {
  return noteNameFromMidi(Math.round(midi));
}

export function parseSingerVocalProfile(raw: unknown): SingerVocalProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<SingerVocalProfile>;
  if (typeof data.lowMidi !== 'number' || typeof data.highMidi !== 'number') return null;
  if (!Number.isFinite(data.lowMidi) || !Number.isFinite(data.highMidi)) return null;
  if (!isVocalRegister(data.register)) return null;
  if (data.method !== 'keyboard' && data.method !== 'microphone') return null;
  const { low, high } = normalizeRange(data.lowMidi, data.highMidi);
  if (!canClassifyRange(low, high)) return null;
  return {
    lowMidi: low,
    highMidi: high,
    register: data.register,
    method: data.method,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}
