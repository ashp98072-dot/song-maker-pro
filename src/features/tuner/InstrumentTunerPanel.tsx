import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  TUNER_INSTRUMENTS,
  centsOff,
  detectPitchHz,
  nearestString,
  noteNameFromMidi,
  midiFromHz,
  type TunerInstrumentId,
  type TunerString,
} from '@/features/tuner/tunerMath';

export function InstrumentTunerPanel({ className = '' }: { className?: string }) {
  const [instrumentId, setInstrumentId] = useState<TunerInstrumentId>('guitar');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hz, setHz] = useState<number | null>(null);
  const [cents, setCents] = useState(0);
  const [matched, setMatched] = useState<TunerString | null>(null);
  const [selectedString, setSelectedString] = useState<TunerString | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);

  const instrument = TUNER_INSTRUMENTS.find((i) => i.id === instrumentId)!;

  useEffect(() => {
    setSelectedString(instrument.strings[0] ?? null);
    setMatched(null);
    setHz(null);
  }, [instrumentId, instrument.strings]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioRef.current;
    const buf = bufferRef.current;
    if (!analyser || !ctx || !buf) return;

    analyser.getFloatTimeDomainData(buf as Float32Array & { buffer: ArrayBuffer });
    const detected = detectPitchHz(buf, ctx.sampleRate);
    if (detected) {
      setHz(detected);
      const target = selectedString ?? nearestString(detected, instrument.strings)?.string;
      if (target) {
        setMatched(target);
        setCents(centsOff(detected, target.hz));
      } else {
        const near = nearestString(detected, instrument.strings);
        if (near) {
          setMatched(near.string);
          setCents(near.cents);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [instrument.strings, selectedString]);

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
      analyser.fftSize = 2048;
      source.connect(analyser);

      streamRef.current = stream;
      audioRef.current = ctx;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
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

  const needle = Math.max(-50, Math.min(50, cents));
  const inTune = Math.abs(cents) < 8 && hz != null;
  const detectedNote = hz ? noteNameFromMidi(Math.round(midiFromHz(hz))) : '—';

  return (
    <div className={className} data-instrument-tuner>
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {TUNER_INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => setInstrumentId(inst.id)}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
              instrumentId === inst.id
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {inst.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
        {instrument.strings.map((s) => (
          <button
            key={s.note}
            type="button"
            onClick={() => setSelectedString(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
              selectedString?.note === s.note
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-muted-foreground'
            }`}
          >
            {s.label} {s.note}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/40 p-5 mb-4 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
          Detectado
        </p>
        <p className="text-4xl font-display font-bold text-gold tabular-nums">{detectedNote}</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          {hz ? `${hz.toFixed(1)} Hz` : 'Toca una cuerda…'}
          {matched ? ` → ${matched.note}` : ''}
        </p>

        <div className="relative h-3 mt-5 mb-2 rounded-full bg-secondary overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/40 z-10" />
          <div
            className={`absolute top-0 bottom-0 w-3 rounded-full -ml-1.5 transition-all ${
              inTune ? 'bg-green-500' : 'bg-gold'
            }`}
            style={{ left: `${50 + needle}%` }}
          />
        </div>
        <p
          className={`text-sm font-mono font-bold ${
            inTune ? 'text-green-500' : Math.abs(cents) > 25 ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {hz == null ? '—' : `${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents`}
          {inTune ? ' · afinado' : ''}
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
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Usa el micrófono del dispositivo. Elige instrumento y, si quieres, la cuerda objetivo.
      </p>
    </div>
  );
}
