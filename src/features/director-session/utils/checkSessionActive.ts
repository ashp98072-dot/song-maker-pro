import { supabase } from '@/integrations/supabase/client';
import { normalizeSessionCode } from '@/features/director-session/types';
import { getLiveSessionByCode } from '@/features/director-session/utils/sessionRecovery';

export type SessionActiveCheckReason = 'ok' | 'invalid' | 'not_found' | 'inactive' | 'query_error';

export type SessionActiveCheckResult = {
  active: boolean;
  reason: SessionActiveCheckReason;
  code: string;
};

/** User-facing message when join/reconnect is blocked. */
export function sessionJoinBlockedMessage(reason: SessionActiveCheckReason): string {
  switch (reason) {
    case 'inactive':
      return 'El director cerró la sesión';
    case 'not_found':
      return 'Esta sesión ya no está activa';
    case 'query_error':
      return 'No se pudo verificar la sesión. Revisa tu conexión e inténtalo de nuevo.';
    case 'invalid':
      return 'Código de sesión inválido';
    default:
      return 'Sesión no disponible';
  }
}

type LiveSessionRow = { code: string; is_active: boolean };

function isPostgrestNoRowsError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === 'PGRST116';
}

function rowIsActive(row: LiveSessionRow | null | undefined): boolean {
  return row?.is_active === true;
}

async function queryLiveSessionByCode(
  normalized: string,
  mode: 'exact' | 'ilike'
): Promise<{ data: LiveSessionRow | null; error: { message: string; code?: string } | null }> {
  let query = supabase.from('live_sessions').select('code, is_active');

  query =
    mode === 'exact'
      ? query.eq('code', normalized)
      : query.ilike('code', normalized);

  const { data, error } = await query.maybeSingle();

  const isActiveValue = data?.is_active ?? null;

  if (data && data.is_active === false) {
    console.error('[CHECK_SESSION] is_active is FALSE even after activation attempt', {
      code: normalized,
      mode,
      is_active: false,
      message: 'live_sessions row exists but is_active=false (director may have closed or activation failed)',
    });
  }

  console.log('[CHECK_SESSION] is_active:', isActiveValue, {
    code: normalized,
    mode,
    result: data ?? null,
    is_active: isActiveValue,
    error: error
      ? { message: error.message, code: error.code ?? null, details: error.details ?? null }
      : null,
  });

  if (error && !isPostgrestNoRowsError(error)) {
    return { data: null, error };
  }

  return { data: (data as LiveSessionRow | null) ?? null, error: null };
}

/**
 * Queries live_sessions for an active director session.
 * DB column is `code` (not session_code).
 */
export async function querySessionActive(code: string): Promise<SessionActiveCheckResult> {
  const normalized = normalizeSessionCode(code);

  if (normalized.length < 4) {
    console.log('[CHECK_SESSION]', {
      code: normalized,
      result: null,
      error: { message: 'code too short', input: code },
    });
    return { active: false, reason: 'invalid', code: normalized };
  }

  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  if (!authSession?.user) {
    console.log('[CHECK_SESSION]', {
      code: normalized,
      result: null,
      error: { message: 'no authenticated user — RLS may hide live_sessions rows' },
    });
  }

  const exact = await queryLiveSessionByCode(normalized, 'exact');
  if (exact.error) {
    return { active: false, reason: 'query_error', code: normalized };
  }

  let row = exact.data;

  if (!row) {
    const fuzzy = await queryLiveSessionByCode(normalized, 'ilike');
    if (fuzzy.error) {
      return { active: false, reason: 'query_error', code: normalized };
    }
    row = fuzzy.data;
  }

  if (!row) {
    const rpcRow = await getLiveSessionByCode(normalized);
    if (rpcRow) {
      if (rpcRow.is_active === false) {
        console.warn('[CHECK_SESSION]', {
          code: normalized,
          is_active: false,
          source: 'rpc',
          message: 'RPC returned row with is_active=false',
        });
      }
      console.warn('[RLS_BLOCKED]', {
        code: normalized,
        reason: 'join precheck: table empty, RPC returned row',
      });
      row = { code: rpcRow.code, is_active: rpcRow.is_active };
    }
  }

  if (!row) {
    if (!authSession?.user) {
      console.warn('[RLS_BLOCKED]', {
        code: normalized,
        reason: 'join precheck: no row from table or RPC',
        authUserId: null,
      });
    }
    return { active: false, reason: 'not_found', code: normalized };
  }

  if (!rowIsActive(row)) {
    console.error('[CHECK_SESSION] is_active is FALSE even after activation attempt', {
      code: normalized,
      result: row,
      is_active: row.is_active,
    });
    return { active: false, reason: 'inactive', code: row.code };
  }

  console.log('[CHECK_SESSION]', {
    code: normalized,
    result: row,
    error: null,
    success: true,
  });

  return { active: true, reason: 'ok', code: row.code };
}

/** @alias Same as querySessionActive — used by join/reconnect guards. */
export const checkSessionActive = querySessionActive;

/** True when the session row exists and is_active = true. */
export async function checkSessionExists(code: string): Promise<boolean> {
  const result = await querySessionActive(code);
  return result.active;
}
