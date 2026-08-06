import { supabase } from '@/integrations/supabase/client';
import { normalizeSessionCode } from '@/features/director-session/types';
import { followPrefLog, writeFollowDirector } from '@/features/director-session/utils/followDirector';
import { writeLiveSessionPersistence } from '@/features/director-session/utils/liveSessionPersistence';
import type { StoredLiveSessionRole } from '@/features/director-session/utils/sessionRecovery';

/**
 * Persists follow-director preference for this client (localStorage + app persistence).
 * Directors may also patch live_sessions.follow_director on their session row.
 */
export async function persistFollowDirectorPreference(opts: {
  sessionCode: string;
  followDirector: boolean;
  role: StoredLiveSessionRole;
  connected?: boolean;
  asDirector?: boolean;
}): Promise<void> {
  const code = normalizeSessionCode(opts.sessionCode);
  if (code.length < 4) return;

  writeFollowDirector(opts.followDirector);
  writeLiveSessionPersistence({
    role: opts.role,
    sessionCode: code,
    connected: opts.connected ?? true,
    followDirector: opts.followDirector,
    passiveMode: !opts.followDirector,
  });

  if (!opts.asDirector) {
    followPrefLog('follower preference saved (local)', { code, followDirector: opts.followDirector });
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    followPrefLog('skip live_sessions patch — no auth', { code });
    return;
  }

  const { error } = await supabase
    .from('live_sessions')
    .update({
      follow_director: opts.followDirector,
      updated_at: new Date().toISOString(),
    })
    .eq('code', code);

  if (error) {
    followPrefLog('live_sessions follow_director patch failed', {
      code,
      message: error.message,
    });
    return;
  }

  followPrefLog('live_sessions follow_director patched', {
    code,
    followDirector: opts.followDirector,
  });
}
