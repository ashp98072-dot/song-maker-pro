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

export const SIMPLE_LIVE_STATE_EVENT = 'simple-live-state' as const;
export const SIMPLE_LIVE_END_EVENT = 'simple-live-end' as const;

export const FOLLOW_DIRECTOR_KEY = 'wt_simple_follow_director';

export function simpleLiveChannelName(code: string): string {
  return `worship-session-${normalizeSessionCode(code)}`;
}

export function generateSimpleSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function readFollowPreference(): boolean {
  try {
    const v = localStorage.getItem(FOLLOW_DIRECTOR_KEY);
    if (v === null) return true;
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

export function writeFollowPreference(on: boolean): void {
  try {
    localStorage.setItem(FOLLOW_DIRECTOR_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
