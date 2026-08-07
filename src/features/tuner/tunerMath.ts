/** Multi-instrument chromatic tuner (guitar, bass, violin). */

export type TunerInstrumentId = 'guitar' | 'bass' | 'violin';

export type TunerString = {
  label: string;
  /** Scientific pitch notation, e.g. E2 */
  note: string;
  hz: number;
};

export type TunerInstrument = {
  id: TunerInstrumentId;
  label: string;
  strings: TunerString[];
};

/** A4 = 440 Hz */
export const A4_HZ = 440;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function noteNameFromMidi(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function hzFromMidi(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

export function midiFromHz(hz: number): number {
  return 69 + 12 * Math.log2(hz / A4_HZ);
}

export const TUNER_INSTRUMENTS: TunerInstrument[] = [
  {
    id: 'guitar',
    label: 'Guitarra',
    strings: [
      { label: '6ª', note: 'E2', hz: hzFromMidi(40) },
      { label: '5ª', note: 'A2', hz: hzFromMidi(45) },
      { label: '4ª', note: 'D3', hz: hzFromMidi(50) },
      { label: '3ª', note: 'G3', hz: hzFromMidi(55) },
      { label: '2ª', note: 'B3', hz: hzFromMidi(59) },
      { label: '1ª', note: 'E4', hz: hzFromMidi(64) },
    ],
  },
  {
    id: 'bass',
    label: 'Bajo',
    strings: [
      { label: '4ª', note: 'E1', hz: hzFromMidi(28) },
      { label: '3ª', note: 'A1', hz: hzFromMidi(33) },
      { label: '2ª', note: 'D2', hz: hzFromMidi(38) },
      { label: '1ª', note: 'G2', hz: hzFromMidi(43) },
    ],
  },
  {
    id: 'violin',
    label: 'Violín',
    strings: [
      { label: '4ª', note: 'G3', hz: hzFromMidi(55) },
      { label: '3ª', note: 'D4', hz: hzFromMidi(62) },
      { label: '2ª', note: 'A4', hz: hzFromMidi(69) },
      { label: '1ª', note: 'E5', hz: hzFromMidi(76) },
    ],
  },
];

/** Autocorrelation pitch detection (YIN-ish, light). Returns Hz or null. */
export function detectPitchHz(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  if (SIZE < 512) return null;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  const maxSamples = Math.floor(SIZE / 2);
  const correlations = new Float32Array(maxSamples);
  for (let lag = 0; lag < maxSamples; lag++) {
    let sum = 0;
    for (let i = 0; i < maxSamples; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  let d = 0;
  while (d < maxSamples - 1 && correlations[d] > correlations[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < maxSamples; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  const x1 = correlations[maxPos - 1] ?? 0;
  const x2 = correlations[maxPos] ?? 0;
  const x3 = correlations[maxPos + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const shift = a ? -b / (2 * a) : 0;
  const period = maxPos + shift;
  if (period <= 0) return null;

  const hz = sampleRate / period;
  if (hz < 40 || hz > 2000) return null;
  return hz;
}

export function centsOff(detectedHz: number, targetHz: number): number {
  return 1200 * Math.log2(detectedHz / targetHz);
}

export function nearestString(
  hz: number,
  strings: TunerString[]
): { string: TunerString; cents: number } | null {
  if (!strings.length) return null;
  let best = strings[0];
  let bestCents = Math.abs(centsOff(hz, best.hz));
  for (const s of strings) {
    const c = Math.abs(centsOff(hz, s.hz));
    if (c < bestCents) {
      best = s;
      bestCents = c;
    }
  }
  return { string: best, cents: centsOff(hz, best.hz) };
}
