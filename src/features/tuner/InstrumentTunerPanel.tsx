import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Square, RotateCcw, Check } from 'lucide-react';
import {
  TUNER_INSTRUMENTS,
  detectPitchHz,
  midiFromHz,
  noteNameFromMidi,
  resolveChromaticTarget,
  resolveTunerTarget,
  stringsForCalibration,
  A4_HZ,
  A4_MIN,
  A4_MAX,
  type TunerInstrumentId,
  type TunerString,
} from '@/features/tuner/tunerMath';
import { playReferenceTone, stopReferenceTone } from '@/features/tuner/referenceTone';

const SMOOTH = 0.28;
const STABLE_FRAMES = 3;
const LOST_FRAMES = 12;
const IN_TUNE_CENTS = 5;
const HOLD_MS = 600;

type Mode = 'instrument' | 'chromatic';

function vibrate(ms: number) {
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  try {
    nav.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Gauge                                                              */
/* ------------------------------------------------------------------ */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg < startDeg ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

/** cents (-50..50) -> gauge angle (180deg left .. 0deg right) */
const centsToDeg = (c: number) => 180 - (Math.max(-50, Math.min(50, c)) + 50) * 1.8;

function TunerGauge({
  cents,
  active,
  inTune,
}: {
  cents: number | null;
  active: boolean;
  inTune: boolean;
}) {
  const CX = 120;
  const CY = 118;
  const R = 96;
  const needleDeg = centsToDeg(cents ?? 0);
  const [nx, ny] = polar(CX, CY, R - 12, needleDeg);

  const zones: [number, number, string][] = [
    [-50, -20, 'hsl(var(--destructive))'],
    [-20, -IN_TUNE_CENTS, 'hsl(var(--gold))'],
    [-IN_TUNE_CENTS, IN_TUNE_CENTS, 'rgb(34 197 94)'],
    [IN_TUNE_CENTS, 20, 'hsl(var(--gold))'],
    [20, 50, 'hsl(var(--destructive))'],
  ];

  return (
    <svg viewBox="0 0 240 132" className="w-full max-w-[340px] mx-auto overflow-visible">
      {/* track */}
      <path
        d={arc(CX, CY, R, 180, 0)}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={10}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* colour zones */}
      {zones.map(([a, b, color], i) => (
        <path
          key={i}
          d={arc(CX, CY, R, centsToDeg(a), centsToDeg(b))}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="butt"
          opacity={active ? 0.95 : 0.5}
        />
      ))}
      {/* ticks */}
      {[-50, -25, 0, 25, 50].map((c) => {
        const [x1, y1] = polar(CX, CY, R - 16, centsToDeg(c));
        const [x2, y2] = polar(CX, CY, R + 2, centsToDeg(c));
        return (
          <line
            key={c}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="hsl(var(--foreground))"
            strokeWidth={c === 0 ? 2.5 : 1.5}
            opacity={c === 0 ? 0.85 : 0.4}
          />
        );
      })}
      {/* needle */}
      <line
        x1={CX}
        y1={CY}
        x2={nx}
        y2={ny}
        stroke={inTune ? 'rgb(34 197 94)' : active ? 'hsl(var(--gold))' : 'hsl(var(--muted-foreground))'}
        strokeWidth={4}
        strokeLinecap="round"
        style={{ transition: 'all 90ms linear' }}
      />
      <circle
        cx={CX}
        cy={CY}
        r={7}
        fill={inTune ? 'rgb(34 197 94)' : 'hsl(var(--gold))'}
        opacity={active ? 1 : 0.4}
      />
      <text x={polar(CX, CY, R + 14, centsToDeg(-50))[0]} y={CY + 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">♭</text>
      <text x={polar(CX, CY, R + 14, centsToDeg(50))[0]} y={CY + 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">♯</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export function InstrumentTunerPanel({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<Mode>('instrument');
  const [instrumentId, setInstrumentId] = useState<TunerInstrumentId>('guitar');
  const [a4, setA4] = useState(A4_HZ);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hz, setHz] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [noteLabel, setNoteLabel] = useState<string>('—');
  const [matchedNote, setMatchedNote] = useState<string | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [signalOk, setSignalOk] = useState(false);
  const [level, setLevel] = useState(0);
  const [tuned, setTuned] = useState<string[]>([]);
  const [refNote, setRefNote] = useState<string | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const smoothHzRef = useRef<number | null>(null);
  const stableRef = useRef(0);
  const lostRef = useRef(0);
  const levelRef = useRef(0);
  const holdRef = useRef<{ note: string; since: number } | null>(null);
  const tunedRef = useRef<Set<string>>(new Set());

  const modeRef = useRef(mode);
  const a4Ref = useRef(a4);
  const instrumentRef = useRef(TUNER_INSTRUMENTS[0]);
  const stringsRef = useRef<TunerString[]>(TUNER_INSTRUMENTS[0].strings);
  const lockedRef = useRef<TunerString | null>(null);

  const instrument = TUNER_INSTRUMENTS.find((i) => i.id === instrumentId)!;
  const strings = useMemo(
    () => stringsForCalibration(instrument.strings, a4),
    [instrument, a4]
  );
  const lockedString = strings.find((s) => s.note === lockedNote) ?? null;

  modeRef.current = mode;
  a4Ref.current = a4;
  instrumentRef.current = instrument;
  stringsRef.current = strings;
  lockedRef.current = lockedString;

  const resetReadout = useCallback(() => {
    setHz(null);
    setCents(null);
    setNoteLabel('—');
    setMatchedNote(null);
    setSignalOk(false);
    setLevel(0);
    smoothHzRef.current = null;
    stableRef.current = 0;
    holdRef.current = null;
  }, []);

  // Fresh tuning progress whenever the target set changes.
  useEffect(() => {
    tunedRef.current = new Set();
    setTuned([]);
    setLockedNote(null);
    holdRef.current = null;
  }, [instrumentId, a4, mode]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    stopReferenceTone(0.1);
    setRefNote(null);
    setListening(false);
    resetReadout();
  }, [resetReadout]);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioRef.current;
    const buf = bufferRef.current;
    if (!analyser || !ctx || !buf) return;

    analyser.getFloatTimeDomainData(buf as Float32Array & { buffer: ArrayBuffer });

    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    levelRef.current = levelRef.current * 0.7 + Math.min(1, Math.sqrt(rms) * 2.6) * 0.3;
    setLevel(levelRef.current);

    const inst = instrumentRef.current;
    const chromatic = modeRef.current === 'chromatic';
    const raw = detectPitchHz(buf, ctx.sampleRate, {
      rmsMin: 0.02,
      hzMin: chromatic ? 55 : inst.hzMin,
      hzMax: chromatic ? 1500 : inst.hzMax,
    });

    if (raw == null) {
      lostRef.current += 1;
      stableRef.current = 0;
      if (lostRef.current >= LOST_FRAMES) {
        smoothHzRef.current = null;
        setSignalOk(false);
        setHz(null);
        setCents(null);
        setMatchedNote(null);
        setNoteLabel('—');
        holdRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    lostRef.current = 0;
    const prev = smoothHzRef.current;
    const smoothed = prev == null ? raw : prev * (1 - SMOOTH) + raw * SMOOTH;
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
    const a4Now = a4Ref.current;
    setSignalOk(true);
    setHz(hzNow);
    setNoteLabel(noteNameFromMidi(Math.round(midiFromHz(hzNow, a4Now))));

    let targetNote: string | null = null;
    let centsNow: number | null = null;

    if (chromatic) {
      const t = resolveChromaticTarget(hzNow, a4Now);
      centsNow = t.cents;
      setMatchedNote(null);
    } else {
      const target = resolveTunerTarget(hzNow, stringsRef.current, lockedRef.current);
      if (target) {
        targetNote = target.string.note;
        centsNow = target.cents;
      }
      setMatchedNote(targetNote);
    }
    setCents(centsNow);

    // Tuning-progress tracking (instrument mode only)
    if (!chromatic && targetNote != null && centsNow != null) {
      const now = performance.now();
      const h = holdRef.current;
      if (Math.abs(centsNow) < IN_TUNE_CENTS) {
        if (h && h.note === targetNote) {
          if (now - h.since > HOLD_MS && !tunedRef.current.has(targetNote)) {
            tunedRef.current.add(targetNote);
            setTuned([...tunedRef.current]);
            vibrate(25);
          }
        } else {
          holdRef.current = { note: targetNote, since: now };
        }
      } else if (Math.abs(centsNow) > 14) {
        holdRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
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
      levelRef.current = 0;
      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
      stop();
    }
  };

  useEffect(() => {
    if (!listening) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [listening, tick]);

  const hasTune = signalOk && cents != null;
  const inTune = hasTune && Math.abs(cents) < IN_TUNE_CENTS;

  // Which pitch the reference-tone button targets.
  const referenceTarget: TunerString | null =
    mode === 'instrument'
      ? lockedString ?? strings.find((s) => s.note === matchedNote) ?? null
      : null;

  const toggleReference = (target: TunerString) => {
    if (refNote === target.note) {
      stopReferenceTone(0.15);
      setRefNote(null);
      return;
    }
    playReferenceTone(target.hz);
    setRefNote(target.note);
    window.setTimeout(() => setRefNote((n) => (n === target.note ? null : n)), 2600);
  };

  const toggleLock = (s: TunerString) =>
    setLockedNote((prev) => (prev === s.note ? null : s.note));

  const stepA4 = (delta: number) =>
    setA4((v) => Math.max(A4_MIN, Math.min(A4_MAX, Math.round(v + delta))));

  return (
    <div className={className} data-instrument-tuner>
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Afinador</p>
          <h3 className="text-lg font-bold font-display text-foreground leading-none mt-0.5">
            Precisión PRO
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-border text-muted-foreground">
          A4 = {a4} Hz
        </span>
      </div>

      {/* mode */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 mb-3">
        {(['instrument', 'chromatic'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === m ? 'bg-background text-gold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'instrument' ? 'Por instrumento' : 'Cromático'}
          </button>
        ))}
      </div>

      {/* instrument presets */}
      {mode === 'instrument' && (
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-secondary/60 mb-3">
          {TUNER_INSTRUMENTS.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => setInstrumentId(inst.id)}
              className={`py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                instrumentId === inst.id
                  ? 'bg-background text-gold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {inst.label}
            </button>
          ))}
        </div>
      )}

      {/* calibration */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Calibración
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepA4(-1)}
            className="w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-gold text-sm font-bold"
            aria-label="Bajar A4"
          >
            −
          </button>
          <span className="w-16 text-center text-sm font-mono font-bold text-foreground tabular-nums">
            {a4} Hz
          </span>
          <button
            type="button"
            onClick={() => stepA4(1)}
            className="w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-gold text-sm font-bold"
            aria-label="Subir A4"
          >
            +
          </button>
        </div>
        {a4 !== A4_HZ && (
          <button
            type="button"
            onClick={() => setA4(A4_HZ)}
            className="text-[10px] text-gold hover:underline font-semibold"
          >
            440
          </button>
        )}
      </div>

      {/* gauge + readout */}
      <div
        className={`rounded-2xl border p-4 mb-3 text-center transition-colors ${
          inTune ? 'border-green-500/60 bg-green-500/5' : 'border-border bg-secondary/40'
        }`}
      >
        <TunerGauge cents={hasTune ? cents : null} active={signalOk} inTune={!!inTune} />

        <div className="-mt-3">
          <p
            className={`text-5xl font-display font-bold tabular-nums leading-none ${
              inTune ? 'text-green-500' : 'text-gold'
            }`}
          >
            {noteLabel.replace(/\d/, '')}
            <span className="text-xl text-muted-foreground align-top">
              {noteLabel.match(/\d/)?.[0] ?? ''}
            </span>
          </p>
          <p
            className={`text-sm font-mono font-bold mt-1 ${
              !hasTune
                ? 'text-muted-foreground'
                : inTune
                  ? 'text-green-500'
                  : Math.abs(cents!) > 25
                    ? 'text-destructive'
                    : 'text-foreground'
            }`}
          >
            {!hasTune
              ? listening
                ? 'Toca una nota con claridad…'
                : 'Activa el micrófono'
              : `${cents! > 0 ? '+' : ''}${cents!.toFixed(0)} cents${inTune ? ' · afinado' : ''}`}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5 h-4">
            {hz != null && signalOk
              ? `${hz.toFixed(1)} Hz${matchedNote ? ` · cuerda ${matchedNote}` : ''}`
              : ''}
          </p>
        </div>

        {/* signal meter */}
        <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gold/70 transition-[width] duration-100"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>
      </div>

      {/* string chips */}
      {mode === 'instrument' && (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {lockedString ? `Fijado · ${lockedString.note}` : 'Auto · cuerda más cercana'}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {tuned.length}/{instrument.strings.length} afinadas
              {tuned.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    tunedRef.current = new Set();
                    setTuned([]);
                  }}
                  className="ml-1.5 inline-flex align-middle text-gold hover:text-gold/80"
                  aria-label="Reiniciar progreso"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mb-3">
            <button
              type="button"
              onClick={() => setLockedNote(null)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                lockedNote == null
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-border text-muted-foreground'
              }`}
            >
              Auto
            </button>
            {strings.map((s) => {
              const isTuned = tuned.includes(s.note);
              const isActive = matchedNote === s.note && signalOk;
              return (
                <button
                  key={s.note}
                  type="button"
                  onClick={() => toggleLock(s)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    lockedNote === s.note
                      ? 'border-gold text-gold bg-gold/10'
                      : isActive
                        ? 'border-foreground/50 text-foreground'
                        : isTuned
                          ? 'border-green-500/60 text-green-500 bg-green-500/5'
                          : 'border-border text-muted-foreground'
                  }`}
                >
                  {s.label} {s.note}
                  {isTuned && <Check className="inline w-3 h-3 ml-1 align-middle" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* reference tone */}
      {mode === 'instrument' && (
        <button
          type="button"
          disabled={!referenceTarget}
          onClick={() => referenceTarget && toggleReference(referenceTarget)}
          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border mb-2 transition-colors ${
            !referenceTarget
              ? 'border-border text-muted-foreground/50 cursor-not-allowed'
              : refNote
                ? 'border-gold text-gold bg-gold/10'
                : 'border-border text-foreground hover:border-gold hover:text-gold'
          }`}
        >
          {refNote ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {referenceTarget
            ? refNote
              ? `Detener ${referenceTarget.note}`
              : `Escuchar tono ${referenceTarget.note}`
            : 'Elige o toca una cuerda para oír su tono'}
        </button>
      )}

      {error && <p className="text-xs text-destructive text-center mb-2">{error}</p>}

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

      <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
        Consejo: silencia otras fuentes de sonido y toca una sola cuerda. Mantén la aguja en verde
        (±{IN_TUNE_CENTS} cents) para marcarla como afinada.
      </p>
    </div>
  );
}
