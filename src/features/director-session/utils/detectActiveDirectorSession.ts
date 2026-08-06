import { supabase } from '@/integrations/supabase/client';
import { deactivateAllMyPreviousSessions } from '@/features/director-session/utils/ghostSessionCleanup';
import { resolveAuthenticatedDirector } from '@/features/director-session/utils/liveSessionAuth';
import {
  mapLiveSessionRow,
  type SessionRecoveryState,
} from '@/features/director-session/utils/sessionRecovery';

export type ActiveDirectorSession = {
  code: string;
  recovery: SessionRecoveryState;
};

/**
 * Active director session for the current user (DB source of truth).
 * Collapses duplicate ghost rows — keeps the most recently updated one.
 */
export async function fetchActiveDirectorSession(): Promise<ActiveDirectorSession | null> {
  const auth = await resolveAuthenticatedDirector();
  if (!auth.ok) return null;

  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('director_id', auth.userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (error || !data?.length) return null;

  const newest = data[0];

  if (data.length > 1) {
    const ghostCodes = data.slice(1).map((r) => r.code);
    console.log('[GHOST_SESSIONS] multiple active rows — keeping newest', {
      kept: newest.code,
      ghosts: ghostCodes,
    });
    await deactivateAllMyPreviousSessions(newest.code);
  }

  return {
    code: newest.code,
    recovery: mapLiveSessionRow(newest),
  };
}

/** All active session codes for the current director (diagnostics / UI). */
export async function fetchAllActiveDirectorSessionCodes(): Promise<string[]> {
  const auth = await resolveAuthenticatedDirector();
  if (!auth.ok) return [];

  const { data, error } = await supabase
    .from('live_sessions')
    .select('code')
    .eq('director_id', auth.userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (error || !data?.length) return [];
  return data.map((r) => r.code);
}
