/** Dispara desconexión dura en todos los DirectorSession montados. */
export const SPECTATOR_SESSION_LEAVE_EVENT = 'worship-spectator-session-leave';

export function dispatchSpectatorSessionLeave(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SPECTATOR_SESSION_LEAVE_EVENT));
}
