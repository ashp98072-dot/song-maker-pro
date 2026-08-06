import type { ViewMode } from '@/types/music';
import { normalizeSessionCode } from '@/features/director-session/types';

export type SimpleLiveRole = 'idle' | 'director' | 'follower';

export type SimpleLiveStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type SimpleLiveState = {
  sessionCode: string;
  songId: string | null;
  listId: string | null;
  listSongIds: string[];
  currentIndex: number;
  viewMode: ViewMode;
  semitones: number;
  genderShift: 'original' | 'male' | 'female';
  sectionAnchor: string | null;
  updatedAt: string;
};

export type SimpleLiveHint = {
  code: string;
  role: 'director' | 'follower';
};

export const SIMPLE_LIVE_STATE_EVENT = 'simple-live-state' as const;
export const SIMPLE_LIVE_END_EVENT = 'simple-live-end' as const;
export const SIMPLE_LIVE_REQUEST_EVENT = 'simple-live-request' as const;

/** Manual rejoin hint only — never auto-connects on boot. */
export const SIMPLE_LIVE_HINT_KEY = 'wt_simple_live_hint';

export function simpleLiveChannelName(code: string): string {
  // Must match Supabase realtime authorization (`worship-session-%` in migration.sql).
  // Dual-stack risk is mitigated by not mounting LiveSessionChannelHost under SIMPLE_LIVE_SYNC.
  return `worship-session-${normalizeSessionCode(code)}`;
}

export function generateSimpleSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function readSimpleLiveHint(): SimpleLiveHint | null {
  try {
    const raw = sessionStorage.getItem(SIMPLE_LIVE_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SimpleLiveHint>;
    const code = normalizeSessionCode(parsed.code ?? '');
    if (code.length < 4) return null;
    if (parsed.role !== 'director' && parsed.role !== 'follower') return null;
    return { code, role: parsed.role };
  } catch {
    return null;
  }
}

export function writeSimpleLiveHint(hint: SimpleLiveHint | null): void {
  try {
    if (!hint) {
      sessionStorage.removeItem(SIMPLE_LIVE_HINT_KEY);
      return;
    }
    sessionStorage.setItem(
      SIMPLE_LIVE_HINT_KEY,
      JSON.stringify({
        code: normalizeSessionCode(hint.code),
        role: hint.role,
      })
    );
  } catch {
    /* ignore */
  }
}
