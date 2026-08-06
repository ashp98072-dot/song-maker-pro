import type { ViewMode } from '@/types/music';

export type SharedSessionGenderShift = 'male' | 'female' | 'original';

export type SharedSessionState = {
  sessionId: string;
  currentSongId: string | null;
  /** Índice en listSongIds (modo continuo / setlist). */
  currentIndex?: number;
  listId?: string | null;
  listSongIds?: string[];
  customSemitones: number;
  genderShift: SharedSessionGenderShift;
  viewMode: ViewMode;
  /** Ancla de sección visible (verse-1, chorus-2, …) — solo al cambiar de sección. */
  sharedSectionAnchor?: string;
  updatedAt: string;
};

export type DirectorSessionConnection = {
  sessionCode: string;
  role: 'director' | 'follower';
};

export const SHARED_SESSION_BROADCAST_EVENT = 'shared-session' as const;
export const SHARED_SESSION_END_EVENT = 'shared-session-end' as const;
export const SHARED_SESSION_HEARTBEAT_EVENT = 'shared-session-heartbeat' as const;
/** Follower → director: republish full shared-session snapshot (view_mode, index, etc.). */
export const REQUEST_CURRENT_STATE_EVENT = 'request_current_state' as const;

export type RequestCurrentStatePayload = {
  sessionId: string;
  at: string;
};

export type SharedSessionHeartbeatPayload = {
  sessionId: string;
  at: string;
};

/** Uppercase session code used for DB, storage, and Realtime channel keys. */
export function normalizeSessionCode(code: string): string {
  return code.trim().replace(/[\s-]+/g, '').toUpperCase();
}

export function worshipSessionChannelName(sessionCode: string): string {
  return `worship-session-${normalizeSessionCode(sessionCode)}`;
}
