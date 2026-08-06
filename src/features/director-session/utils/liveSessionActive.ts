import { supabase } from '@/integrations/supabase/client';
import { normalizeSessionCode } from '@/features/director-session/types';

export const FORCE_ACTIVATE_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type LiveSessionActiveVerify = {
  code: string;
  is_active: boolean | null;
  rowFound: boolean;
  director_id: string | null;
};

/** SELECT + log current is_active (source of truth for client-side checks). */
export async function verifyLiveSessionActiveState(code: string): Promise<LiveSessionActiveVerify> {
  const normalized = normalizeSessionCode(code);
  const { data, error } = await supabase
    .from('live_sessions')
    .select('code, is_active, director_id')
    .eq('code', normalized)
    .maybeSingle();

  const result: LiveSessionActiveVerify = {
    code: normalized,
    is_active: data?.is_active ?? null,
    rowFound: !!data,
    director_id: data?.director_id ?? null,
  };

  if (error) {
    console.error('[LIVE_SESSION_VERIFY]', {
      ...result,
      error: error.message,
    });
  }

  return result;
}

async function clientUpdateIsActiveTrue(code: string): Promise<string | null> {
  const normalized = normalizeSessionCode(code);
  const { error } = await supabase
    .from('live_sessions')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('code', normalized);

  return error?.message ?? null;
}

/** SECURITY DEFINER RPC — bypasses client RLS UPDATE edge cases. */
export async function activateLiveSessionViaRpc(code: string): Promise<boolean> {
  const normalized = normalizeSessionCode(code);
  const { data, error } = await supabase.rpc('activate_live_session', {
    p_code: normalized,
  });

  if (error) {
    console.warn('[LIVE_SESSION_ACTIVE] RPC failed', {
      code: normalized,
      error: error.message,
    });
    return false;
  }

  const row = (Array.isArray(data) ? data[0] : data) as { is_active?: boolean; code?: string } | null;
  const isActive = row?.is_active === true;
  console.log('[LIVE_SESSION_ACTIVE] RPC', {
    code: normalized,
    is_active: row?.is_active ?? null,
    ok: isActive,
    rowCode: row?.code ?? null,
  });
  return isActive;
}

/**
 * UPDATE is_active=true + verify, up to `maxAttempts` times.
 * Each attempt: client UPDATE → verify → RPC → verify.
 */
export async function forceUpdateAndVerifyLiveSessionActive(
  code: string,
  maxAttempts: number = FORCE_ACTIVATE_MAX_ATTEMPTS
): Promise<boolean> {
  const normalized = normalizeSessionCode(code);
  if (normalized.length < 4) return false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const updateError = await clientUpdateIsActiveTrue(normalized);
    let verify = await verifyLiveSessionActiveState(normalized);

    console.log('[LIVE_SESSION_FORCE_ACTIVE_VERIFY]', {
      code: normalized,
      attempt,
      maxAttempts,
      phase: 'client-update',
      is_active: verify.is_active,
      rowFound: verify.rowFound,
      updateError,
    });

    if (verify.is_active === true) return true;

    const rpcOk = await activateLiveSessionViaRpc(normalized);
    verify = await verifyLiveSessionActiveState(normalized);

    console.log('[LIVE_SESSION_FORCE_ACTIVE_VERIFY]', {
      code: normalized,
      attempt,
      maxAttempts,
      phase: 'rpc',
      rpcOk,
      is_active: verify.is_active,
      rowFound: verify.rowFound,
    });

    if (verify.is_active === true) return true;

    if (attempt < maxAttempts) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  const final = await verifyLiveSessionActiveState(normalized);
  console.error('[LIVE_SESSION_FORCE_ACTIVE_VERIFY] exhausted attempts', {
    code: normalized,
    is_active: final.is_active,
    rowFound: final.rowFound,
    message: 'is_active is FALSE even after activation attempt',
  });
  return false;
}

/** Forces is_active=true with retries and RPC fallback; returns verified state. */
export async function activateLiveSessionRow(
  code: string,
  _directorId?: string
): Promise<boolean> {
  return forceUpdateAndVerifyLiveSessionActive(code, FORCE_ACTIVATE_MAX_ATTEMPTS);
}

/** Marks session inactive on director end / leave. */
export async function deactivateLiveSessionRow(code: string): Promise<boolean> {
  const normalized = normalizeSessionCode(code);
  if (normalized.length < 4) return false;

  const { data, error } = await supabase
    .from('live_sessions')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('code', normalized)
    .select('code, is_active')
    .maybeSingle();

  console.log('[LIVE_SESSION_INACTIVE]', {
    code: normalized,
    is_active: data?.is_active ?? null,
    error: error?.message ?? null,
  });

  if (error) {
    console.error('[LIVE_SESSION_INACTIVE] failed', { code: normalized, error: error.message });
    return false;
  }

  return data?.is_active === false;
}
