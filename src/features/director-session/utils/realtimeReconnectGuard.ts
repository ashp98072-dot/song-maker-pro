/** UI spinner/toast delay — only show reconnect UX after this duration. */
export const RECONNECT_UI_DELAY_MS = 3000;

/** Min reconnect duration before showing "Reconectado" toast. */
export const RECONNECT_TOAST_MIN_MS = 1500;

/** Minimum gap between reconnect attempts (hard freeze). */
export const RECONNECT_COOLDOWN_MS = 5000;

export type RealtimeEventType =
  | 'CHANNEL_SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'STATE_CHANGED'
  | 'SOCKET_DISCONNECTED'
  | 'OFFLINE'
  | 'ONLINE'
  | 'SUBSCRIBED'
  | 'OTHER';

const TRANSPORT_RECONNECT_REASONS = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'OFFLINE']);

const NEVER_RECONNECT_MARKERS = [
  'subscribed',
  'channel_subscribed',
  'realtime-subscribed',
  'subscription healthy',
  'reconnect cleared',
  'unspecified',
  'online',
  'socket_disconnected',
  'session_code_changed',
];

export function realtimeEventLog(detail: {
  type: RealtimeEventType;
  reason: string;
  sessionCode?: string | null;
  sequenceId?: number | null;
  role?: string | null;
}): void {
  console.log('[REALTIME_EVENT]', detail);
}

export function realtimeReconnectRequestLog(detail: {
  reason: string;
  allowed: boolean;
  sessionCode?: string | null;
  sequenceId?: number | null;
  blockedReason?: string | null;
}): void {
  console.log('[REALTIME_RECONNECT_REQUEST]', detail);
}

export function realtimeReconnectBlockedLog(detail: Record<string, unknown>): void {
  console.log('[REALTIME_RECONNECT_BLOCKED]', detail);
}

export function realtimeStableLog(detail: Record<string, unknown>): void {
  console.log('[REALTIME_STABLE]', detail);
}

export function mapChannelStatusToEventType(status: string): RealtimeEventType {
  const upper = status.toUpperCase();
  if (upper === 'SUBSCRIBED') return 'CHANNEL_SUBSCRIBED';
  if (upper === 'CHANNEL_ERROR') return 'CHANNEL_ERROR';
  if (upper === 'TIMED_OUT') return 'TIMED_OUT';
  if (upper === 'CLOSED') return 'CLOSED';
  return 'STATE_CHANGED';
}

function normalizeReason(reason: string): string {
  return reason.trim();
}

function isNeverReconnectReason(reason: string): boolean {
  const lower = normalizeReason(reason).toLowerCase();
  return NEVER_RECONNECT_MARKERS.some((m) => lower === m || lower.includes(m));
}

function isTransportReconnectReason(reason: string): boolean {
  const upper = normalizeReason(reason).toUpperCase();
  for (const token of TRANSPORT_RECONNECT_REASONS) {
    if (upper === token || upper.includes(token)) return true;
  }
  return false;
}

export type ReconnectRequestEvaluation = {
  allowed: boolean;
  blockedReason?: string;
};

/**
 * HOTFIX 7.6.3.1 — auto-reconnect frozen except transport failure / offline.
 * Always enforces cooldown between requests.
 */
export function evaluateRealtimeReconnectRequest(
  reason: string,
  lastReconnectRequestAtMs: number | null,
  now = Date.now()
): ReconnectRequestEvaluation {
  const normalized = normalizeReason(reason);

  if (isNeverReconnectReason(normalized)) {
    return { allowed: false, blockedReason: 'never-reconnect-reason' };
  }

  if (!isTransportReconnectReason(normalized)) {
    return { allowed: false, blockedReason: 'auto-reconnect-disabled' };
  }

  if (
    lastReconnectRequestAtMs != null &&
    now - lastReconnectRequestAtMs < RECONNECT_COOLDOWN_MS
  ) {
    return { allowed: false, blockedReason: 'cooldown' };
  }

  return { allowed: true };
}

/** @deprecated Use evaluateRealtimeReconnectRequest */
export function shouldIgnoreRealtimeReconnect(reason: string): boolean {
  return !evaluateRealtimeReconnectRequest(reason, null).allowed;
}

export function realtimeIgnoreLog(detail: Record<string, unknown>): void {
  console.log('[REALTIME_IGNORE]', detail);
}

export function realtimeReconnectAllowedLog(detail: Record<string, unknown>): void {
  console.log('[REALTIME_RECONNECT_ALLOWED]', detail);
}
