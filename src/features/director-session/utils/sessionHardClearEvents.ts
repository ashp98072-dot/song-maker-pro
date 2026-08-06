export const SESSION_HARD_CLEAR_EVENT = 'worship-session-hard-clear';

export function dispatchSessionHardClear(sessionCode?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SESSION_HARD_CLEAR_EVENT, { detail: { sessionCode } })
  );
}
