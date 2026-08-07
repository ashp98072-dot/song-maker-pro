import { hzFromMidi } from '@/features/tuner/tunerMath';

/**
 * Soft sustained electric/acoustic-piano-like tone for vocal matching.
 * Pure sine partials + lowpass (no triangle/saw → evita timbre de viento/trompeta).
 */

let sharedCtx: AudioContext | null = null;

type ActiveVoice = {
  oscs: OscillatorNode[];
  nodes: AudioNode[];
  gain: GainNode;
  midi: number;
};

let active: ActiveVoice | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

/** Stop current note with a short release. */
export function stopPianoTone(releaseSec = 0.22) {
  if (!active) return;
  const voice = active;
  active = null;
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.001), t);
    voice.gain.gain.exponentialRampToValueAtTime(0.001, t + releaseSec);
    for (const osc of voice.oscs) {
      try {
        osc.stop(t + releaseSec + 0.03);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => {
      for (const n of voice.nodes) {
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      }
    }, (releaseSec + 0.08) * 1000);
  } catch {
    active = null;
  }
}

/**
 * Start a sustained piano-like tone. Replaces any previous note.
 * Call stopPianoTone() on pointer up / leave.
 */
export function startPianoTone(midi: number) {
  try {
    stopPianoTone(0.08);
    const ctx = getCtx();
    void ctx.resume();
    const hz = hzFromMidi(midi);

    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // Brighter keys stay soft; lower notes a bit warmer
    filter.frequency.value = Math.min(2800, 900 + hz * 2.2);
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);

    // Piano-ish spectrum: only sines, amplitude ~ 1/n² (mucho menos “brass”)
    // Slight stretch on higher partials (cuerdas reales)
    const partialLevels = [1, 0.42, 0.18, 0.09, 0.045, 0.022];
    const oscs: OscillatorNode[] = [];
    const nodes: AudioNode[] = [master, filter];
    const t0 = ctx.currentTime;

    for (let n = 1; n <= partialLevels.length; n++) {
      const stretch = 1 + (n - 1) * 0.00035;
      const level = partialLevels[n - 1]! * (0.16 / partialLevels[0]!);

      const makePartial = (detuneCents: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz * n * stretch;
        osc.detune.value = detuneCents;
        g.gain.value = level * (detuneCents === 0 ? 1 : 0.55);
        osc.connect(g);
        g.connect(filter);
        osc.start(t0);
        oscs.push(osc);
        nodes.push(g);
      };

      makePartial(0);
      // Unison suave solo en el fundamental (calor de piano, no trompeta)
      if (n === 1) makePartial(4);
    }

    // Attack suave tipo martillo + sustain cómodo para cantar encima
    master.gain.setValueAtTime(0.001, t0);
    master.gain.exponentialRampToValueAtTime(0.72, t0 + 0.018);
    master.gain.exponentialRampToValueAtTime(0.55, t0 + 0.12);

    active = { oscs, nodes, gain: master, midi };
  } catch {
    active = null;
  }
}

export function isPianoTonePlaying(midi?: number): boolean {
  if (!active) return false;
  if (midi == null) return true;
  return active.midi === midi;
}
