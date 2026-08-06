import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { normalizeSessionCode } from '@/features/director-session/types';
import {
  createDirectorLiveSessionRpc,
  resolveAuthenticatedDirector,
} from '@/features/director-session/utils/persistDirectorLiveSession';
import { deactivateLiveSessionRow } from '@/features/director-session/utils/liveSessionActive';
import {
  deactivateAllMyPreviousSessions,
  protectDirectorLiveSessionCode,
} from '@/features/director-session/utils/ghostSessionCleanup';
import {
  querySessionActive,
  sessionJoinBlockedMessage,
} from '@/features/director-session/utils/checkSessionActive';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { clearPendingJoin } from '@/features/director-session/utils/pendingJoinStorage';
import {
  readFollowDirector,
  writeFollowDirector,
} from '@/features/director-session/utils/followDirector';
import type { ViewMode } from '@/types/music';
import {
  generateSimpleSessionCode,
  readSimpleLiveHint,
  SIMPLE_LIVE_END_EVENT,
  SIMPLE_LIVE_REQUEST_EVENT,
  SIMPLE_LIVE_STATE_EVENT,
  simpleLiveChannelName,
  writeSimpleLiveHint,
  type SimpleLiveHint,
  type SimpleLiveRole,
  type SimpleLiveState,
  type SimpleLiveStatus,
} from './types';

const CHANNEL_CONFIG = {
  broadcast: { self: false },
  private: true,
} as const;

const HEARTBEAT_MS = 45_000;

type CreateInput = {
  songId: string | null;
  listId?: string | null;
  listSongIds?: string[];
  currentIndex?: number;
  viewMode?: ViewMode;
  semitones?: number;
  genderShift?: 'original' | 'male' | 'female';
  sectionAnchor?: string | null;
};

type SimpleLiveSyncContextValue = {
  role: SimpleLiveRole;
  status: SimpleLiveStatus;
  code: string | null;
  connectedCount: number;
  followDirector: boolean;
  lastState: SimpleLiveState | null;
  error: string | null;
  /** Stored hint for manual rejoin (never auto-connects). */
  resumable: SimpleLiveHint | null;
  createAsDirector: (input: CreateInput) => Promise<boolean>;
  joinAsFollower: (code: string) => Promise<boolean>;
  resumeSession: () => Promise<boolean>;
  dismissResumable: () => void;
  leave: () => Promise<void>;
  publish: (partial: Partial<Omit<SimpleLiveState, 'sessionCode' | 'updatedAt'>>) => void;
  setFollowDirector: (on: boolean) => void;
};

const SimpleLiveSyncContext = createContext<SimpleLiveSyncContextValue | null>(null);

function log(msg: string, detail?: Record<string, unknown>) {
  console.log(`[SIMPLE_LIVE] ${msg}`, detail ?? {});
}

function buildState(code: string, input: CreateInput): SimpleLiveState {
  return {
    sessionCode: normalizeSessionCode(code),
    songId: input.songId ?? null,
    listId: input.listId ?? null,
    listSongIds: input.listSongIds ?? [],
    currentIndex: input.currentIndex ?? 0,
    viewMode: input.viewMode ?? 'musician',
    semitones: input.semitones ?? 0,
    genderShift: input.genderShift ?? 'original',
    sectionAnchor: input.sectionAnchor ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function countFollowers(presence: Record<string, unknown>): number {
  return Object.keys(presence).filter((k) => k !== 'director').length;
}

export function SimpleLiveSyncProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SimpleLiveRole>('idle');
  const [status, setStatus] = useState<SimpleLiveStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [followDirector, setFollowDirectorState] = useState(readFollowDirector);
  const [lastState, setLastState] = useState<SimpleLiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<SimpleLiveHint | null>(() => readSimpleLiveHint());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roleRef = useRef<SimpleLiveRole>('idle');
  const statusRef = useRef<SimpleLiveStatus>('idle');
  const codeRef = useRef<string | null>(null);
  const lastStateRef = useRef<SimpleLiveState | null>(null);
  const lastPublishKeyRef = useRef('');
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceKeyRef = useRef('director');
  const resumeInFlightRef = useRef(false);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    lastStateRef.current = lastState;
  }, [lastState]);

  /** Wipe legacy persistence so old restore loops cannot revive. Keep simple hint. */
  useEffect(() => {
    clearPendingJoin();
    clearAllLiveSessionLocalState();
    log('cleared legacy session persistence on boot');
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const teardownChannel = useCallback(async () => {
    stopHeartbeat();
    const ch = channelRef.current;
    channelRef.current = null;
    if (!ch) return;
    try {
      await supabase.removeChannel(ch);
    } catch {
      /* ignore */
    }
  }, [stopHeartbeat]);

  const resetLocal = useCallback(() => {
    setRole('idle');
    setStatus('idle');
    setCode(null);
    setConnectedCount(0);
    setLastState(null);
    setError(null);
    lastPublishKeyRef.current = '';
    roleRef.current = 'idle';
    codeRef.current = null;
    lastStateRef.current = null;
  }, []);

  const rememberHint = useCallback((hint: SimpleLiveHint | null) => {
    writeSimpleLiveHint(hint);
    setResumable(hint);
  }, []);

  const publishSnapshot = useCallback((state: SimpleLiveState, force = false) => {
    const key = JSON.stringify({
      songId: state.songId,
      listId: state.listId,
      currentIndex: state.currentIndex,
      viewMode: state.viewMode,
      semitones: state.semitones,
      genderShift: state.genderShift,
      sectionAnchor: state.sectionAnchor,
      listLen: state.listSongIds?.length ?? 0,
      listHead: state.listSongIds?.[0] ?? null,
    });
    if (!force && key === lastPublishKeyRef.current) return;
    lastPublishKeyRef.current = key;
    setLastState(state);
    lastStateRef.current = state;

    const ch = channelRef.current;
    if (!ch) {
      log('publish skipped — no channel');
      return;
    }
    void ch.send({
      type: 'broadcast',
      event: SIMPLE_LIVE_STATE_EVENT,
      payload: state,
    });
    log('published', {
      songId: state.songId,
      viewMode: state.viewMode,
      index: state.currentIndex,
      listId: state.listId,
      force,
    });
  }, []);

  const publish = useCallback(
    (partial: Partial<Omit<SimpleLiveState, 'sessionCode' | 'updatedAt'>>) => {
      if (roleRef.current !== 'director' || !codeRef.current) return;
      const base =
        lastStateRef.current ??
        buildState(codeRef.current, { songId: partial.songId ?? null });
      const next: SimpleLiveState = {
        ...base,
        ...partial,
        sessionCode: codeRef.current,
        updatedAt: new Date().toISOString(),
      };
      publishSnapshot(next);
    },
    [publishSnapshot]
  );

  const startHeartbeat = useCallback(
    (channel: RealtimeChannel, asRole: 'director' | 'follower') => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        void channel.track({
          role: asRole,
          at: new Date().toISOString(),
        });
      }, HEARTBEAT_MS);
    },
    [stopHeartbeat]
  );

  const subscribeChannel = useCallback(
    async (sessionCode: string, asRole: 'director' | 'follower') => {
      await teardownChannel();
      const normalized = normalizeSessionCode(sessionCode);
      const channelName = simpleLiveChannelName(normalized);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          await supabase.realtime.setAuth(session.access_token);
        } catch (e) {
          log('setAuth failed', { error: String(e) });
        }
      }

      const userId = session?.user?.id?.slice(0, 8) ?? 'anon';
      const presenceKey =
        asRole === 'director'
          ? 'director'
          : `f-${userId}-${Math.random().toString(36).slice(2, 6)}`;
      presenceKeyRef.current = presenceKey;

      const channel = supabase.channel(channelName, {
        config: {
          ...CHANNEL_CONFIG,
          presence: { key: presenceKey },
        },
      });
      channelRef.current = channel;

      channel.on('broadcast', { event: SIMPLE_LIVE_STATE_EVENT }, ({ payload }) => {
        if (roleRef.current !== 'follower') return;
        const state = payload as SimpleLiveState;
        if (!state?.sessionCode) return;
        log('state received', {
          songId: state.songId,
          viewMode: state.viewMode,
          index: state.currentIndex,
          listId: state.listId,
        });
        setLastState(state);
        lastStateRef.current = state;
      });

      channel.on('broadcast', { event: SIMPLE_LIVE_REQUEST_EVENT }, () => {
        if (roleRef.current !== 'director' || !lastStateRef.current) return;
        log('request received — republish');
        publishSnapshot(
          {
            ...lastStateRef.current,
            updatedAt: new Date().toISOString(),
          },
          true
        );
      });

      channel.on('broadcast', { event: SIMPLE_LIVE_END_EVENT }, () => {
        if (roleRef.current !== 'follower') return;
        log('director ended session');
        toast.info('El director cerró la sesión');
        rememberHint(null);
        void teardownChannel().then(resetLocal);
      });

      const syncPresence = () => {
        const state = channel.presenceState();
        const followers = countFollowers(state);
        setConnectedCount((prev) => {
          if (prev !== followers) {
            log('presence sync', { keys: Object.keys(state), followers });
          }
          return followers;
        });
      };

      channel.on('presence', { event: 'sync' }, syncPresence);
      channel.on('presence', { event: 'join' }, ({ key }) => {
        syncPresence();
        if (roleRef.current !== 'director' || key === 'director') return;
        if (!lastStateRef.current) return;
        window.setTimeout(() => {
          publishSnapshot(
            {
              ...lastStateRef.current!,
              updatedAt: new Date().toISOString(),
            },
            true
          );
          log('republish for presence join', { key });
        }, 400);
      });
      channel.on('presence', { event: 'leave' }, syncPresence);

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        channel.subscribe(async (statusMsg, err) => {
          log('subscribe', { status: statusMsg, error: err?.message, presenceKey });
          if (statusMsg === 'SUBSCRIBED') {
            try {
              await channel.track({
                role: asRole,
                at: new Date().toISOString(),
              });
            } catch (e) {
              log('presence track failed', { error: String(e) });
            }
            startHeartbeat(channel, asRole);
            setStatus('connected');

            if (asRole === 'follower') {
              void channel.send({
                type: 'broadcast',
                event: SIMPLE_LIVE_REQUEST_EVENT,
                payload: { at: new Date().toISOString() },
              });
              log('requested current state');
            }

            finish(true);
          } else if (
            statusMsg === 'CHANNEL_ERROR' ||
            statusMsg === 'TIMED_OUT' ||
            statusMsg === 'CLOSED'
          ) {
            setStatus('error');
            setError(err?.message ?? statusMsg);
            finish(false);
          }
        });

        window.setTimeout(() => {
          if (!settled) {
            log('subscribe timeout');
            finish(channelRef.current === channel);
          }
        }, 12_000);
      });
    },
    [publishSnapshot, rememberHint, resetLocal, startHeartbeat, teardownChannel]
  );

  const createAsDirector = useCallback(
    async (input: CreateInput) => {
      setError(null);
      setStatus('connecting');

      const auth = await resolveAuthenticatedDirector();
      if (!auth.ok) {
        setStatus('idle');
        setError(auth.message);
        toast.error('Debes iniciar sesión para crear una sesión en vivo');
        return false;
      }

      await deactivateAllMyPreviousSessions();
      const newCode = generateSimpleSessionCode();
      protectDirectorLiveSessionCode(newCode);
      const persistInput = {
        sessionCode: newCode,
        currentSongId: input.songId,
        listId: input.listId ?? null,
        listSongIds: input.listSongIds ?? [],
        viewMode: input.viewMode ?? ('musician' as ViewMode),
        currentIndex: input.currentIndex ?? 0,
        customSemitones: input.semitones ?? 0,
        genderShift:
          input.genderShift === 'male'
            ? ('male' as const)
            : input.genderShift === 'female'
              ? ('female' as const)
              : ('' as const),
        followDirector: true,
      };

      const rpc = await createDirectorLiveSessionRpc(persistInput, {
        localMark: 'protect-only',
      });
      if (!rpc.ok) {
        protectDirectorLiveSessionCode(null);
        setStatus('idle');
        setError(rpc.error ?? 'create failed');
        toast.error(rpc.error ?? 'No se pudo crear la sesión');
        return false;
      }

      setRole('director');
      setCode(newCode);
      roleRef.current = 'director';
      codeRef.current = newCode;
      rememberHint({ code: newCode, role: 'director' });

      const state = buildState(newCode, input);
      setLastState(state);
      lastStateRef.current = state;

      const ok = await subscribeChannel(newCode, 'director');
      if (!ok) {
        toast.error('No se pudo conectar el canal en vivo');
        setStatus('error');
        return false;
      }

      lastPublishKeyRef.current = '';
      publishSnapshot(state, true);

      toast.success(`Sesión activa: ${newCode}`);
      log('director created', { code: newCode });
      return true;
    },
    [publishSnapshot, rememberHint, subscribeChannel]
  );

  const joinAsFollower = useCallback(
    async (rawCode: string) => {
      setError(null);
      const normalized = normalizeSessionCode(rawCode);
      if (normalized.length < 4) {
        toast.error('Código inválido');
        return false;
      }

      setStatus('connecting');
      const check = await querySessionActive(normalized);
      if (!check.active) {
        setStatus('idle');
        const msg = sessionJoinBlockedMessage(check.reason);
        setError(msg);
        toast.error(msg);
        rememberHint(null);
        return false;
      }

      setRole('follower');
      setCode(normalized);
      roleRef.current = 'follower';
      codeRef.current = normalized;
      rememberHint({ code: normalized, role: 'follower' });

      const ok = await subscribeChannel(normalized, 'follower');
      if (!ok) {
        resetLocal();
        toast.error('No se pudo unir al canal');
        return false;
      }

      toast.success(`Unido a ${normalized}`);
      log('follower joined', { code: normalized });
      return true;
    },
    [rememberHint, resetLocal, subscribeChannel]
  );

  const resumeSession = useCallback(async () => {
    const hint = resumable ?? readSimpleLiveHint();
    if (!hint) {
      toast.error('No hay sesión para reingresar');
      return false;
    }

    if (hint.role === 'follower') {
      return joinAsFollower(hint.code);
    }

    // Director: re-activate existing code without generating a new one
    setError(null);
    setStatus('connecting');
    const auth = await resolveAuthenticatedDirector();
    if (!auth.ok) {
      setStatus('idle');
      toast.error('Debes iniciar sesión para reingresar');
      return false;
    }

    const check = await querySessionActive(hint.code);
    if (!check.active) {
      // Try to recreate/activate via RPC with last known empty-ish state
      const rpc = await createDirectorLiveSessionRpc(
        {
          sessionCode: hint.code,
          currentSongId: lastStateRef.current?.songId ?? null,
          listId: lastStateRef.current?.listId ?? null,
          listSongIds: lastStateRef.current?.listSongIds ?? [],
          viewMode: lastStateRef.current?.viewMode ?? 'musician',
          currentIndex: lastStateRef.current?.currentIndex ?? 0,
          customSemitones: lastStateRef.current?.semitones ?? 0,
          followDirector: true,
        },
        { localMark: 'protect-only' }
      );
      if (!rpc.ok) {
        protectDirectorLiveSessionCode(null);
        setStatus('idle');
        rememberHint(null);
        toast.error('La sesión ya no está activa');
        return false;
      }
    }

    setRole('director');
    setCode(hint.code);
    roleRef.current = 'director';
    codeRef.current = hint.code;
    rememberHint(hint);

    const ok = await subscribeChannel(hint.code, 'director');
    if (!ok) {
      setStatus('error');
      toast.error('No se pudo reconectar');
      return false;
    }

    if (lastStateRef.current) {
      publishSnapshot(lastStateRef.current, true);
    }
    toast.success(`Reconectado: ${hint.code}`);
    return true;
  }, [joinAsFollower, publishSnapshot, rememberHint, resumable, subscribeChannel]);

  const dismissResumable = useCallback(() => {
    rememberHint(null);
  }, [rememberHint]);

  // Mid-service WiFi drop: if we were in a live role and come back online, reconnect once.
  // Cold boot stays manual via SimpleLiveResumeBanner (role === idle).
  useEffect(() => {
    const onOnline = () => {
      if (roleRef.current === 'idle') return;
      if (statusRef.current === 'connected' || statusRef.current === 'connecting') return;
      if (resumeInFlightRef.current) return;
      resumeInFlightRef.current = true;
      void resumeSession().finally(() => {
        resumeInFlightRef.current = false;
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [resumeSession]);

  const leave = useCallback(async () => {
    const currentCode = codeRef.current;
    const currentRole = roleRef.current;

    if (currentRole === 'director' && currentCode && channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: SIMPLE_LIVE_END_EVENT,
          payload: { sessionCode: currentCode },
        });
      } catch {
        /* ignore */
      }
      await deactivateLiveSessionRow(currentCode);
    }

    await teardownChannel();
    protectDirectorLiveSessionCode(null);
    rememberHint(null);
    resetLocal();
    clearPendingJoin();
    clearAllLiveSessionLocalState();
    log('left session', { role: currentRole, code: currentCode });
  }, [rememberHint, resetLocal, teardownChannel]);

  const setFollowDirector = useCallback((on: boolean) => {
    writeFollowDirector(on);
    setFollowDirectorState(on);
  }, []);

  const value = useMemo<SimpleLiveSyncContextValue>(
    () => ({
      role,
      status,
      code,
      connectedCount,
      followDirector,
      lastState,
      error,
      resumable,
      createAsDirector,
      joinAsFollower,
      resumeSession,
      dismissResumable,
      leave,
      publish,
      setFollowDirector,
    }),
    [
      role,
      status,
      code,
      connectedCount,
      followDirector,
      lastState,
      error,
      resumable,
      createAsDirector,
      joinAsFollower,
      resumeSession,
      dismissResumable,
      leave,
      publish,
      setFollowDirector,
    ]
  );

  return (
    <SimpleLiveSyncContext.Provider value={value}>{children}</SimpleLiveSyncContext.Provider>
  );
}

export function useSimpleLiveSync(): SimpleLiveSyncContextValue {
  const ctx = useContext(SimpleLiveSyncContext);
  if (!ctx) {
    throw new Error('useSimpleLiveSync must be used within SimpleLiveSyncProvider');
  }
  return ctx;
}

export function useSimpleLiveSyncOptional(): SimpleLiveSyncContextValue | null {
  return useContext(SimpleLiveSyncContext);
}
