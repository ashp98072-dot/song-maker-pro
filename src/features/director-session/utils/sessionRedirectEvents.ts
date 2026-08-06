import type { SessionOrigin } from '@/features/director-session/utils/sessionOrigin';

export const SESSION_REDIRECT_EVENT = 'worship-session-redirect';

export type SessionRedirectDetail = {
  code: string;
  origin: SessionOrigin;
  songId: string;
  listId?: string | null;
  listSongIds?: string[];
  currentIndex?: number;
  viewMode?: string | null;
};

export function dispatchSessionRedirect(detail: SessionRedirectDetail): void {
  window.dispatchEvent(new CustomEvent(SESSION_REDIRECT_EVENT, { detail }));
}
