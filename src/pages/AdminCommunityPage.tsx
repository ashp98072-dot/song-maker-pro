import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/context/useApp';
import { fetchModerationReports, resolveModerationReport, REPORT_REASONS, type ModerationReport, type ReportReason } from '@/features/community/moderationApi';

const STATUS_LABELS: Record<string, string> = { open: 'Pendiente', dismissed: 'Descartado', hidden: 'Contenido retirado', suspended: 'Usuario suspendido', restored: 'Restaurado' };
export default function AdminCommunityPage() {
  const { isAdmin, isLoading } = useApp();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setError('');
    try { setReports(await fetchModerationReports()); }
    catch { setError('No se pudieron cargar los reportes. Revisa la conexión y la migración de moderación.'); }
    finally { setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void load(); }, [load]);
  const resolve = async (report: ModerationReport, action: string) => {
    if (busy) return;
    if (['hide', 'suspend'].includes(action) && !window.confirm(action === 'hide' ? '¿Retirar este contenido de Comunidad? Se puede restaurar desde el reporte.' : '¿Suspender la participación pública de este usuario? Su contenido dejará de ser visible.')) return;
    setBusy(report.id);
    try { await resolveModerationReport(report.id, action, notes[report.id] ?? report.resolution); toast.success('Decisión guardada'); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo guardar'); }
    finally { setBusy(null); }
  };
  if (isLoading) return <p className="container p-6">Cargando…</p>;
  if (!isAdmin) return <p className="container p-6">Solo el administrador puede revisar reportes.</p>;
  return <main className="container max-w-4xl px-4 py-8 space-y-5">
    <Link to="/comunidad" className="text-gold">← Comunidad</Link>
    <h1 className="text-2xl font-bold">Moderación de Comunidad</h1>
    <p className="text-sm text-muted-foreground">Revisa el contexto antes de decidir. Retirar contenido y suspender usuarios son acciones reversibles. No comuniques la identidad de quien reporta.</p>
    <button onClick={() => void load()} disabled={busy !== null} className="text-gold underline">Actualizar reportes</button>
    {loading ? <p>Cargando…</p> : error ? <p role="alert">{error}</p> : !reports.length ? <p>No hay reportes.</p> : reports.map(report => {
      const snapshot = report.snapshot && typeof report.snapshot === 'object' && !Array.isArray(report.snapshot) ? report.snapshot : {};
      return <section key={report.id} className="border border-border bg-card rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">{String(snapshot.title ?? 'Contenido reportado')} · {STATUS_LABELS[report.status] ?? report.status}</h2>
        <p className="text-sm">{REPORT_REASONS[report.reason as ReportReason] ?? report.reason} · {new Date(report.created_at).toLocaleString('es')}</p>
        <p className="text-sm whitespace-pre-wrap">{report.details || 'Sin detalles adicionales'}</p>
        <details><summary className="text-gold cursor-pointer">Ver contenido y contexto al reportar</summary><pre className="whitespace-pre-wrap break-all text-xs max-h-80 overflow-auto mt-2">{JSON.stringify(report.snapshot, null, 2)}</pre></details>
        <Link to={`/perfil/${report.target_user_id}`} className="text-gold underline text-sm">Perfil reportado</Link>
        <label className="block text-sm">Nota de la decisión<textarea maxLength={1000} value={notes[report.id] ?? report.resolution} onChange={e => setNotes(prev => ({ ...prev, [report.id]: e.target.value }))} className="block w-full bg-secondary border border-border p-2 rounded-lg mt-1" /></label>
        <div className="flex flex-wrap gap-3 text-sm">
          {report.kind !== 'user' && <button disabled={busy !== null} onClick={() => void resolve(report, 'hide')} className="text-destructive underline">Retirar contenido</button>}
          <button disabled={busy !== null} onClick={() => void resolve(report, 'suspend')} className="text-destructive underline">Suspender usuario</button>
          <button disabled={busy !== null} onClick={() => void resolve(report, 'dismiss')} className="text-gold underline">Descartar reporte</button>
          {report.kind !== 'user' && <button disabled={busy !== null} onClick={() => void resolve(report, 'restore')} className="text-gold underline">Restaurar contenido</button>}
          <button disabled={busy !== null} onClick={() => void resolve(report, 'unsuspend')} className="text-gold underline">Quitar suspensión</button>
        </div>
      </section>;
    })}
    <p className="text-xs text-muted-foreground">Se muestran hasta 200 reportes, primero los pendientes. Los reportes cerrados sin medidas activas y con más de 90 días se depuran al abrir este panel.</p>
  </main>;
}
