import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { REPORT_REASONS, reportContent, setUserBlocked, type ReportKind, type ReportReason } from './moderationApi';

export function ModerationActions({ kind, targetId, ownerId, onBlocked }: { kind: ReportKind; targetId: string; ownerId?: string; onBlocked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('abuse');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportUser, setReportUser] = useState(false);
  const start = async (blocking = false) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { toast.error('Inicia sesión para reportar o bloquear'); return; }
    if (data.user.id === ownerId || (kind === 'user' && data.user.id === targetId)) { toast.message('Este contenido es tuyo'); return; }
    setConfirmBlock(blocking); setBlock(false); setReportUser(false); setDetails(''); setOpen(true);
  };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!confirmBlock) await reportContent(reportUser && ownerId ? 'user' : kind, reportUser && ownerId ? ownerId : targetId, reason, details);
      // A successful report is retained even if blocking fails; explain the partial result.
      if ((block || confirmBlock) && ownerId) {
        try { await setUserBlocked(ownerId, true); onBlocked?.(); }
        catch (error) { toast.error(`${confirmBlock ? '' : 'Reporte enviado. '}${error instanceof Error ? error.message : 'No se pudo bloquear'}`); return; }
      }
      toast.success(confirmBlock ? 'Usuario bloqueado' : 'Reporte enviado al administrador');
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo enviar'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap gap-3 text-xs mt-2">
    <button type="button" onClick={() => void start()} className="text-muted-foreground hover:text-gold underline">Reportar</button>
    {ownerId && <button type="button" onClick={() => void start(true)} className="text-muted-foreground hover:text-gold underline">Bloquear usuario</button>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent>
      <DialogTitle>{confirmBlock ? 'Bloquear usuario' : 'Reportar a moderación'}</DialogTitle>
      <DialogDescription>{confirmBlock ? 'Su contenido dejará de aparecer en Comunidad y se eliminará el seguimiento mutuo. Puedes desbloquearlo desde Comunidad.' : 'El reporte es privado y solo el administrador podrá consultarlo.'}</DialogDescription>
      {!confirmBlock && <>
        {ownerId && kind !== 'user' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={reportUser} onChange={e => setReportUser(e.target.checked)} />Reportar al usuario en lugar de este contenido</label>}
        <label className="text-sm">Motivo<select value={reason} onChange={e => setReason(e.target.value as ReportReason)} className="block w-full bg-secondary border border-border rounded-lg p-2 mt-1">{Object.entries(REPORT_REASONS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-sm">Detalles (opcional)<textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} className="block w-full bg-secondary border border-border rounded-lg p-2 mt-1" placeholder="Describe lo ocurrido. No incluyas contraseñas." /></label>
        {ownerId && <label className="flex gap-2 text-sm"><input type="checkbox" checked={block} onChange={e => setBlock(e.target.checked)} />También bloquear a este usuario</label>}
      </>}
      <div className="flex gap-3"><button disabled={busy} onClick={() => void submit()} className="gold-gradient rounded-lg px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? 'Procesando…' : confirmBlock ? 'Bloquear' : 'Enviar reporte'}</button><button disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></div>
    </DialogContent></Dialog>
  </div>;
}
