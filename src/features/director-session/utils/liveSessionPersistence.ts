import { readFollowDirector } from '@/features/director-session/utils/followDirector';
import {
  LIVE_SESSION_STORAGE_KEY,
  readStoredLiveSession,
  type StoredLiveSessionRole,
} from '@/features/director-session/utils/sessionRecovery';

export const LIVE_SESSION_PERSISTENCE_KEY = 'worshiptranspose-live-session';
export const LIVE_SESSION_RECOVERY_SESSION_KEY = 'worshiptranspose-live-session-recovery';

export type LiveSessionPersistenceState = {
  role: StoredLiveSessionRole;
  sessionCode: string;
  connected: boolean;
  followDirector: boolean;
  passiveMode: boolean;
  lastRoute?: string;
  lastSongId?: string;
  lastSetlistId?: string;
  lastViewMode?: string;
  joinedAt: number;
  lastHeartbeatAt?: number;
  directorAwayFromScope?: boolean;
};

function safeParse(raw: string | null): LiveSessionPersistenceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LiveSessionPersistenceState;
    if (
      !parsed?.sessionCode ||
      (parsed.role !== 'director' && parsed.role !== 'follower')
    ) {
      return null;
    }
    return {
      ...parsed,
      sessionCode: parsed.sessionCode.trim().toUpperCase(),
    };
  } catch {
    return null;
  }
}

/** Migrates legacy `worship-live-session` into the new persistence shape. */
export function readLiveSessionPersistence(): LiveSessionPersistenceState | null {
  try {
    const modern = safeParse(localStorage.getItem(LIVE_SESSION_PERSISTENCE_KEY));
    if (modern) return modern;

    const legacy = readStoredLiveSession();
    if (!legacy?.code) return null;

  const migrated: LiveSessionPersistenceState = {
    role: legacy.role,
    sessionCode: legacy.code.trim().toUpperCase(),
    connected: true,
    followDirector: readFollowDirector(),
    passiveMode: false,
    joinedAt: Date.now(),
  };
  try {
    localStorage.setItem(LIVE_SESSION_PERSISTENCE_KEY, JSON.stringify(migrated));
    sessionStorage.setItem(LIVE_SESSION_RECOVERY_SESSION_KEY, JSON.stringify(migrated));
  } catch {
    /* storage unavailable */
  }
    return migrated;
  } catch {
    return null;
  }
}

export function writeLiveSessionPersistence(
  state: Partial<LiveSessionPersistenceState> & Pick<LiveSessionPersistenceState, 'role' | 'sessionCode'>
): void {
  const existing = safeParse(localStorage.getItem(LIVE_SESSION_PERSISTENCE_KEY));
  const next: LiveSessionPersistenceState = {
    role: state.role,
    sessionCode: state.sessionCode.trim().toUpperCase(),
    connected: state.connected ?? existing?.connected ?? true,
    followDirector: state.followDirector ?? existing?.followDirector ?? readFollowDirector(),
    passiveMode: state.passiveMode ?? existing?.passiveMode ?? false,
    joinedAt: state.joinedAt ?? existing?.joinedAt ?? Date.now(),
    lastRoute: state.lastRoute ?? existing?.lastRoute,
    lastSongId: state.lastSongId ?? existing?.lastSongId,
    lastSetlistId: state.lastSetlistId ?? existing?.lastSetlistId,
    lastViewMode: state.lastViewMode ?? existing?.lastViewMode,
    lastHeartbeatAt: state.lastHeartbeatAt ?? existing?.lastHeartbeatAt,
    directorAwayFromScope:
      state.directorAwayFromScope ?? existing?.directorAwayFromScope ?? false,
  };

  try {
    localStorage.setItem(LIVE_SESSION_PERSISTENCE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage unavailable */
  }

  try {
    sessionStorage.setItem(LIVE_SESSION_RECOVERY_SESSION_KEY, JSON.stringify(next));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readLiveSessionRecoverySnapshot(): LiveSessionPersistenceState | null {
  try {
    const raw = sessionStorage.getItem(LIVE_SESSION_RECOVERY_SESSION_KEY);
    return safeParse(raw);
  } catch {
    return null;
  }
}

export function clearLiveSessionPersistence(): void {
  try {
    localStorage.removeItem(LIVE_SESSION_PERSISTENCE_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(LIVE_SESSION_RECOVERY_SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LIVE_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
