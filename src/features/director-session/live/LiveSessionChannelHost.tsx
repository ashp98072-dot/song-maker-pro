import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { SessionState } from '@/types/music';
import { resolveSharedViewMode } from '@/types/music';
import type { SharedSessionState } from '@/features/director-session/types';
import {
  normalizeSessionCode,
  worshipSessionChannelName,
} from '@/features/director-session/types';
import {
  attachRequestCurrentStateListener,
  attachSharedSessionListeners,
  publishDirectorHeartbeat,
  registerDirectorBroadcastChannel,
  sendRequestCurrentState,
  unregisterDirectorBroadcastChannel,
} from '@/features/director-session/realtime/sharedSessionSync';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { channelLog } from '@/features/director-session/utils/channelLog';
import { sessionProviderLog } from '@/features/director-session/utils/sessionProviderLog';
import { realtimeError, realtimeLog } from '@/features/director-session/utils/realtimeLog';
import { useLiveSessionChannel } from '@/features/director-session/live/liveSessionChannelContext';
import { SESSION_HARD_CLEAR_EVENT } from '@/features/director-session/utils/sessionHardClearEvents';
import { DIRECTOR_SESSION_TERMINATE_EVENT } from '@/features/director-session/utils/directorSessionEvents';
import { auditEventLog } from '@/features/director-session/utils/auditEventLog';
import { followTrace } from '@/features/director-session/utils/followTrace';
import { FEATURES } from '@/config/features';
import { attachFollowV3Listener } from '@/features/director-session/follow-v3/followV3Realtime';
import { keepLiveSessionActiveHeartbeat } from '@/features/director-session/utils/liveSessionActive';

console.log('[BOOT_IMPORT]', 'LiveSessionChannelHost');

const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 30_000;

const WORSHIP_CHANNEL_CONFIG = {
  broadcast: { self: false },
  private: true,
} as const;

const FULL_PUBLISH_THROTTLE_MS = 800;
const lastFullPublishAtByCode = new Map<string, number>();

function logSharedSessionBroadcastReceived(
  role: 'director' | 'follower',
  state: SharedSessionState,
  extra?: Record<string, unknown>
): void {
  console.log('[LIVE_SESSION_BROADCAST]', {
    role,
    viewMode: state.viewMode,
    currentIndex: state.currentIndex ?? null,
    listId: state.listId ?? null,
    currentSongId: state.currentSongId ?? null,
    genderShift: state.genderShift,
    sharedSectionAnchor: state.sharedSectionAnchor ?? null,
    sessionId: state.sessionId,
    ...extra,
  });
}

/**
 * App-level Realtime channel owner. Survives route changes.
 * Tears down only on explicit session end, code change, or hard clear.
 */
export function LiveSessionChannelHost() {
  const channelApi = useLiveSessionChannel();
  const {
    liveIsDirector,
    liveSessionCode,
    liveIsFollower,
    liveFollowerCode,
    connection,
    pageHandlersRef,
    newSessionRef,
    directorChannelRef,
    followerChannelRef,
    lastRemoteStateRef,
    setConnection,
    setDirectorChannelJoin,
    setConnectedCount,
    setLiveIsDirector,
    setLiveSessionCode,
    setLiveIsFollower,
    setLiveFollowerCode,
    scheduleBroadcast,
    failDirectorStart,
    setDirectorDisconnected,
    setIsReconnecting,
    onDirectorHeartbeat,
    dispatchSharedSessionUpdate,
    followV3HandlerRef,
    onFollowerRealtimeJoined,
    onRealtimeSubscribed,
    completeFollowerSessionEndedByDirector,
    bumpReconnectSequence,
    markRealtimeSubscriptionStable,
    handleRealtimeChannelStatus,
    publishFullSessionStateIfDirector,
    broadcastStateRef,
    syncForceContinuousIndexFromRemoteRef,
    onFollowerChannelLost,
  } = channelApi;

  const directorChannelJoinedRef = useRef(false);
  const followerPendingFirstBroadcastCodeRef = useRef<string | null>(null);
  const directorSubscribedCodeRef = useRef<string | null>(null);
  const followerSubscribedCodeRef = useRef<string | null>(null);
  /** Active subscription code — avoids teardown when effect re-runs with same code. */
  const directorActiveCodeRef = useRef<string | null>(null);
  const followerActiveCodeRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatAtRef = useRef<number>(Date.now());
  const connectionNotifiedRef = useRef(false);
  const pendingEstablishCodeRef = useRef<string | null>(null);

  const tryCompleteNewSessionEstablishment = useCallback(() => {
    const code = pendingEstablishCodeRef.current;
    if (!code || !newSessionRef.current) return;
    if (!directorChannelJoinedRef.current || !connectionNotifiedRef.current) return;

    pendingEstablishCodeRef.current = null;
    newSessionRef.current = false;
    pageHandlersRef.current.onDirectorSessionEstablished?.(code);
    sessionProviderLog('session alive', { role: 'director', code });
  }, [newSessionRef, pageHandlersRef]);

  const tryCompleteRef = useRef(tryCompleteNewSessionEstablishment);
  tryCompleteRef.current = tryCompleteNewSessionEstablishment;

  const failDirectorStartRef = useRef(failDirectorStart);
  failDirectorStartRef.current = failDirectorStart;

  const publishFullSessionStateIfDirectorRef = useRef(publishFullSessionStateIfDirector);
  publishFullSessionStateIfDirectorRef.current = publishFullSessionStateIfDirector;

  const requestThrottledFullPublish = useCallback(
    (code: string, reason: string, opts?: { bypassThrottle?: boolean }) => {
      const key = normalizeSessionCode(code);
      const now = Date.now();
      const last = lastFullPublishAtByCode.get(key) ?? 0;
      if (!opts?.bypassThrottle && now - last < FULL_PUBLISH_THROTTLE_MS) {
        realtimeLog('publishFullSession throttled', {
          code: key,
          reason,
          msSinceLast: now - last,
          throttleMs: FULL_PUBLISH_THROTTLE_MS,
        });
        return;
      }
      lastFullPublishAtByCode.set(key, now);
      realtimeLog('publishFullSession', { code: key, reason });
      publishFullSessionStateIfDirectorRef.current(key, { force: true, reason });
    },
    []
  );

  const requestThrottledFullPublishRef = useRef(requestThrottledFullPublish);
  requestThrottledFullPublishRef.current = requestThrottledFullPublish;

  const runDirectorSubscribedHandshake = useCallback((code: string) => {
    const key = normalizeSessionCode(code);
    console.log('[DIRECTOR_INITIAL_PUBLISH]', {
      session_code: key,
      phase: 'immediate',
      trigger: 'SUBSCRIBED',
    });
    // One handshake publish — triple publish was flooding realtime + UI.
    requestThrottledFullPublishRef.current(key, 'director-initial-immediate', {
      bypassThrottle: true,
    });
  }, []);

  useEffect(() => {
    if (!liveIsDirector || !liveSessionCode) {
      directorChannelJoinedRef.current = false;
      connectionNotifiedRef.current = false;
      directorSubscribedCodeRef.current = null;
      directorActiveCodeRef.current = null;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    const normalizedCode = normalizeSessionCode(liveSessionCode);

    if (
      directorActiveCodeRef.current === normalizedCode &&
      directorSubscribedCodeRef.current === normalizedCode &&
      directorChannelRef.current?.state === 'joined'
    ) {
      setDirectorChannelJoin('joined');
      setConnection({ sessionCode: normalizedCode, role: 'director' });
      realtimeLog('reconnected', { role: 'director', preserved: true, code: normalizedCode });
      return;
    }
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let subscribeTimeout: ReturnType<typeof setTimeout> | undefined;
    let subscribed = false;
    let detachRequestState: () => void = () => {};

    const cleanupChannel = (reason: string) => {
      realtimeLog('disconnected', {
        role: 'director',
        reason,
        code: normalizedCode,
        subscribed,
        channelState: channel?.state ?? null,
      });
      if (subscribeTimeout) clearTimeout(subscribeTimeout);
      if (channel) {
        unregisterDirectorBroadcastChannel(normalizedCode);
        connectionNotifiedRef.current = false;
        void supabase.removeChannel(channel);
        channel = null;
        directorChannelRef.current = null;
      }
      directorChannelJoinedRef.current = false;
      setDirectorChannelJoin('idle');
    };

    directorActiveCodeRef.current = normalizedCode;
    setDirectorChannelJoin('joining');
    realtimeLog('channel create', { role: 'director', sessionId: normalizedCode });

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.access_token || !session.user) {
        if (newSessionRef.current) {
          failDirectorStartRef.current(
            'Debes iniciar sesión para transmitir en vivo',
            'no auth session'
          );
        }
        return;
      }

      try {
        await supabase.realtime.setAuth(session.access_token);
      } catch (error) {
        realtimeError('setAuth failed', { role: 'director', error });
      }

      if (cancelled) return;

      channel = supabase.channel(worshipSessionChannelName(normalizedCode), {
        config: {
          ...WORSHIP_CHANNEL_CONFIG,
          presence: { key: 'director' },
        },
      });
      directorChannelRef.current = channel;

      detachRequestState = attachRequestCurrentStateListener(channel, (req) => {
        realtimeLog('handshake request_current_state received — force publish', {
          sessionId: req.sessionId,
        });
        requestThrottledFullPublishRef.current(normalizedCode, 'request-current-state-force', {
          bypassThrottle: true,
        });
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel!.presenceState();
          // Count non-director presence keys (followers / musicians).
          const followerKeys = Object.keys(newState).filter((k) => k !== 'director');
          const count = followerKeys.length;
          setConnectedCount(count);
          realtimeLog('presence sync', { role: 'director', count, keys: Object.keys(newState) });
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (key === 'director') return;
          setTimeout(() => {
            requestThrottledFullPublishRef.current(normalizedCode, 'follower-presence-join');
            realtimeLog('event send', {
              reason: 'follower presence join',
              republish: 'full-shared-session',
              presenceKey: key,
            });
          }, 600);
        })
        .subscribe(async (status, err) => {
          if (cancelled) return;

          followTrace('FOLLOW_CHANNEL_STATE', {
            sessionCode: normalizedCode,
            actor: 'director',
            reason: err?.message ?? status,
            extra: { status, role: 'director' },
          });
          handleRealtimeChannelStatus?.('director', normalizedCode, status, err?.message);
          realtimeLog('subscribe status', { role: 'director', status, error: err?.message });

          if (status === 'SUBSCRIBED') {
            subscribed = true;
            if (subscribeTimeout) clearTimeout(subscribeTimeout);
            onRealtimeSubscribed?.('director', normalizedCode);
            const presenceSnap = broadcastStateRef.current;
            await channel!.track({
              user: 'director',
              online_at: new Date().toISOString(),
              view_mode: presenceSnap.viewMode ?? 'musician',
              current_index: presenceSnap.currentIndex ?? 0,
              list_id: presenceSnap.listId ?? null,
            });
            realtimeLog('presence track director', {
              code: normalizedCode,
              view_mode: presenceSnap.viewMode,
              current_index: presenceSnap.currentIndex,
              list_id: presenceSnap.listId,
            });
            if (cancelled) return;

            registerDirectorBroadcastChannel(normalizedCode, channel!);
            directorChannelJoinedRef.current = true;
            directorSubscribedCodeRef.current = normalizedCode;
            setDirectorChannelJoin('joined');
            channelLog('joined', { role: 'director', code: normalizedCode });

            setConnection({ sessionCode: normalizedCode, role: 'director' });
            markRealtimeSubscriptionStable?.('director', normalizedCode);
            connectionNotifiedRef.current = true;

            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            publishDirectorHeartbeat(normalizedCode);
            heartbeatIntervalRef.current = setInterval(() => {
              publishDirectorHeartbeat(normalizedCode);
            }, HEARTBEAT_INTERVAL_MS);

            runDirectorSubscribedHandshake(normalizedCode);

            if (newSessionRef.current) {
              pendingEstablishCodeRef.current = normalizedCode;
              tryCompleteRef.current();
            }
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            realtimeError('channel error', { role: 'director', status, error: err });
          }

          if (
            newSessionRef.current &&
            !directorChannelJoinedRef.current &&
            (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
          ) {
            if (subscribeTimeout) clearTimeout(subscribeTimeout);
            failDirectorStartRef.current(
              'No se pudo conectar la sesión en vivo',
              err?.message ?? status
            );
          }
        });

      subscribeTimeout = setTimeout(() => {
        if (cancelled || directorChannelJoinedRef.current) return;
        if (newSessionRef.current) {
          failDirectorStartRef.current(
            'Tiempo de espera agotado al iniciar la sesión',
            'subscribe timeout'
          );
        }
      }, 10000);
    })();

    return () => {
      cancelled = true;
      if (directorActiveCodeRef.current !== normalizedCode) return;
      detachRequestState();
      cleanupChannel('director session ended or code changed');
      directorSubscribedCodeRef.current = null;
      directorActiveCodeRef.current = null;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [liveIsDirector, liveSessionCode, runDirectorSubscribedHandshake]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!liveIsFollower || !liveFollowerCode) {
      followerSubscribedCodeRef.current = null;
      followerActiveCodeRef.current = null;
      if (heartbeatWatchRef.current) {
        clearInterval(heartbeatWatchRef.current);
        heartbeatWatchRef.current = null;
      }
      return;
    }

    const normalizedCode = normalizeSessionCode(liveFollowerCode);

    if (
      followerActiveCodeRef.current === normalizedCode &&
      followerSubscribedCodeRef.current === normalizedCode &&
      followerChannelRef.current?.state === 'joined'
    ) {
      setConnection({ sessionCode: normalizedCode, role: 'follower' });
      realtimeLog('reconnected', { role: 'follower', preserved: true, code: normalizedCode });
      return;
    }
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let subscribeTimeout: ReturnType<typeof setTimeout> | undefined;
    let detachFollowV3: () => void = () => {};
    followerActiveCodeRef.current = normalizedCode;
    realtimeLog('channel create', { role: 'follower', sessionId: normalizedCode });

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.access_token || !session.user) {
        toast.error('Debes iniciar sesión para unirte a la sesión');
        setLiveIsFollower(false);
        setLiveFollowerCode('');
        return;
      }

      try {
        await supabase.realtime.setAuth(session.access_token);
      } catch (error) {
        realtimeError('setAuth failed', { role: 'follower', error });
      }

      if (cancelled) return;

      sessionProviderLog('follower auto-join', { code: normalizedCode });

      channel = supabase.channel(worshipSessionChannelName(normalizedCode), {
        config: {
          ...WORSHIP_CHANNEL_CONFIG,
          // Unique per tab so same-account director+follower don't overwrite presence.
          presence: {
            key: `follower-${session.user.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`,
          },
        },
      });
      followerChannelRef.current = channel;

      followerPendingFirstBroadcastCodeRef.current = normalizedCode;

      attachSharedSessionListeners(channel, {
        onUpdate: (state) => {
          const isFirstAfterSubscribe =
            followerPendingFirstBroadcastCodeRef.current === normalizedCode;

          if (isFirstAfterSubscribe) {
            console.log('[HANDSHAKE_RECEIVED]', {
              view_mode: state.viewMode,
              current_index: state.currentIndex ?? null,
              list_id: state.listId ?? null,
              list_song_ids: state.listSongIds ?? [],
              current_song_id: state.currentSongId ?? null,
              gender_shift: state.genderShift,
              shared_section_anchor: state.sharedSectionAnchor ?? null,
              session_id: state.sessionId,
              updated_at: state.updatedAt,
            });
          }

          logSharedSessionBroadcastReceived('follower', state, {
            firstAfterSubscribe: isFirstAfterSubscribe,
          });

          if (isFirstAfterSubscribe) {
            followerPendingFirstBroadcastCodeRef.current = null;
            const resolved = resolveSharedViewMode(
              state.viewMode,
              state.listId ?? null,
              state.listSongIds ?? null
            );
            if (resolved === 'continuous') {
              realtimeLog('first broadcast after subscribed — force continuous index', {
                code: normalizedCode,
                currentIndex: state.currentIndex,
                listId: state.listId,
              });
              syncForceContinuousIndexFromRemoteRef.current?.(
                state,
                'first-broadcast-after-subscribed'
              );
            }
          }

          lastRemoteStateRef.current = state;
          lastHeartbeatAtRef.current = Date.now();
          setDirectorDisconnected(false);
          dispatchSharedSessionUpdate(state);
        },
        onHeartbeat: () => {
          lastHeartbeatAtRef.current = Date.now();
          setDirectorDisconnected(false);
          onDirectorHeartbeat();
        },
        onSessionEnded: () => {
          realtimeLog('disconnected', { role: 'follower', reason: 'session ended' });
          completeFollowerSessionEndedByDirector();
          pageHandlersRef.current.onSharedSessionEnded?.();
        },
      });

      detachFollowV3 = FEATURES.USE_FOLLOW_V3
        ? attachFollowV3Listener(channel, (state) => {
            console.log('[LIVE_SESSION_BROADCAST]', {
              role: 'follower',
              channel: 'follow-v3-state',
              viewMode: state.mode ?? null,
              currentIndex: null,
              songId: state.songId ?? null,
              listId: state.listId ?? null,
              sessionCode: state.sessionCode,
              seq: state.seq,
            });
            followV3HandlerRef.current?.(state);
          })
        : () => {};

      channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
        if (payload) {
          realtimeLog('broadcast received', { event: 'sync', payload });
          pageHandlersRef.current.onSessionUpdate?.(payload as SessionState);
        }
      });

      channel.subscribe(async (status, err) => {
        if (cancelled) return;

        followTrace('FOLLOW_CHANNEL_STATE', {
          sessionCode: normalizedCode,
          actor: 'spectator',
          reason: err?.message ?? status,
          extra: { status, role: 'follower' },
        });
        handleRealtimeChannelStatus?.('follower', normalizedCode, status, err?.message);
        realtimeLog('subscribe status', { role: 'follower', status, error: err?.message });

        if (status === 'SUBSCRIBED') {
          auditEventLog({
            source: 'LiveSessionChannelHost',
            action: 'CHANNEL_SUBSCRIBED',
            sessionCode: normalizedCode,
            extra: { role: 'follower' },
          });
          if (subscribeTimeout) clearTimeout(subscribeTimeout);
          onRealtimeSubscribed?.('follower', normalizedCode);
          await channel!.track({ user: 'musician', online_at: new Date().toISOString() });
          followerSubscribedCodeRef.current = normalizedCode;
          channelLog('joined', { role: 'follower', code: normalizedCode });
          setConnection({ sessionCode: normalizedCode, role: 'follower' });
          markRealtimeSubscriptionStable?.('follower', normalizedCode);
          realtimeLog('handshake follower subscribed — request_current_state', {
            code: normalizedCode,
          });
          void sendRequestCurrentState(channel!, normalizedCode);
          window.setTimeout(() => {
            if (cancelled || followerSubscribedCodeRef.current !== normalizedCode) return;
            realtimeLog('handshake follower retry request_current_state', { code: normalizedCode });
            void sendRequestCurrentState(channel!, normalizedCode);
          }, 800);
          onFollowerRealtimeJoined(normalizedCode);
          lastHeartbeatAtRef.current = Date.now();
          if (heartbeatWatchRef.current) clearInterval(heartbeatWatchRef.current);
          heartbeatWatchRef.current = setInterval(() => {
            if (Date.now() - lastHeartbeatAtRef.current > HEARTBEAT_TIMEOUT_MS) {
              setDirectorDisconnected(true);
              realtimeLog('director disconnected', { role: 'follower', code: normalizedCode });
            }
          }, 5_000);
          return;
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          realtimeError('channel error', { role: 'follower', status, error: err });
          if (subscribeTimeout) clearTimeout(subscribeTimeout);
          realtimeLog('disconnected', {
            role: 'follower',
            reason: err?.message ?? status,
          });
          followerSubscribedCodeRef.current = null;
          followerPendingFirstBroadcastCodeRef.current = null;
          onFollowerChannelLost?.(normalizedCode, err?.message ?? status);
        }
      });

      subscribeTimeout = setTimeout(() => {
        if (cancelled) return;
        sessionProviderLog('reconnect available', {
          role: 'follower',
          code: normalizedCode,
          status: 'subscribe timeout',
        });
      }, 10000);
    })();

    return () => {
      cancelled = true;
      if (subscribeTimeout) clearTimeout(subscribeTimeout);
      detachFollowV3();
      if (followerActiveCodeRef.current !== normalizedCode) return;
      if (channel) {
        realtimeLog('disconnected', {
          role: 'follower',
          reason: 'follower session ended or code changed',
          code: normalizedCode,
        });
        void supabase.removeChannel(channel);
        followerChannelRef.current = null;
      }
      followerSubscribedCodeRef.current = null;
      followerActiveCodeRef.current = null;
      if (heartbeatWatchRef.current) {
        clearInterval(heartbeatWatchRef.current);
        heartbeatWatchRef.current = null;
      }
    };
  }, [liveIsFollower, liveFollowerCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lightweight is_active heartbeat (verify; RPC only if inactive).
  useEffect(() => {
    if (!liveIsDirector || !liveSessionCode) return;

    const normalizedCode = normalizeSessionCode(liveSessionCode);
    void keepLiveSessionActiveHeartbeat(normalizedCode);

    const keepAlive = setInterval(() => {
      void keepLiveSessionActiveHeartbeat(normalizedCode);
    }, 30_000);

    return () => clearInterval(keepAlive);
  }, [liveIsDirector, liveSessionCode]);

  useEffect(() => {
    const onHardClear = () => {
      channelLog('disconnected', { reason: 'hard clear' });
      setLiveIsDirector(false);
      setLiveSessionCode('');
      setLiveIsFollower(false);
      setLiveFollowerCode('');
      setConnection(null);
      newSessionRef.current = false;
      directorChannelJoinedRef.current = false;
      directorChannelRef.current = null;
      followerChannelRef.current = null;
      directorActiveCodeRef.current = null;
      followerActiveCodeRef.current = null;
    };
    const onTerminate = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string }>).detail;
      if (detail?.code && liveSessionCode && detail.code !== liveSessionCode) return;
      if (liveIsDirector) {
        channelLog('disconnected', { reason: 'terminate event' });
        setLiveIsDirector(false);
        setLiveSessionCode('');
        setConnection(null);
      }
    };

    window.addEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
    window.addEventListener(DIRECTOR_SESSION_TERMINATE_EVENT, onTerminate);
    return () => {
      window.removeEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
      window.removeEventListener(DIRECTOR_SESSION_TERMINATE_EVENT, onTerminate);
    };
  }, [
    liveIsDirector,
    liveIsFollower,
    liveSessionCode,
    newSessionRef,
    setConnection,
    setLiveIsDirector,
    setLiveSessionCode,
    setLiveIsFollower,
    setLiveFollowerCode,
    directorChannelRef,
    followerChannelRef,
  ]);

  useEffect(() => {
    if (connection) {
      sessionProviderLog('navigation preserved', {
        role: connection.role,
        code: connection.sessionCode,
      });
    }
  }, [connection?.role, connection?.sessionCode]);

  return null;
}
