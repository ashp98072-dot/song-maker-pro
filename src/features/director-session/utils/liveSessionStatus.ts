/** FSM de sesión en vivo (FASE 3 — observabilidad; booleans legacy siguen activos). */
export type LiveSessionStatus =
  | 'idle'
  | 'detected'
  | 'joining'
  | 'subscribed'
  | 'active'
  | 'passive'
  | 'reconnecting'
  | 'ended';

/** Estados en los que no se muestra el banner de recuperación (FASE 4). */
export const LIVE_SESSION_RECOVERY_BANNER_STATUS: LiveSessionStatus = 'detected';

/** Join permitido sin conflicto (sesión no en curso). */
export const LIVE_SESSION_JOIN_ALLOWED: readonly LiveSessionStatus[] = [
  'idle',
  'detected',
  'ended',
] as const;

export function isJoinBlockedByStatus(status: LiveSessionStatus): boolean {
  return status !== 'idle' && status !== 'detected' && status !== 'ended';
}
