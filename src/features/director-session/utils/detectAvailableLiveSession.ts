import { supabase } from '@/integrations/supabase/client';
import {
  readStoredLiveSession,
  resolveLiveSessionForReconnect,
  type SessionRecoveryState,
  type StoredLiveSessionRole,
} from '@/features/director-session/utils/sessionRecovery';
import { hasSpectatorSessionOptOut } from '@/features/director-session/utils/spectatorSessionOptOut';

export type DetectedLiveSession = {
  code: string;
  recovery: SessionRecoveryState;
  storedRole: StoredLiveSessionRole;
};

/** Detecta sesión guardada sin unir al canal (solo espectador / follower). */
export async function detectAvailableSpectatorSession(): Promise<DetectedLiveSession | null> {
  if (hasSpectatorSessionOptOut()) return null;

  const stored = readStoredLiveSession();
  if (!stored?.code) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const recovery = await resolveLiveSessionForReconnect(stored.code);
  if (!recovery) return null;

  const isOwner = session.user.id === recovery.directorId;

  if (stored.role === 'director' && isOwner) {
    return null;
  }

  if (stored.role === 'director' && !isOwner) {
    return null;
  }

  return {
    code: recovery.code,
    recovery,
    storedRole: 'follower',
  };
}
