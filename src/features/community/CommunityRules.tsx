import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RULES_REQUEST } from './moderationApi';
import { toast } from 'sonner';

export function CommunityRulesText() {
  return <div className="space-y-3 text-sm">
    <p>Comparte música y participa con respeto. Publica solo material que tengas derecho a compartir.</p>
    <p>No se permiten acoso, discriminación, amenazas, violencia, explotación sexual, contenido sexual explícito, spam, fraude ni datos personales de otras personas.</p>
    <p>Puedes reportar cantos, cadenas, comentarios y usuarios. Bloquear a una persona oculta su contenido en Comunidad e impide seguirse y comentar en las cadenas del otro mientras estén conectados a sus cuentas.</p>
    <p>El administrador revisa reportes y puede retirar contenido o suspender la participación en Comunidad. Para consultar una decisión o solicitar una revisión, escribe a <a href="mailto:worshiptranspose@gmail.com" className="text-gold underline">worshiptranspose@gmail.com</a>.</p>
    <p>El bloqueo no borra copias ya descargadas ni impide ver contenido público sin iniciar sesión. No publiques información privada.</p>
  </div>;
}
export function CommunityRulesDialog() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const finish = (value: boolean) => { resolver.current?.(value); resolver.current = null; setOpen(false); };
  useEffect(() => {
    const request = (event: Event) => { resolver.current = (event as CustomEvent<(value: boolean) => void>).detail; setAccepted(false); setOpen(true); };
    window.addEventListener(RULES_REQUEST, request);
    return () => { window.removeEventListener(RULES_REQUEST, request); resolver.current?.(false); };
  }, []);
  const save = async () => {
    if (!accepted || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('community_accept_rules');
      if (error) throw error;
      finish(true);
    } catch { toast.error('No se pudo registrar la aceptación. Intenta de nuevo.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!value && !busy) finish(false); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto">
      <DialogTitle>Reglas de Comunidad</DialogTitle>
      <DialogDescription>Antes de publicar, lee y acepta las reglas.</DialogDescription>
      <CommunityRulesText />
      <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />He leído y acepto las reglas de Comunidad.</label>
      <div className="flex gap-3"><button disabled={!accepted || busy} onClick={() => void save()} className="gold-gradient rounded-lg px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? 'Guardando…' : 'Aceptar y continuar'}</button><button disabled={busy} onClick={() => finish(false)}>Cancelar</button></div>
      <Link to="/privacidad" onClick={() => finish(false)} className="text-gold underline">Política de privacidad</Link>
    </DialogContent>
  </Dialog>;
}
