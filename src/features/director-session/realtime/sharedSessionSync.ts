import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  SHARED_SESSION_BROADCAST_EVENT,
  SHARED_SESSION_END_EVENT,
  SHARED_SESSION_HEARTBEAT_EVENT,
  REQUEST_CURRENT_STATE_EVENT,
  normalizeSessionCode,
  worshipSessionChannelName,
  type RequestCurrentStatePayload,
  type SharedSessionHeartbeatPayload,
  type SharedSessionState,
} from '@/features/director-session/types';
import { assertDirectorPublisher } from '@/features/director-session/live/liveSessionAuthority';
import { sessionSyncLog } from '@/features/director-session/utils/sessionSyncLog';
import { realtimeError, realtimeLog } from '@/features/director-session/utils/realtimeLog';

const DEBOUNCE_MS = 200;
const MAX_FLUSH_RETRIES = 40;

const directorChannels = new Map<string, RealtimeChannel>();
const publishTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingBySession = new Map<string, SharedSessionState>();
const lastSerializedBySession = new Map<string, string>();

function sessionKey(sessionId: string): string {
  return normalizeSessionCode(sessionId);
}

function isChannelJoined(channel: RealtimeChannel | undefined): boolean {
  return channel?.state === 'joined';
}

async function sendBroadcast(
  channel: RealtimeChannel,
  event: string,
  payload: unknown
): Promise<void> {
  realtimeLog('broadcast send', { event, payload });
  try {
    const status = await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
    if (status !== 'ok') {
      realtimeError('broadcast send status', { event, status, channelState: channel.state });
    }
  } catch (error) {
    realtimeError('broadcast send error', { event, error });
  }
}

function flushPublish(sessionId: string, retry = 0): void {
  const key = sessionKey(sessionId);
  const state = pendingBySession.get(key);
  if (!state) {
    sessionSyncLog(
      'publish skipped reason',
      { sessionId: key, reason: 'no pending state' },
      { always: true }
    );
    return;
  }

  const serialized = JSON.stringify(state);
  if (serialized === lastSerializedBySession.get(key)) {
    sessionSyncLog(
      'publish skipped reason',
      { sessionId: key, reason: 'unchanged payload' },
      { always: true }
    );
    return;
  }

  const channel = directorChannels.get(key);
  realtimeLog('publish attempt', {
    sessionId: key,
    retry,
    channelState: channel?.state ?? 'missing',
    currentSongId: state.currentSongId,
  });

  if (!channel || !isChannelJoined(channel)) {
    if (retry < MAX_FLUSH_RETRIES) {
      setTimeout(() => flushPublish(sessionId, retry + 1), 100);
    } else {
      realtimeError('publish skipped reason', {
        sessionId: key,
        reason: 'channel not joined',
        channelState: channel?.state ?? 'missing',
      });
    }
    return;
  }

  void sendBroadcast(channel, SHARED_SESSION_BROADCAST_EVENT, state).then(() => {
    lastSerializedBySession.set(key, serialized);
    sessionSyncLog('shared-session published', {
      sessionId: key,
      currentSongId: state.currentSongId,
      viewMode: state.viewMode,
      currentIndex: state.currentIndex,
    });
  });
}

/** Registra el canal del director (reutiliza worship-session-* de DirectorSession). */
export function registerDirectorBroadcastChannel(
  sessionId: string,
  channel: RealtimeChannel
): void {
  const key = sessionKey(sessionId);
  directorChannels.set(key, channel);
  realtimeLog('channel registered', { sessionId: key, channelState: channel.state });
  if (pendingBySession.has(key)) {
    flushPublish(key, 0);
  }
}

export function unregisterDirectorBroadcastChannel(sessionId: string): void {
  const key = sessionKey(sessionId);
  directorChannels.delete(key);
  const timer = publishTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    publishTimers.delete(key);
  }
  pendingBySession.delete(key);
  lastSerializedBySession.delete(key);
}

/**
 * Publish full shared-session snapshot immediately (handshake / request_current_state).
 * Bypasses debounce and dedupe so view_mode, current_index, list_id always reach followers.
 */
export function publishFullSessionState(
  sessionId: string,
  state: SharedSessionState,
  opts?: { force?: boolean }
): void {
  if (!assertDirectorPublisher('publishFullSessionState')) return;

  const key = sessionKey(sessionId);
  const normalizedState: SharedSessionState = { ...state, sessionId: key };
  pendingBySession.set(key, normalizedState);

  const timer = publishTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    publishTimers.delete(key);
  }

  if (opts?.force !== false) {
    lastSerializedBySession.delete(key);
  }

  realtimeLog('publish full session state', {
    sessionId: key,
    viewMode: normalizedState.viewMode,
    currentIndex: normalizedState.currentIndex,
    currentSongId: normalizedState.currentSongId,
  });

  flushPublish(key, 0);
}

export function publishSharedSessionState(
  sessionId: string,
  state: SharedSessionState,
  opts?: { immediate?: boolean }
): void {
  if (!assertDirectorPublisher('publishSharedSessionState')) return;

  const key = sessionKey(sessionId);
  const normalizedState: SharedSessionState = { ...state, sessionId: key };
  pendingBySession.set(key, normalizedState);

  realtimeLog('publish queued', {
    sessionId: key,
    immediate: opts?.immediate ?? false,
    channelState: directorChannels.get(key)?.state ?? 'missing',
  });

  if (opts?.immediate) {
    const timer = publishTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      publishTimers.delete(key);
    }
    flushPublish(key);
    return;
  }

  const existing = publishTimers.get(key);
  if (existing) clearTimeout(existing);

  publishTimers.set(
    key,
    setTimeout(() => {
      publishTimers.delete(key);
      flushPublish(key);
    }, DEBOUNCE_MS)
  );
}

export function publishDirectorHeartbeat(sessionId: string): void {
  if (!assertDirectorPublisher('publishDirectorHeartbeat')) return;

  const key = sessionKey(sessionId);
  const channel = directorChannels.get(key);
  if (!channel || !isChannelJoined(channel)) return;

  const payload: SharedSessionHeartbeatPayload = {
    sessionId: key,
    at: new Date().toISOString(),
  };

  void sendBroadcast(channel, SHARED_SESSION_HEARTBEAT_EVENT, payload);
  sessionSyncLog('heartbeat sent', { sessionId: key, at: payload.at });
}

export function publishSharedSessionEnd(sessionId: string): void {
  const key = sessionKey(sessionId);
  const channel = directorChannels.get(key);
  if (channel && isChannelJoined(channel)) {
    void sendBroadcast(channel, SHARED_SESSION_END_EVENT, {
      sessionId: key,
      updatedAt: new Date().toISOString(),
    });
  }
  clearSharedSessionState(sessionId);
}

export function clearSharedSessionState(sessionId: string): void {
  unregisterDirectorBroadcastChannel(sessionId);
}

export type SharedSessionHandlers = {
  onUpdate: (state: SharedSessionState) => void;
  onSessionEnded?: () => void;
  onHeartbeat?: (payload: SharedSessionHeartbeatPayload) => void;
};

/** Director-only: respond when a follower requests a full state republish. */
export function attachRequestCurrentStateListener(
  channel: RealtimeChannel,
  onRequest: (payload: RequestCurrentStatePayload) => void
): () => void {
  channel.on('broadcast', { event: REQUEST_CURRENT_STATE_EVENT }, ({ payload }) => {
    if (!payload || typeof payload !== 'object') return;
    const req = payload as RequestCurrentStatePayload;
    realtimeLog('broadcast received', { event: REQUEST_CURRENT_STATE_EVENT, payload: req });
    onRequest(req);
  });
  return () => {};
}

/** Follower asks director to republish shared-session (post SUBSCRIBED handshake). */
export async function sendRequestCurrentState(
  channel: RealtimeChannel,
  sessionId: string
): Promise<void> {
  const key = sessionKey(sessionId);
  const payload: RequestCurrentStatePayload = {
    sessionId: key,
    at: new Date().toISOString(),
  };
  realtimeLog('request_current_state send', { sessionId: key });
  await sendBroadcast(channel, REQUEST_CURRENT_STATE_EVENT, payload);
}

/** Escucha en un canal ya suscrito (mismo que DirectorSession). */
export function attachSharedSessionListeners(
  channel: RealtimeChannel,
  handlers: SharedSessionHandlers
): () => void {
  channel.on('broadcast', { event: SHARED_SESSION_BROADCAST_EVENT }, ({ payload }) => {
    if (!payload) return;
    realtimeLog('broadcast received', payload);
    sessionSyncLog('payload received', payload);
    handlers.onUpdate(payload as SharedSessionState);
  });
  channel.on('broadcast', { event: SHARED_SESSION_END_EVENT }, () => {
    realtimeLog('broadcast received', { event: SHARED_SESSION_END_EVENT });
    handlers.onSessionEnded?.();
  });
  channel.on('broadcast', { event: 'end' }, () => {
    realtimeLog('broadcast received', { event: 'end' });
    handlers.onSessionEnded?.();
  });
  channel.on('broadcast', { event: SHARED_SESSION_HEARTBEAT_EVENT }, ({ payload }) => {
    if (!payload) return;
    realtimeLog('broadcast received', { event: SHARED_SESSION_HEARTBEAT_EVENT, payload });
    handlers.onHeartbeat?.(payload as SharedSessionHeartbeatPayload);
  });

  return () => {};
}

/** Follow V3 — minimal broadcast on existing director channel (parallel to legacy payload). */
export function publishDirectorSessionBroadcast(
  sessionId: string,
  event: string,
  payload: unknown
): void {
  if (!assertDirectorPublisher('publishDirectorSessionBroadcast')) return;

  const key = sessionKey(sessionId);
  const channel = directorChannels.get(key);
  if (!channel || !isChannelJoined(channel)) {
    realtimeLog('follow-v3 publish skipped', {
      sessionId: key,
      event,
      channelState: channel?.state ?? 'missing',
    });
    return;
  }

  void sendBroadcast(channel, event, payload);
}

/** Suscripción standalone (fallback / tests). */
export function subscribeToSharedSessionState(
  sessionId: string,
  handlers: SharedSessionHandlers
): () => void {
  const channel = supabase.channel(worshipSessionChannelName(sessionId), {
    config: { broadcast: { self: false }, private: true },
  });

  const detach = attachSharedSessionListeners(channel, handlers);

  channel.subscribe();

  return () => {
    detach();
    void supabase.removeChannel(channel);
  };
}
