import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  TUNER_INSTRUMENTS,
  detectPitchHz,
  noteNameFromMidi,
  midiFromHz,
  resolveTunerTarget,
  type TunerInstrumentId,
  type TunerString,
} from '@/features/tuner/tunerMath';

const SMOOTH = 0.28;
const STABLE_FRAMES = 3;
const LOST_FRAMES = 12;

export function InstrumentTunerPanel({ className = '' }: { className?: string }) {
  const [instrumentId, setInstrumentId] = useState<TunerInstrumentId>('guitar');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hz, setHz] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [matched, setMatched] = useState<TunerString | null>(null);
  /** null = auto (nearest string) */
  const [lockedString, setLockedString] = useState<TunerString | null>(null);
  const [signalOk, setSignalOk] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const smoothHzRef = useRef<number | null>(null);
  const stableRef = useRef(0);
  const lostRef = useRef(0);
  const lockedRef = useRef<TunerString | null>(null);
  const instrumentRef = useRef(TUNER_INSTRUMENTS[0]);

  const instrument = TUNER_INSTRUMENTS.find((i) => i.id === instrumentId)!;
  instrumentRef.current = instrument;
  lockedRef.current = lockedString;

  useEffect(() => {
    setLockedString(null);
    setMatched(null);
    setHz(null);
    setCents(null);
    setSignalOk(false);
    smoothHzRef.current = null;
    stableRef.current = 0;
  }, [instrumentId]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    smoothHzRef.current = null;
    setListening(false);
    setSignalOk(false);
    setHz(null);
    setCents(null);
    setMatched(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioRef.current;
    const buf = bufferRef.current;
    const inst = instrumentRef.current;
    if (!analyser || !ctx || !buf) return;

    analyser.getFloatTimeDomainData(buf as Float32Array & { buffer: ArrayBuffer });
    const raw = detectPitchHz(buf, ctx.sampleRate, {
      rmsMin: 0.03,
      hzMin: inst.hzMin,
      hzMax: inst.hzMax,
    });

    if (raw == null) {
      lostRef.current += 1;
      stableRef.current = 0;
      if (lostRef.current >= LOST_FRAMES) {
        smoothHzRef.current = null;
        setSignalOk(false);
        setHz(null);
        setCents(null);
        setMatched(null);
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    lostRef.current = 0;
    const prev = smoothHzRef.current;
    const smoothed = prev == null ? raw : prev * (1 - SMOOTH) + raw * SMOOTH;
    // Jump reset if octave/harmonic leap
    if (prev != null && (smoothed > prev * 1.6 || smoothed < prev / 1.6)) {
      smoothHzRef.current = raw;
      stableRef.current = 0;
    } else {
      smoothHzRef.current = smoothed;
      stableRef.current += 1;
    }

    if (stableRef.current < STABLE_FRAMES) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const hzNow = smoothHzRef.current!;
    const target = resolveTunerTarget(hzNow, inst.strings, lockedRef.current);
    setSignalOk(true);
    setHz(hzNow);
    if (target) {
      setMatched(target.string);
      setCents(target.cents);
    } else {
      setMatched(null);
      setCents(null);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = async () => {
    setError(null);
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
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      streamRef.current = stream;
      audioRef.current = ctx;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
      smoothHzRef.current = null;
      stableRef.current = 0;
      lostRef.current = 0;
      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('No se pudo acceder al micrófono. Revisa permisos del navegador.');
      stop();
    }
  };

  useEffect(() => {
    if (!listening) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [listening, tick]);

  const hasTune = signalOk && cents != null && matched != null;
  const needle = hasTune ? Math.max(-45, Math.min(45, cents)) : 0;
  const inTune = hasTune && Math.abs(cents) < 8;
  const detectedNote = hz != null && signalOk ? noteNameFromMidi(Math.round(midiFromHz(hz))) : '—';

  const toggleLock = (s: TunerString) => {
    setLockedString((prev) => (prev?.note === s.note ? null : s));
  };

  return (
    <div className={className} data-instrument-tuner>
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 mb-4">
        {TUNER_INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => setInstrumentId(inst.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              instrumentId === inst.id
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {inst.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-1 justify-center">
        <button
          type="button"
          onClick={() => setLockedString(null)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
            lockedString == null
              ? 'border-gold text-gold bg-gold/10'
              : 'border-border text-muted-foreground'
          }`}
        >
          Auto
        </button>
        {instrument.strings.map((s) => (
          <button
            key={s.note}
            type="button"
            onClick={() => toggleLock(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
              lockedString?.note === s.note
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-muted-foreground'
            }`}
          >
            {s.label} {s.note}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mb-4">
        {lockedString
          ? `Fijado a ${lockedString.note} · solo mide cerca de esa cuerda`
          : 'Auto: elige la cuerda más cercana'}
      </p>

      <div className="rounded-2xl border border-border bg-secondary/40 p-5 mb-4 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
          Detectado
        </p>
        <p className="text-4xl font-display font-bold text-gold tabular-nums">{detectedNote}</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          {!listening
            ? 'Activa el micrófono'
            : !signalOk
              ? 'Toca una cuerda con claridad…'
              : `${hz!.toFixed(1)} Hz${matched ? ` · cerca de ${matched.note}` : ' · fuera de rango'}`}
        </p>

        <div className="relative h-3 mt-5 mb-2 rounded-full bg-secondary overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/40 z-10" />
          {hasTune ? (
            <div
              className={`absolute top-0 bottom-0 w-3 rounded-full -ml-1.5 transition-[left] duration-75 ${
                inTune ? 'bg-green-500' : 'bg-gold'
              }`}
              style={{ left: `${50 + needle}%` }}
            />
          ) : null}
        </div>
        <p
          className={`text-sm font-mono font-bold ${
            !hasTune
              ? 'text-muted-foreground'
              : inTune
                ? 'text-green-500'
                : Math.abs(cents!) > 25
                  ? 'text-amber-500'
                  : 'text-foreground'
          }`}
        >
          {!hasTune
            ? '—'
            : `${cents! > 0 ? '+' : ''}${cents!.toFixed(0)} cents${inTune ? ' · afinado' : ''}`}
        </p>
      </div>

      {error && <p className="text-xs text-destructive text-center mb-3">{error}</p>}

      <button
        type="button"
        onClick={() => (listening ? stop() : void start())}
        className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
          listening
            ? 'border border-destructive/50 text-destructive bg-destructive/10'
            : 'gold-gradient text-primary-foreground'
        }`}
      >
        {listening ? (
          <>
            <MicOff className="w-4 h-4" /> Detener micrófono
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" /> Activar afinador
          </>
        )}
      </button>
    </div>
  );
}
