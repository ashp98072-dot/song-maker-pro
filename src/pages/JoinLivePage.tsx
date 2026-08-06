import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Radio } from 'lucide-react';
import { FEATURES } from '@/config/features';
import { normalizeSessionCode } from '@/features/director-session/types';
import { useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { navigateAfterSimpleLiveJoin } from '@/features/simple-live-sync/navigateAfterSimpleLiveJoin';
import { useApp } from '@/context/AppContext';

/**
 * Deep-link join: /unirse/:code
 * Auto-joins as follower (after public guest if needed) and opens the live song/setlist.
 */
export default function JoinLivePage() {
  const { code: rawCode } = useParams();
  const navigate = useNavigate();
  const { songs } = useApp();
  const simpleLive = useSimpleLiveSyncOptional();
  const [phase, setPhase] = useState<'joining' | 'waiting' | 'error'>('joining');
  const [message, setMessage] = useState('Conectando a la sesión…');
  const startedRef = useRef(false);

  const code = normalizeSessionCode(rawCode || '');

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
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      if (simpleLive.role === 'follower' && simpleLive.code === code) {
        setPhase('waiting');
        setMessage('Ya estás en la sesión…');
        return;
      }
      if (simpleLive.role === 'director') {
        setPhase('error');
        setMessage('Ya eres director de otra sesión. Detén esa sesión para unirte.');
        return;
      }

      const ok = await simpleLive.joinAsFollower(code);
      if (!ok) {
        setPhase('error');
        setMessage('No se pudo unir. Revisa el código o pide uno nuevo al director.');
        return;
      }
      setPhase('waiting');
      setMessage('Esperando al director…');
    })();
  }, [code, simpleLive]);

  useEffect(() => {
    if (phase !== 'waiting' || !simpleLive?.lastState) return;
    navigateAfterSimpleLiveJoin(navigate, simpleLive.lastState, songs);
  }, [phase, simpleLive?.lastState, navigate, songs, simpleLive]);

  return (
    <div className="container max-w-md px-4 py-16 text-center">
      <Radio className="mx-auto mb-4 h-10 w-10 text-gold" />
      <h1 className="font-display text-xl font-bold text-foreground">Unirse en vivo</h1>
      <p className="mt-1 font-mono text-lg tracking-widest text-gold">{code || '—'}</p>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      {phase === 'joining' || phase === 'waiting' ? (
        <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-gold" />
      ) : (
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold hover:text-gold"
        >
          Volver al inicio
        </Link>
      )}
    </div>
  );
}
