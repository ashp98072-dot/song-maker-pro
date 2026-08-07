import { hzFromMidi } from '@/features/tuner/tunerMath';

/** Soft sustained keyboard tone (piano-ish) for vocal range matching. */

let sharedCtx: AudioContext | null = null;

type ActiveVoice = {
  oscs: OscillatorNode[];
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
export function stopPianoTone(releaseSec = 0.18) {
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
        osc.stop(t + releaseSec + 0.02);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => {
      try {
        voice.gain.disconnect();
      } catch {
        /* ignore */
      }
    }, (releaseSec + 0.05) * 1000);
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
    stopPianoTone(0.06);
    const ctx = getCtx();
    void ctx.resume();
    const hz = hzFromMidi(midi);
    const master = ctx.createGain();
    master.connect(ctx.destination);

    // Fundamental + soft harmonics (warmer than a pure beep)
    const partials: { type: OscillatorType; mult: number; level: number }[] = [
      { type: 'triangle', mult: 1, level: 0.22 },
      { type: 'sine', mult: 2, level: 0.07 },
      { type: 'sine', mult: 3, level: 0.035 },
      { type: 'sine', mult: 4, level: 0.018 },
    ];

    const oscs: OscillatorNode[] = [];
    const t0 = ctx.currentTime;
    for (const p of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.value = hz * p.mult;
      g.gain.value = p.level;
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      oscs.push(osc);
    }

    // Soft attack, then hold
    master.gain.setValueAtTime(0.001, t0);
    master.gain.exponentialRampToValueAtTime(0.85, t0 + 0.045);

    active = { oscs, gain: master, midi };
  } catch {
    active = null;
  }
}

export function isPianoTonePlaying(midi?: number): boolean {
  if (!active) return false;
  if (midi == null) return true;
  return active.midi === midi;
}
