import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, MicOff, Piano, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  detectPitchHz,
  hzFromMidi,
  midiFromHz,
  noteNameFromMidi,
} from '@/features/tuner/tunerMath';
import { useSingerVocalProfile } from '@/features/vocal-test/useSingerVocalProfile';
import {
  KEYBOARD_MIDI_HIGH,
  KEYBOARD_MIDI_LOW,
  matchClosestRegister,
  midiNoteLabel,
  type VocalTestMethod,
} from '@/features/vocal-test/vocalTestMath';
import { getRegisterInfo } from '@/utils/vocalRange';

type Mode = 'keyboard' | 'microphone';
type MicPhase = 'idle' | 'low' | 'high' | 'done';

const KEYS = Array.from(
  { length: KEYBOARD_MIDI_HIGH - KEYBOARD_MIDI_LOW + 1 },
  (_, i) => KEYBOARD_MIDI_LOW + i
);

function playBeep(midi: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hzFromMidi(midi);
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.4);
    window.setTimeout(() => void ctx.close().catch(() => undefined), 500);
  } catch {
    /* ignore */
  }
}

export function VocalRangeTestPanel({ className = '' }: { className?: string }) {
  const { profile, saveProfile, clearProfile } = useSingerVocalProfile();
  const [mode, setMode] = useState<Mode>('keyboard');
  const [lowMidi, setLowMidi] = useState<number | null>(profile?.lowMidi ?? null);
  const [highMidi, setHighMidi] = useState<number | null>(profile?.highMidi ?? null);
  const [marking, setMarking] = useState<'low' | 'high'>('low');

  const [micPhase, setMicPhase] = useState<MicPhase>('idle');
  const [listening, setListening] = useState(false);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLow, setMicLow] = useState<number | null>(null);
  const [micHigh, setMicHigh] = useState<number | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const phaseRef = useRef<MicPhase>('idle');
  const stableCount = useRef(0);
  const lastMidi = useRef<number | null>(null);

  phaseRef.current = micPhase;

  const matched =
    lowMidi != null && highMidi != null && lowMidi < highMidi
      ? matchClosestRegister(lowMidi, highMidi)
      : null;

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setListening(false);
    setLiveNote(null);
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioRef.current;
    const buf = bufferRef.current;
    if (!analyser || !ctx || !buf) return;

    analyser.getFloatTimeDomainData(buf as Float32Array & { buffer: ArrayBuffer });
    const hz = detectPitchHz(buf, ctx.sampleRate, {
      rmsMin: 0.028,
      hzMin: 70,
      hzMax: 1200,
    });

    if (hz == null) {
      stableCount.current = 0;
      lastMidi.current = null;
      setLiveNote(null);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const midi = Math.round(midiFromHz(hz));
    setLiveNote(noteNameFromMidi(midi));

    if (lastMidi.current != null && Math.abs(lastMidi.current - midi) <= 1) {
      stableCount.current += 1;
    } else {
      stableCount.current = 1;
      lastMidi.current = midi;
    }

    // Capture after ~0.4s stable
    if (stableCount.current >= 18) {
      const phase = phaseRef.current;
      if (phase === 'low') {
        setMicLow((prev) => (prev == null ? midi : Math.min(prev, midi)));
      } else if (phase === 'high') {
        setMicHigh((prev) => (prev == null ? midi : Math.max(prev, midi)));
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startMic = async (phase: 'low' | 'high') => {
    setMicError(null);
    stopMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      streamRef.current = stream;
      audioRef.current = ctx;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
      stableCount.current = 0;
      lastMidi.current = null;
      setMicPhase(phase);
      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setMicError('No se pudo acceder al micrófono.');
      stopMic();
    }
  };

  const confirmMicLow = () => {
    if (micLow == null) {
      toast.message('Canta una nota grave estable unos segundos');
      return;
    }
    setLowMidi(micLow);
    stopMic();
    setMicHigh(null);
    setMicPhase('high');
    void startMic('high');
  };

  const confirmMicHigh = () => {
    if (micHigh == null) {
      toast.message('Canta una nota aguda estable unos segundos');
      return;
    }
    const low = micLow ?? lowMidi;
    const high = micHigh;
    if (low == null || high <= low) {
      toast.error('El agudo debe ser más alto que el grave');
      return;
    }
    setLowMidi(low);
    setHighMidi(high);
    stopMic();
    setMicPhase('done');
  };

  const onKeyPick = (midi: number) => {
    playBeep(midi);
    if (marking === 'low') {
      setLowMidi(midi);
      setMarking('high');
    } else {
      setHighMidi(midi);
    }
  };

  const handleSave = (method: VocalTestMethod) => {
    if (!matched || lowMidi == null || highMidi == null) return;
    saveProfile({
      lowMidi: Math.min(lowMidi, highMidi),
      highMidi: Math.max(lowMidi, highMidi),
      register: matched.id,
      method,
      updatedAt: Date.now(),
    });
    toast.success(`Guardado: ${matched.label}`);
  };

  const reset = () => {
    stopMic();
    setLowMidi(null);
    setHighMidi(null);
    setMarking('low');
    setMicPhase('idle');
    setMicLow(null);
    setMicHigh(null);
  };

  return (
    <div className={className} data-vocal-range-test>
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 mb-4">
        <button
          type="button"
          onClick={() => {
            stopMic();
            setMode('keyboard');
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            mode === 'keyboard' ? 'bg-background text-gold shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Piano className="w-3.5 h-3.5" /> Teclado
        </button>
        <button
          type="button"
          onClick={() => setMode('microphone')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            mode === 'microphone' ? 'bg-background text-gold shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Mic className="w-3.5 h-3.5" /> Micrófono
        </button>
      </div>

      {profile ? (
        <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-gold">
              Mi voz: {getRegisterInfo(profile.register)?.label ?? profile.register}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {midiNoteLabel(profile.lowMidi)} – {midiNoteLabel(profile.highMidi)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearProfile();
              toast.message('Perfil vocal borrado');
            }}
            className="text-[10px] font-bold text-muted-foreground border border-border rounded-lg px-2 py-1 shrink-0"
          >
            Borrar
          </button>
        </div>
      ) : null}

      {mode === 'keyboard' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {marking === 'low'
              ? '1. Toca la nota más grave que cantes cómoda'
              : '2. Toca la nota más aguda cómoda'}
          </p>
          <div className="flex gap-2 justify-center text-[11px] font-mono">
            <span className={lowMidi != null ? 'text-gold font-bold' : 'text-muted-foreground'}>
              Grave: {lowMidi != null ? midiNoteLabel(lowMidi) : '—'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className={highMidi != null ? 'text-gold font-bold' : 'text-muted-foreground'}>
              Agudo: {highMidi != null ? midiNoteLabel(highMidi) : '—'}
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 px-0.5">
            {KEYS.map((midi) => {
              const isLow = lowMidi === midi;
              const isHigh = highMidi === midi;
              const inRange =
                lowMidi != null && highMidi != null && midi >= Math.min(lowMidi, highMidi) && midi <= Math.max(lowMidi, highMidi);
              return (
                <button
                  key={midi}
                  type="button"
                  onClick={() => onKeyPick(midi)}
                  className={`shrink-0 w-9 h-14 rounded-md border text-[9px] font-mono font-bold ${
                    isLow || isHigh
                      ? 'border-gold bg-gold text-primary-foreground'
                      : inRange
                        ? 'border-gold/40 bg-gold/15 text-gold'
                        : 'border-border bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {midiNoteLabel(midi)}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMarking('low')}
              className={`flex-1 py-2 rounded-lg text-xs border ${
                marking === 'low' ? 'border-gold text-gold' : 'border-border'
              }`}
            >
              Marcar grave
            </button>
            <button
              type="button"
              onClick={() => setMarking('high')}
              className={`flex-1 py-2 rounded-lg text-xs border ${
                marking === 'high' ? 'border-gold text-gold' : 'border-border'
              }`}
            >
              Marcar agudo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {micPhase === 'idle' || micPhase === 'low'
              ? 'Canta tu nota más grave con claridad, luego confirma.'
              : micPhase === 'high'
                ? 'Ahora canta tu nota más aguda cómoda.'
                : 'Rango capturado.'}
          </p>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Detectado
            </p>
            <p className="text-3xl font-display font-bold text-gold tabular-nums mt-1">
              {liveNote ?? '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Grave: {micLow != null || lowMidi != null ? midiNoteLabel(micLow ?? lowMidi!) : '—'} ·
              Agudo: {micHigh != null || highMidi != null ? midiNoteLabel(micHigh ?? highMidi!) : '—'}
            </p>
          </div>
          {micError ? <p className="text-xs text-destructive text-center">{micError}</p> : null}
          <div className="flex flex-col gap-2">
            {micPhase === 'idle' || (!listening && micPhase === 'low') ? (
              <button
                type="button"
                onClick={() => {
                  setMicLow(null);
                  setMicHigh(null);
                  void startMic('low');
                }}
                className="w-full py-3 rounded-xl text-sm font-bold gold-gradient text-primary-foreground flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" /> Empezar: nota grave
              </button>
            ) : null}
            {listening && micPhase === 'low' ? (
              <button
                type="button"
                onClick={confirmMicLow}
                className="w-full py-3 rounded-xl text-sm font-bold border border-gold text-gold"
              >
                Confirmar grave → seguir
              </button>
            ) : null}
            {listening && micPhase === 'high' ? (
              <button
                type="button"
                onClick={confirmMicHigh}
                className="w-full py-3 rounded-xl text-sm font-bold border border-gold text-gold"
              >
                Confirmar agudo
              </button>
            ) : null}
            {listening ? (
              <button
                type="button"
                onClick={() => {
                  stopMic();
                  setMicPhase('idle');
                }}
                className="w-full py-2 rounded-xl text-xs font-bold border border-destructive/40 text-destructive flex items-center justify-center gap-2"
              >
                <MicOff className="w-3.5 h-3.5" /> Detener micrófono
              </button>
            ) : null}
          </div>
        </div>
      )}

      {matched ? (
        <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-center space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Registro sugerido
          </p>
          <p className="text-2xl font-display font-bold text-gold">{matched.label}</p>
          <p className="text-xs text-muted-foreground">
            {midiNoteLabel(Math.min(lowMidi!, highMidi!))} –{' '}
            {midiNoteLabel(Math.max(lowMidi!, highMidi!))} · {matched.description}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Repetir
            </button>
            <button
              type="button"
              onClick={() => handleSave(mode)}
              className="flex-1 py-2.5 rounded-xl gold-gradient text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
          <Link
            to="/"
            className="block text-[11px] text-muted-foreground underline underline-offset-2 pt-1"
          >
            Abrir una canción y aplica “Mi voz”
          </Link>
        </div>
      ) : null}
    </div>
  );
}
