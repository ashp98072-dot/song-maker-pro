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
  /** Reject detections outside this Hz band (reduces noise / harmonics chaos) */
  hzMin: number;
  hzMax: number;
};

/** A4 = 440 Hz */
export const A4_HZ = 440;

/** Only treat as "near a string" within this window (cents). */
export const LOCK_CENTS = 90;

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
    hzMin: 70,
    hzMax: 400,
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
    hzMin: 35,
    hzMax: 220,
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
    hzMin: 170,
    hzMax: 800,
    strings: [
      { label: '4ª', note: 'G3', hz: hzFromMidi(55) },
      { label: '3ª', note: 'D4', hz: hzFromMidi(62) },
      { label: '2ª', note: 'A4', hz: hzFromMidi(69) },
      { label: '1ª', note: 'E5', hz: hzFromMidi(76) },
    ],
  },
];

/**
 * Autocorrelation pitch with clarity gate.
 * Returns null for silence / noisy / unclear signals.
 */
export function detectPitchHz(
  buffer: Float32Array,
  sampleRate: number,
  opts?: { rmsMin?: number; hzMin?: number; hzMax?: number }
): number | null {
  const SIZE = buffer.length;
  if (SIZE < 1024) return null;

  const rmsMin = opts?.rmsMin ?? 0.025;
  const hzMin = opts?.hzMin ?? 40;
  const hzMax = opts?.hzMax ?? 1000;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < rmsMin) return null;

  const minLag = Math.floor(sampleRate / hzMax);
  const maxLag = Math.min(Math.floor(sampleRate / hzMin), Math.floor(SIZE / 2));
  if (minLag >= maxLag) return null;

  // Difference function (YIN-style)
  const yin = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      const d = buffer[i] - buffer[i + lag];
      sum += d * d;
    }
    yin[lag] = sum;
  }

  // Cumulative mean normalized difference
  yin[minLag] = 1;
  let running = 0;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    running += yin[lag];
    yin[lag] = yin[lag] * (lag - minLag + 1) / (running || 1);
  }

  const threshold = 0.15;
  let bestLag = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (yin[lag] < threshold && yin[lag] < yin[lag - 1] && yin[lag] <= yin[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) {
    // Fallback: absolute minimum in range
    let minVal = Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (yin[lag] < minVal) {
        minVal = yin[lag];
        bestLag = lag;
      }
    }
    if (minVal > 0.35 || bestLag < 0) return null;
  }

  // Parabolic interpolation
  const y0 = yin[bestLag - 1] ?? yin[bestLag];
  const y1 = yin[bestLag];
  const y2 = yin[bestLag + 1] ?? yin[bestLag];
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y0 - y2) / denom : 0;
  const period = bestLag + shift;
  if (period <= 0) return null;

  const hz = sampleRate / period;
  if (hz < hzMin || hz > hzMax) return null;
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
  let bestAbs = Math.abs(centsOff(hz, best.hz));
  for (const s of strings) {
    const a = Math.abs(centsOff(hz, s.hz));
    if (a < bestAbs) {
      best = s;
      bestAbs = a;
    }
  }
  return { string: best, cents: centsOff(hz, best.hz) };
}

/**
 * Resolve which string to compare against.
 * Locked string only applies when pitch is near it; otherwise nearest-in-range or null.
 */
export function resolveTunerTarget(
  hz: number,
  strings: TunerString[],
  locked: TunerString | null
): { string: TunerString; cents: number; lockedApplied: boolean } | null {
  if (locked) {
    const c = centsOff(hz, locked.hz);
    if (Math.abs(c) <= LOCK_CENTS) {
      return { string: locked, cents: c, lockedApplied: true };
    }
  }
  const near = nearestString(hz, strings);
  if (!near || Math.abs(near.cents) > LOCK_CENTS) return null;
  return { string: near.string, cents: near.cents, lockedApplied: false };
}
