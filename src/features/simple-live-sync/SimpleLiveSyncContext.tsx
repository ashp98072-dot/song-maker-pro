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
import { deactivateAllMyPreviousSessions } from '@/features/director-session/utils/ghostSessionCleanup';
import {
  querySessionActive,
  sessionJoinBlockedMessage,
} from '@/features/director-session/utils/checkSessionActive';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { clearPendingJoin } from '@/features/director-session/utils/pendingJoinStorage';
import type { ViewMode } from '@/types/music';
import {
  generateSimpleSessionCode,
  readFollowPreference,
  SIMPLE_LIVE_END_EVENT,
  SIMPLE_LIVE_STATE_EVENT,
  simpleLiveChannelName,
  writeFollowPreference,
  type SimpleLiveRole,
  type SimpleLiveState,
  type SimpleLiveStatus,
} from './types';

const CHANNEL_CONFIG = {
  broadcast: { self: false },
  private: true,
} as const;

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
  createAsDirector: (input: CreateInput) => Promise<boolean>;
  joinAsFollower: (code: string) => Promise<boolean>;
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

export function SimpleLiveSyncProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SimpleLiveRole>('idle');
  const [status, setStatus] = useState<SimpleLiveStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [followDirector, setFollowDirectorState] = useState(readFollowPreference);
  const [lastState, setLastState] = useState<SimpleLiveState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roleRef = useRef<SimpleLiveRole>('idle');
  const codeRef = useRef<string | null>(null);
  const lastStateRef = useRef<SimpleLiveState | null>(null);
  const lastPublishKeyRef = useRef('');

  useEffect(() => {
    roleRef.current = role;
  }, [role]);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    lastStateRef.current = lastState;
  }, [lastState]);

  /** One-time: wipe legacy persistence so old restore loops cannot revive. */
  useEffect(() => {
    clearPendingJoin();
    clearAllLiveSessionLocalState();
    log('cleared legacy session persistence on boot');
  }, []);

  const teardownChannel = useCallback(async () => {
    const ch = channelRef.current;
    channelRef.current = null;
    if (!ch) return;
    try {
      await supabase.removeChannel(ch);
    } catch {
      /* ignore */
    }
  }, []);

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
        });
        setLastState(state);
        lastStateRef.current = state;
      });

      channel.on('broadcast', { event: SIMPLE_LIVE_END_EVENT }, () => {
        if (roleRef.current !== 'follower') return;
        log('director ended session');
        toast.info('El director cerró la sesión');
        void teardownChannel().then(resetLocal);
      });

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        const followers = keys.filter((k) => k !== 'director').length;
        setConnectedCount(followers);
        log('presence sync', { keys, followers });
      });

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
            setStatus('connected');
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
    [resetLocal, teardownChannel]
  );

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
      const key = JSON.stringify({
        songId: next.songId,
        listId: next.listId,
        currentIndex: next.currentIndex,
        viewMode: next.viewMode,
        semitones: next.semitones,
        genderShift: next.genderShift,
        sectionAnchor: next.sectionAnchor,
        listLen: next.listSongIds?.length ?? 0,
      });
      if (key === lastPublishKeyRef.current) return;
      lastPublishKeyRef.current = key;
      setLastState(next);
      lastStateRef.current = next;

      const ch = channelRef.current;
      if (!ch) {
        log('publish skipped — no channel');
        return;
      }
      void ch.send({
        type: 'broadcast',
        event: SIMPLE_LIVE_STATE_EVENT,
        payload: next,
      });
      log('published', { songId: next.songId, viewMode: next.viewMode });
    },
    []
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

      const rpc = await createDirectorLiveSessionRpc(persistInput);
      if (!rpc.ok) {
        setStatus('idle');
        setError(rpc.error ?? 'create failed');
        toast.error(rpc.error ?? 'No se pudo crear la sesión');
        return false;
      }

      setRole('director');
      setCode(newCode);
      roleRef.current = 'director';
      codeRef.current = newCode;

      const state = buildState(newCode, input);
      setLastState(state);
      lastStateRef.current = state;

      const ok = await subscribeChannel(newCode, 'director');
      if (!ok) {
        toast.error('No se pudo conectar el canal en vivo');
        setStatus('error');
        return false;
      }

      // Initial publish after subscribe
      lastPublishKeyRef.current = '';
      publish({
        songId: state.songId,
        listId: state.listId,
        listSongIds: state.listSongIds,
        currentIndex: state.currentIndex,
        viewMode: state.viewMode,
        semitones: state.semitones,
        genderShift: state.genderShift,
        sectionAnchor: state.sectionAnchor,
      });

      toast.success(`Sesión activa: ${newCode}`);
      log('director created', { code: newCode });
      return true;
    },
    [publish, subscribeChannel]
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
        return false;
      }

      setRole('follower');
      setCode(normalized);
      roleRef.current = 'follower';
      codeRef.current = normalized;

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
    [resetLocal, subscribeChannel]
  );

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
    resetLocal();
    clearPendingJoin();
    clearAllLiveSessionLocalState();
    log('left session', { role: currentRole, code: currentCode });
  }, [resetLocal, teardownChannel]);

  const setFollowDirector = useCallback((on: boolean) => {
    writeFollowPreference(on);
    setFollowDirectorState(on);
  }, []);

  // Republish when a follower joins (presence count increases)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (role !== 'director' || status !== 'connected') {
      prevCountRef.current = connectedCount;
      return;
    }
    if (connectedCount > prevCountRef.current && lastStateRef.current) {
      lastPublishKeyRef.current = '';
      publish({ ...lastStateRef.current });
      log('republish for new follower');
    }
    prevCountRef.current = connectedCount;
  }, [connectedCount, publish, role, status]);

  const value = useMemo<SimpleLiveSyncContextValue>(
    () => ({
      role,
      status,
      code,
      connectedCount,
      followDirector,
      lastState,
      error,
      createAsDirector,
      joinAsFollower,
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
      createAsDirector,
      joinAsFollower,
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
