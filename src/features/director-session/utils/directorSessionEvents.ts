export const DIRECTOR_SESSION_TERMINATE_EVENT = 'worship-director-session-terminate';

export function dispatchDirectorSessionTerminate(code: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DIRECTOR_SESSION_TERMINATE_EVENT, { detail: { code } })
  );
}
