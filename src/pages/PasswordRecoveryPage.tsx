import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { NATIVE_AUTH_REDIRECT } from '@/platform/nativeAuth';

export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!reset) return;
    let active = true;
    const failed = new URLSearchParams(window.location.hash.slice(1)).has('error') || new URLSearchParams(window.location.search).has('error');
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setReady(!failed && !!session);
    });
    void supabase.auth.getSession().then(({ data: sessionData }) => { if (active) setReady(!failed && !!sessionData.session); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [reset]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (reset && (!ready || password.length < 6 || password.length > 72 || password !== confirmation)) {
      setError('Usa entre 6 y 72 caracteres y confirma la misma contraseña.'); return;
    }
    setBusy(true);
    try {
      const result = reset
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Capacitor.isNativePlatform() ? `${NATIVE_AUTH_REDIRECT}?recovery=1` : `${window.location.origin}/auth/restablecer` });
      if (result.error) throw result.error;
      setDone(true); setPassword(''); setConfirmation('');
      if (reset) window.history.replaceState(null, '', window.location.pathname);
    } catch {
      setError(reset ? 'No se pudo cambiar la contraseña. Solicita un enlace nuevo si venció.' : 'No se pudo enviar el correo. Inténtalo más tarde.');
    } finally { setBusy(false); }
  }
  const inputClass = 'w-full rounded-xl bg-secondary border border-border p-3';
  return <main className="min-h-screen flex items-center justify-center p-6"><section className="w-full max-w-sm space-y-5">
    <h1 className="text-2xl font-bold">{reset ? 'Nueva contraseña' : 'Recuperar contraseña'}</h1>
    {done ? <p role="status">{reset ? 'Contraseña actualizada. Ya puedes acceder con tu nueva contraseña.' : 'Si existe una cuenta con ese correo, recibirás un enlace. Revisa también spam. Abre el enlace en el dispositivo donde lo solicitaste.'}</p> : <>
      {reset && !ready ? <p role="status">Abre el enlace de recuperación de tu correo. Si venció o ya se utilizó, solicita uno nuevo.</p> : <form onSubmit={submit} className="space-y-4">
        {reset ? <><label className="block">Nueva contraseña<input className={inputClass} type="password" autoComplete="new-password" minLength={6} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block">Confirmar contraseña<input className={inputClass} type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></> : <label className="block">Correo de tu cuenta<input className={inputClass} type="email" autoComplete="email" maxLength={255} required value={email} onChange={e => setEmail(e.target.value)} /></label>}
        <button disabled={busy} className="w-full gold-gradient rounded-xl p-3 disabled:opacity-60">{busy ? 'Procesando…' : reset ? 'Guardar contraseña' : 'Enviar enlace'}</button>
      </form>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </>}
    {reset && !done && <Link className="block text-gold underline" to="/auth/recuperar">Solicitar otro enlace</Link>}
    <Link className="block text-gold underline" to="/login">Volver al acceso</Link>
  </section></main>;
}
