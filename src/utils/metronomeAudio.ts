// Web Audio API metronome sounds
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playClick(accent: boolean) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // TUC (accent) = lower freq, louder. TIC = higher freq, softer
  osc.frequency.value = accent ? 1000 : 1500;
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(accent ? 0.8 : 0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (accent ? 0.08 : 0.05));
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + (accent ? 0.08 : 0.05));
}
