import { supabase } from '@/integrations/supabase/client';
import { resolveLiveSessionForReconnect } from './sessionRecovery';

/** Stop stale recovery work at every asynchronous boundary. */
export async function loadSessionRecovery(
  codeCandidate: string,
  fallbackCode: string | undefined,
  isCancelled: () => boolean,
) {
  let recovery = await resolveLiveSessionForReconnect(codeCandidate);
  if (isCancelled()) return null;
  let code = codeCandidate.trim().toUpperCase();
  if (!recovery && fallbackCode && fallbackCode.length >= 4) {
    recovery = await resolveLiveSessionForReconnect(fallbackCode);
    if (isCancelled()) return null;
    code = fallbackCode.trim().toUpperCase();
  }
  if (!recovery) return { code, recovery: null, session: null };
  const { data: { session } } = await supabase.auth.getSession();
  if (isCancelled()) return null;
  return { code, recovery, session };
}
