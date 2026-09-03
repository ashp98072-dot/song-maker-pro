/**
 * Clean reference pitch for the pro tuner: a soft harmonic tone at an exact
 * frequency (calibration-aware) so the player can match a string by ear.
 */

let sharedCtx: AudioContext | null = null;

type Voice = {
  oscs: OscillatorNode[];
  nodes: AudioNode[];
  gain: GainNode;
  stopTimer: number;
  hz: number;
};

let active: Voice | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

export function stopReferenceTone(releaseSec = 0.18): void {
  if (!active) return;
  const voice = active;
  active = null;
  try {
    window.clearTimeout(voice.stopTimer);
    const ctx = getCtx();
    const t = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), t);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + releaseSec);
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
    }, (releaseSec + 0.1) * 1000);
  } catch {
    /* ignore */
  }
}

/** Play a sustained tone at `hz`. Auto-stops after `seconds`. */
export function playReferenceTone(hz: number, seconds = 2.6): void {
  try {
    stopReferenceTone(0.05);
    const ctx = getCtx();
    void ctx.resume();
    const t0 = ctx.currentTime;

    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(5000, 1400 + hz * 3);
    filter.Q.value = 0.6;
    filter.connect(master);
    master.connect(ctx.destination);

    const partialLevels = [1, 0.32, 0.13, 0.05];
    const oscs: OscillatorNode[] = [];
    const nodes: AudioNode[] = [master, filter];

    partialLevels.forEach((lvl, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz * (i + 1);
      g.gain.value = lvl * 0.16;
      osc.connect(g);
      g.connect(filter);
      osc.start(t0);
      oscs.push(osc);
      nodes.push(g);
    });

    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02);
    master.gain.exponentialRampToValueAtTime(0.5, t0 + 0.35);

    const stopTimer = window.setTimeout(() => stopReferenceTone(0.35), seconds * 1000);
    active = { oscs, nodes, gain: master, stopTimer, hz };
  } catch {
    active = null;
  }
}

export function referenceToneHz(): number | null {
  return active?.hz ?? null;
}
