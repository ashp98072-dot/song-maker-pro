import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Radio } from 'lucide-react';
import { FEATURES } from '@/config/features';
import { normalizeSessionCode } from '@/features/director-session/types';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { navigateAfterSimpleLiveJoin } from '@/features/simple-live-sync/navigateAfterSimpleLiveJoin';
import { useApp } from '@/context/AppContext';

const WAIT_MS = 18_000;

/**
 * Deep-link join: /unirse/:code
 * Includes timeout + cancel so guests never stay stuck loading.
 */
export default function JoinLivePage() {
  const { code: rawCode } = useParams();
  const navigate = useNavigate();
  const { songs } = useApp();
  const simpleLive = useSimpleLiveSyncOptional();
  const [phase, setPhase] = useState<'joining' | 'waiting' | 'error'>('joining');
  const [message, setMessage] = useState('Conectando a la sesión…');
  const [attempt, setAttempt] = useState(0);
  const navigatedRef = useRef(false);

  const code = normalizeSessionCode(rawCode || '');

  const cancelAndLeave = useCallback(async () => {
    try {
      await simpleLive?.leave();
    } catch {
      /* ignore */
    }
    navigate('/', { replace: true });
  }, [navigate, simpleLive]);

  useEffect(() => {
    if (!FEATURES.SIMPLE_LIVE_SYNC) {
      setPhase('error');
      setMessage('La sincronización en vivo no está disponible.');
      return;
    }
    if (code.length < 4) {
      setPhase('error');
      setMessage('Código inválido.');
      return;
    }
    if (!simpleLive) return;

    let cancelled = false;
    navigatedRef.current = false;
    setPhase('joining');
    setMessage('Conectando a la sesión…');

    void (async () => {
      if (simpleLive.role === 'director' && simpleLive.code !== code) {
        if (!cancelled) {
          setPhase('error');
          setMessage('Ya eres director de otra sesión. Detén esa sesión para unirte.');
        }
        return;
      }

      if (!(simpleLive.role === 'follower' && simpleLive.code === code)) {
        if (simpleLive.role !== 'idle') {
          await simpleLive.leave();
        }
        const ok = await simpleLive.joinAsFollower(code);
        if (cancelled) return;
        if (!ok) {
          setPhase('error');
          setMessage('No se pudo unir. Revisa el código o pide uno nuevo al director.');
          return;
        }
      }

      if (cancelled) return;
      setPhase('waiting');
      setMessage('Esperando al director… Debe tener la app abierta en la canción.');
    })();

    return () => {
      cancelled = true;
    };
  }, [code, simpleLive, attempt]);

  useEffect(() => {
    if (phase !== 'waiting' || !simpleLive?.lastState || navigatedRef.current) return;
    const ok = navigateAfterSimpleLiveJoin(navigate, simpleLive.lastState, songs);
    if (ok) navigatedRef.current = true;
  }, [phase, simpleLive?.lastState, navigate, songs, simpleLive]);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const id = window.setTimeout(() => {
      if (navigatedRef.current) return;
      if (simpleLive?.lastState) {
        const ok = navigateAfterSimpleLiveJoin(navigate, simpleLive.lastState, songs);
        if (ok) {
          navigatedRef.current = true;
          return;
        }
      }
      setPhase('error');
      setMessage(
        'El director no respondió a tiempo. Pide que abra la canción en vivo y vuelve a intentar.'
      );
    }, WAIT_MS);
    return () => window.clearTimeout(id);
  }, [phase, attempt, simpleLive, navigate, songs]);

  return (
    <div className="container max-w-md px-4 py-16 text-center">
      <Radio className="mx-auto mb-4 h-10 w-10 text-gold" />
      <h1 className="font-display text-xl font-bold text-foreground">Unirse en vivo</h1>
      <p className="mt-1 font-mono text-lg tracking-widest text-gold">{code || '—'}</p>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      {phase === 'joining' || phase === 'waiting' ? (
        <>
          <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-gold" />
          <button
            type="button"
            onClick={() => void cancelAndLeave()}
            className="mt-6 inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold hover:text-gold"
          >
            Cancelar y salir
          </button>
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex rounded-xl gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => void cancelAndLeave()}
            className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            Salir
          </button>
          <Link to="/" className="text-xs text-muted-foreground underline underline-offset-2">
            Ir al inicio
          </Link>
        </div>
      )}
    </div>
  );
}
