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

/**
 * Clasifica un rango medido al registro más cercano por solape + centro.
 */
export function matchClosestRegister(lowMidi: number, highMidi: number): VocalRegisterInfo {
  const low = Math.min(lowMidi, highMidi);
  const high = Math.max(lowMidi, highMidi);
  const center = (low + high) / 2;

  let best = VOCAL_REGISTERS[0];
  let bestScore = -Infinity;

  for (const r of VOCAL_REGISTERS) {
    const overlapLow = Math.max(low, r.rangeLow);
    const overlapHigh = Math.min(high, r.rangeHigh);
    const overlap = Math.max(0, overlapHigh - overlapLow);
    const span = Math.max(1, high - low);
    const overlapRatio = overlap / span;
    const centerDist = Math.abs(center - r.comfortCenterMidi);
    // Prefer good overlap; penalize far centers; small bonus for similar span
    const spanDist = Math.abs(span - (r.rangeHigh - r.rangeLow));
    const score = overlapRatio * 10 - centerDist * 0.35 - spanDist * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return best;
}

export function midiNoteLabel(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[((Math.round(midi) % 12) + 12) % 12];
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${name}${octave}`;
}
