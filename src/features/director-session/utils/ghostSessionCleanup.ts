import { supabase } from '@/integrations/supabase/client';
import { normalizeSessionCode } from '@/features/director-session/types';
import { resolveAuthenticatedDirector } from '@/features/director-session/utils/liveSessionAuth';

/** In-flight / live director code that must not be wiped by ghost cleanup. */
let protectedDirectorSessionCode: string | null = null;

/** Protect a director session code from `deactivateAllMyPreviousSessions` races. */
export function protectDirectorLiveSessionCode(code: string | null | undefined): void {
  const normalized = code ? normalizeSessionCode(code) : '';
  protectedDirectorSessionCode = normalized.length >= 4 ? normalized : null;
}

export function getProtectedDirectorLiveSessionCode(): string | null {
  return protectedDirectorSessionCode;
}

function resolveKeepCode(keepCode?: string | null): string | null {
  const explicit = keepCode ? normalizeSessionCode(keepCode) : '';
  if (explicit.length >= 4) return explicit;
  return protectedDirectorSessionCode;
}

/**
 * Deactivates all active live_sessions for the current director.
 * @param keepCode Optional session code to keep active (e.g. current live session).
 * @returns Number of rows deactivated.
 */
export async function deactivateAllMyPreviousSessions(keepCode?: string): Promise<number> {
  const auth = await resolveAuthenticatedDirector();
  if (!auth.ok) {
    console.log('[GHOST_SESSIONS]', { deactivated: 0, reason: 'not_authenticated' });
    return 0;
  }

  const normalizedKeep = resolveKeepCode(keepCode);
  let deactivated = 0;

  const { data: rpcCount, error: rpcError } = await supabase.rpc(
    'deactivate_director_live_sessions',
    { p_keep_code: normalizedKeep }
  );

  if (!rpcError && typeof rpcCount === 'number') {
    deactivated = rpcCount;
  } else {
    if (rpcError) {
      console.warn('[GHOST_SESSIONS] RPC failed — client fallback', { error: rpcError.message });
    }

    let query = supabase
      .from('live_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('director_id', auth.userId)
      .eq('is_active', true);

    if (normalizedKeep) {
      query = query.neq('code', normalizedKeep);
    }

    const { data, error } = await query.select('code');
    if (error) {
      console.error('[GHOST_SESSIONS] client deactivate failed', { error: error.message });
    } else {
      deactivated = data?.length ?? 0;
    }
  }

  console.log('[GHOST_SESSIONS]', {
    deactivated,
    keepCode: normalizedKeep,
    protectedCode: protectedDirectorSessionCode,
    directorId: auth.userId,
  });

  return deactivated;
}
