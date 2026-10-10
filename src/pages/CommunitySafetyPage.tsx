import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CommunityRulesText } from '@/features/community/CommunityRules';
import { fetchMyBlocks, setUserBlocked, MODERATION_CHANGED } from '@/features/community/moderationApi';
import { useApp } from '@/context/useApp';

export default function CommunitySafetyPage() {
  const { isGuest } = useApp();
  const [blocks, setBlocks] = useState<Awaited<ReturnType<typeof fetchMyBlocks>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (isGuest) return;
    setLoading(true); setError('');
    try { setBlocks(await fetchMyBlocks()); }
    catch { setError('No se pudieron cargar tus bloqueos. Inicia sesión o vuelve a intentarlo.'); }
    finally { setLoading(false); }
  }, [isGuest]);
  useEffect(() => { void load(); window.addEventListener(MODERATION_CHANGED, load); return () => window.removeEventListener(MODERATION_CHANGED, load); }, [load]);
  const unblock = async (id: string) => {
    setBusy(id);
    try { await setUserBlocked(id, false); toast.success('Usuario desbloqueado. El seguimiento no se restaura automáticamente.'); }
    catch { toast.error('No se pudo desbloquear'); }
    finally { setBusy(null); }
  };
  return <article className="container max-w-3xl px-4 py-8 space-y-5">
    <Link to="/comunidad" className="text-gold">← Comunidad</Link>
    <h1 className="text-2xl font-bold">Reglas y seguridad de Comunidad</h1>
    <CommunityRulesText />
    <h2 className="text-xl font-semibold">Usuarios que bloqueaste</h2>
    {isGuest ? <p>Inicia sesión para gestionar bloqueos.</p> : loading ? <p>Cargando…</p> : error ? <><p role="alert">{error}</p><button onClick={() => void load()} className="text-gold">Reintentar</button></> : !blocks.length ? <p>No tienes usuarios bloqueados.</p> : <ul className="space-y-3">{blocks.map(row => <li key={row.user_id} className="border border-border rounded-xl p-3 space-y-2"><p className="text-sm font-semibold">{row.display_name}</p><p className="text-xs text-muted-foreground">Bloqueado el {new Date(row.created_at).toLocaleDateString('es')}</p><button disabled={busy !== null} onClick={() => void unblock(row.user_id)} className="text-gold underline">{busy === row.user_id ? 'Desbloqueando…' : 'Desbloquear'}</button></li>)}</ul>}
  </article>;
}
