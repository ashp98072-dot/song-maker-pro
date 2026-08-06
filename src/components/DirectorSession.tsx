import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Copy, X, Wifi, ChevronLeft, ChevronRight, MessageSquare, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { matchesSearch } from '@/utils/textNormalize';
import type { SessionState } from '@/types/music';
import type { ViewMode } from '@/types/music';
import type { DirectorSessionConnection, SharedSessionState } from '@/features/director-session/types';
import { normalizeSessionCode } from '@/features/director-session/types';
import {
  clearSessionRecoveryStorage,
  readStoredLiveSession,
  recoveryGenderShiftForPersist,
  resolveLiveSessionForReconnect,
  writeStoredLiveSession,
  type SessionRecoveryMeta,
  type SessionRecoveryState,
} from '@/features/director-session/utils/sessionRecovery';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { SESSION_HARD_CLEAR_EVENT } from '@/features/director-session/utils/sessionHardClearEvents';
import { sessionRecoveryLog } from '@/features/director-session/utils/sessionRecoveryLog';
import { SPECTATOR_SESSION_LEAVE_EVENT } from '@/features/director-session/utils/spectatorSessionEvents';
import { DIRECTOR_SESSION_TERMINATE_EVENT } from '@/features/director-session/utils/directorSessionEvents';
import { SESSION_REDIRECT_EVENT } from '@/features/director-session/utils/sessionRedirectEvents';
import { useSpectatorSessionOptional } from '@/features/director-session/context/SpectatorSessionContext';
import {
  buildSessionOrigin,
  inferSessionOriginFromRecovery,
  isPageInSessionScope,
  type PageSessionContext,
  type SessionOrigin,
} from '@/features/director-session/utils/sessionOrigin';
import { toSharedGenderShift } from '@/features/director-session/utils/genderShift';
import { normalizeOutgoingSharedSession } from '@/features/director-session/realtime/buildFullSessionState';
import { sessionSyncLog } from '@/features/director-session/utils/sessionSyncLog';
import { directorSessionLog } from '@/features/director-session/utils/directorSessionLog';
import {
  createDirectorLiveSessionRpc,
  ensureDirectorLiveSessionPersisted,
  isLiveSessionAuthError,
  resolveAuthenticatedDirector,
  type PersistDirectorLiveSessionInput,
} from '@/features/director-session/utils/persistDirectorLiveSession';
import { deactivateAllMyPreviousSessions } from '@/features/director-session/utils/ghostSessionCleanup';
import {
  activateLiveSessionRow,
  deactivateLiveSessionRow,
} from '@/features/director-session/utils/liveSessionActive';

interface DirectorSessionProps {
  songId: string;
  semitones: number;
  currentKey: string;
  bpm?: number;
  activeSection?: string;
  liveNote?: string;
  listId?: string;
  listSongIds?: string[];
  youtubeUrl?: string;
  youtubePlaying?: boolean;
  youtubeSeek?: number;
  onSessionUpdate?: (state: SessionState) => void;
  onNavigateSong?: (songId: string) => void;
  initialJoinCode?: string;
  onAddSongToList?: (songId: string) => void;
  onConnectionChange?: (connection: DirectorSessionConnection | null) => void;
  onSharedSessionUpdate?: (state: SharedSessionState) => void;
  onSharedSessionEnded?: () => void;
  /** Hidrata UI desde live_sessions antes del broadcast (FASE 4C). */
  onSessionRecovered?: (state: SessionRecoveryState, meta: SessionRecoveryMeta) => void;
  viewMode?: ViewMode;
  genderShift?: '' | 'male' | 'female';
  currentIndex?: number;
  sharedSectionAnchor?: string;
  followDirector?: boolean;
  onFollowDirectorChange?: (value: boolean) => void;
  showFollowDirectorToggle?: boolean;
  /** Si false, el padre muestra el toast al finalizar (evita duplicados). */
  notifyOnSessionEnd?: boolean;
  /** Espectador: solo unirse con acción explícita (Reunirme / código en ruta). Director: sin efecto. */
  autoJoinFollower?: boolean;
  /** Contexto de la pantalla actual (anclaje de sesión). */
  pageContext?: PageSessionContext;
  /** Si false, no reconectar canal en páginas fuera del origen. */
  allowAutoReconnect?: boolean;
  listName?: string;
  /** Panel de sesión visible (p. ej. showSession en continuo). Toast de inicio espera esto. */
  sessionPanelVisible?: boolean;
  /** Al pulsar iniciar (antes de que el canal esté listo). */
  onDirectorSessionStarting?: () => void;
  /** Tras canal unido + notifyConnection; el padre muestra toast y publica estado. */
  onDirectorSessionEstablished?: (code: string) => void;
  onDirectorSessionStartFailed?: () => void;
  /** Sin toast — republicar snapshot para followers recién conectados. */
  onRequestSharedSessionPublish?: () => void;
}

type DirectorChannelJoinState = 'idle' | 'joining' | 'joined' | 'error';

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Campos de live_sessions que se sincronizan con debounce (~400ms). */
interface PersistSnapshot {
  songId: string;
  semitones: number;
  bpm: number | null;
  currentKey: string;
  listSongIds: string[];
  viewMode: string | null;
  genderShift: string | null;
  currentIndex: number;
  listId: string | null;
  sharedSectionAnchor: string | null;
  followDirector: boolean;
}

function buildPersistSnapshot(state: {
  songId: string;
  semitones: number;
  currentKey: string;
  bpm?: number;
  listSongIds?: string[];
  viewMode?: ViewMode;
  genderShift?: '' | 'male' | 'female';
  currentIndex?: number;
  listId?: string;
  sharedSectionAnchor?: string;
  followDirector?: boolean;
}): PersistSnapshot {
  return {
    songId: state.songId,
    semitones: state.semitones,
    bpm: state.bpm ?? null,
    currentKey: state.currentKey,
    listSongIds: state.listSongIds ?? [],
    viewMode: state.viewMode ?? null,
    genderShift: recoveryGenderShiftForPersist(state.genderShift),
    currentIndex: state.currentIndex ?? 0,
    listId: state.listId ?? null,
    sharedSectionAnchor: state.sharedSectionAnchor?.trim() || null,
    followDirector: state.followDirector ?? true,
  };
}

function persistSnapshotsEqual(a: PersistSnapshot, b: PersistSnapshot): boolean {
  return (
    a.songId === b.songId &&
    a.semitones === b.semitones &&
    a.bpm === b.bpm &&
    a.currentKey === b.currentKey &&
    a.viewMode === b.viewMode &&
    a.genderShift === b.genderShift &&
    a.currentIndex === b.currentIndex &&
    a.listId === b.listId &&
    a.sharedSectionAnchor === b.sharedSectionAnchor &&
    a.followDirector === b.followDirector &&
    a.listSongIds.length === b.listSongIds.length &&
    a.listSongIds.every((id, i) => id === b.listSongIds[i])
  );
}

export default function DirectorSession({
  songId,
  semitones,
  currentKey,
  bpm,
  activeSection,
  liveNote,
  listId,
  listSongIds,
  youtubeUrl,
  youtubePlaying,
  youtubeSeek,
  onSessionUpdate,
  onNavigateSong,
  initialJoinCode,
  onAddSongToList,
  onConnectionChange,
  onSharedSessionUpdate,
  onSharedSessionEnded,
  onSessionRecovered,
  viewMode,
  genderShift = '',
  currentIndex = 0,
  sharedSectionAnchor = '',
  followDirector = true,
  onFollowDirectorChange,
  showFollowDirectorToggle = true,
  notifyOnSessionEnd = true,
  autoJoinFollower = false,
  pageContext,
  allowAutoReconnect = true,
  listName,
  sessionPanelVisible = true,
  onDirectorSessionStarting,
  onDirectorSessionEstablished,
  onDirectorSessionStartFailed,
  onRequestSharedSessionPublish,
}: DirectorSessionProps) {
  const navigate = useNavigate();
  const { songs, userName, isGuest } = useApp();
  const liveSessionCtx = useSpectatorSessionOptional();
  const {
    connection: globalConnection,
    liveIsDirector: isDirector,
    liveSessionCode: sessionCode,
    liveIsFollower: isFollower,
    liveFollowerCode: followerCode,
    directorChannelJoin,
    connectedCount,
    beginDirectorSession,
    endDirectorSession,
    beginFollowerSession,
    leaveFollowerSession,
    registerPageHandlers,
    updateBroadcastState,
    scheduleBroadcast: globalScheduleBroadcast,
    publishSharedSessionIfDirector,
    publishFullSessionStateIfDirector,
  } = liveSessionCtx ?? {
    connection: null,
    liveIsDirector: false,
    liveSessionCode: '',
    liveIsFollower: false,
    liveFollowerCode: '',
    directorChannelJoin: 'idle' as DirectorChannelJoinState,
    connectedCount: 0,
    beginDirectorSession: () => {},
    endDirectorSession: async () => {},
    beginFollowerSession: () => {},
    leaveFollowerSession: () => {},
    registerPageHandlers: () => () => {},
    updateBroadcastState: () => {},
    scheduleBroadcast: () => {},
    publishSharedSessionIfDirector: () => {},
    publishFullSessionStateIfDirector: () => {},
  };

  const [joinCode, setJoinCode] = useState(initialJoinCode || followerCode || '');
  const [draftNote, setDraftNote] = useState('');
  const [songSearch, setSongSearch] = useState('');

  const lastPersistedRef = useRef<{ code: string; snapshot: PersistSnapshot } | null>(null);
  const prevSongIdRef = useRef(songId);
  const prevViewModeRef = useRef(viewMode);
  const prevGenderShiftRef = useRef(genderShift);
  const prevCurrentIndexRef = useRef(currentIndex);
  const prevListSignatureRef = useRef('');
  const lastRecoveryKeyRef = useRef('');
  const sessionOriginRef = useRef<SessionOrigin | null>(null);
  const useGlobalChannel = !!liveSessionCtx;

  const effectivePageContext = pageContext ?? { songId, listId, listSongIds };

  const isOutOfSessionScope = useCallback(() => {
    const origin = sessionOriginRef.current;
    if (!origin || !isDirector) return false;
    return !isPageInSessionScope(origin, effectivePageContext);
  }, [isDirector, effectivePageContext, songId, listId, listSongIds]);

  // Mantenemos siempre el estado más reciente en un ref, para que el broadcast
  // pueda enviar datos actualizados SIN necesidad de recrear el canal.
  const stateRef = useRef({
    songId,
    semitones,
    currentKey,
    bpm,
    activeSection,
    liveNote,
    listId,
    listSongIds,
    youtubeUrl,
    youtubePlaying,
    youtubeSeek,
    viewMode,
    genderShift,
    currentIndex,
    sharedSectionAnchor,
    followDirector,
  });
  const broadcastOverridesRef = useRef<Partial<typeof stateRef.current> | undefined>(undefined);
  useEffect(() => {
    stateRef.current = {
      songId,
      semitones,
      currentKey,
      bpm,
      activeSection,
      liveNote,
      listId,
      listSongIds,
      youtubeUrl,
      youtubePlaying,
      youtubeSeek,
      viewMode,
      genderShift,
      currentIndex,
      sharedSectionAnchor,
      followDirector,
    };
  }, [
    songId,
    semitones,
    currentKey,
    bpm,
    activeSection,
    liveNote,
    listId,
    listSongIds,
    youtubeUrl,
    youtubePlaying,
    youtubeSeek,
    viewMode,
    genderShift,
    currentIndex,
    sharedSectionAnchor,
    followDirector,
  ]);

  const onSessionUpdateRef = useRef(onSessionUpdate);
  useEffect(() => { onSessionUpdateRef.current = onSessionUpdate; }, [onSessionUpdate]);

  const onConnectionChangeRef = useRef(onConnectionChange);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);

  const onSharedSessionUpdateRef = useRef(onSharedSessionUpdate);
  useEffect(() => { onSharedSessionUpdateRef.current = onSharedSessionUpdate; }, [onSharedSessionUpdate]);

  const onSharedSessionEndedRef = useRef(onSharedSessionEnded);
  useEffect(() => { onSharedSessionEndedRef.current = onSharedSessionEnded; }, [onSharedSessionEnded]);

  const onSessionRecoveredRef = useRef(onSessionRecovered);
  useEffect(() => { onSessionRecoveredRef.current = onSessionRecovered; }, [onSessionRecovered]);

  const onDirectorSessionEstablishedRef = useRef(onDirectorSessionEstablished);
  useEffect(() => {
    onDirectorSessionEstablishedRef.current = onDirectorSessionEstablished;
  }, [onDirectorSessionEstablished]);

  const onDirectorSessionStartFailedRef = useRef(onDirectorSessionStartFailed);
  useEffect(() => {
    onDirectorSessionStartFailedRef.current = onDirectorSessionStartFailed;
  }, [onDirectorSessionStartFailed]);

  const onRequestSharedSessionPublishRef = useRef(onRequestSharedSessionPublish);
  useEffect(() => {
    onRequestSharedSessionPublishRef.current = onRequestSharedSessionPublish;
  }, [onRequestSharedSessionPublish]);

  const sessionPanelVisibleRef = useRef(sessionPanelVisible);
  useEffect(() => {
    sessionPanelVisibleRef.current = sessionPanelVisible;
  }, [sessionPanelVisible]);

  const scheduleBroadcast = useCallback(
    (opts?: { immediate?: boolean; overrides?: Partial<typeof stateRef.current> }) => {
      if (useGlobalChannel) {
        if (opts?.overrides) {
          stateRef.current = { ...stateRef.current, ...opts.overrides };
          updateBroadcastState({ ...stateRef.current });
        }
        globalScheduleBroadcast(opts);
        return;
      }
    },
    [useGlobalChannel, globalScheduleBroadcast, updateBroadcastState]
  );

  const sessionStartPublishedRef = useRef<string | null>(null);

  const publishFullDirectorState = useCallback(
    (reason: string) => {
      if (!useGlobalChannel || !isDirector || !sessionCode) return;
      if (isOutOfSessionScope()) return;

      const s = stateRef.current;
      updateBroadcastState({
        songId: s.songId,
        semitones: s.semitones,
        currentKey: s.currentKey,
        bpm: s.bpm,
        activeSection: s.activeSection,
        liveNote: s.liveNote,
        listId: s.listId,
        listSongIds: s.listSongIds,
        viewMode: s.viewMode,
        genderShift: s.genderShift,
        currentIndex: s.currentIndex,
        sharedSectionAnchor: s.sharedSectionAnchor,
        followDirector: s.followDirector,
      });

      const payload = normalizeOutgoingSharedSession(sessionCode, {
        sessionId: sessionCode,
        currentSongId: s.songId,
        currentIndex: s.currentIndex,
        listId: s.listId ?? null,
        listSongIds: s.listSongIds,
        customSemitones: s.semitones,
        genderShift: toSharedGenderShift(s.genderShift),
        viewMode: s.viewMode ?? 'musician',
        sharedSectionAnchor: s.sharedSectionAnchor || undefined,
        updatedAt: new Date().toISOString(),
      });

      console.log('[DIRECTOR_PUBLISH_FULL]', {
        reason,
        sessionCode,
        viewMode: payload.viewMode,
        currentIndex: payload.currentIndex,
        genderShift: payload.genderShift,
        listId: payload.listId,
        songId: payload.currentSongId,
        sharedSectionAnchor: payload.sharedSectionAnchor ?? null,
      });

      directorSessionLog(
        'publish full state',
        {
          reason,
          viewMode: payload.viewMode,
          currentIndex: payload.currentIndex,
          genderShift: payload.genderShift,
        },
        { always: true }
      );

      publishSharedSessionIfDirector(sessionCode, payload, { immediate: true });
      publishFullSessionStateIfDirector(sessionCode, { force: true });
    },
    [
      useGlobalChannel,
      isDirector,
      sessionCode,
      isOutOfSessionScope,
      updateBroadcastState,
      publishSharedSessionIfDirector,
      publishFullSessionStateIfDirector,
    ]
  );

  const isOutOfSessionScopeRef = useRef(isOutOfSessionScope);
  isOutOfSessionScopeRef.current = isOutOfSessionScope;

  useEffect(() => {
    if (!useGlobalChannel) return;
    return registerPageHandlers({
      onSessionUpdate: (state) => onSessionUpdateRef.current?.(state),
      onSharedSessionUpdate: (state) => onSharedSessionUpdateRef.current?.(state),
      onSharedSessionEnded: () => onSharedSessionEndedRef.current?.(),
      onSessionRecovered: (state, meta) => onSessionRecoveredRef.current?.(state, meta),
      onDirectorSessionEstablished: (code) =>
        onDirectorSessionEstablishedRef.current?.(code),
      onDirectorSessionStartFailed: () => onDirectorSessionStartFailedRef.current?.(),
      onRequestSharedSessionPublish: () =>
        onRequestSharedSessionPublishRef.current?.(),
      notifyOnSessionEnd,
    });
  }, [
    useGlobalChannel,
    registerPageHandlers,
    onSessionUpdate,
    onSharedSessionUpdate,
    onSharedSessionEnded,
    onSessionRecovered,
    onDirectorSessionEstablished,
    onDirectorSessionStartFailed,
    onRequestSharedSessionPublish,
    notifyOnSessionEnd,
  ]);

  useEffect(() => {
    updateBroadcastState(stateRef.current);
  }, [
    updateBroadcastState,
    songId,
    semitones,
    currentKey,
    bpm,
    activeSection,
    liveNote,
    listId,
    listSongIds,
    youtubeUrl,
    youtubePlaying,
    youtubeSeek,
    viewMode,
    genderShift,
    currentIndex,
    sharedSectionAnchor,
    followDirector,
  ]);

  useEffect(() => {
    onConnectionChangeRef.current?.(globalConnection);
  }, [globalConnection]);

  const navFieldsPublishSigRef = useRef('');

  /** Immediate full publish when view_mode / index / list change (no debounce). */
  useEffect(() => {
    if (!useGlobalChannel || !isDirector || !sessionCode || isOutOfSessionScope()) return;
    const listSignature = `${listId ?? ''}|${(listSongIds ?? []).join(',')}`;
    const sig = `${viewMode}|${currentIndex}|${listSignature}`;
    if (navFieldsPublishSigRef.current === sig) return;
    navFieldsPublishSigRef.current = sig;
    publishFullDirectorState('nav-fields-immediate');
  }, [
    useGlobalChannel,
    isDirector,
    sessionCode,
    viewMode,
    currentIndex,
    listId,
    listSongIds,
    isOutOfSessionScope,
    publishFullDirectorState,
  ]);

  /** view_mode, current_index, gender_shift, list — full shared-session (followers + view routing). */
  useEffect(() => {
    if (!isDirector || !sessionCode || isOutOfSessionScope()) return;

    const viewModeChanged = prevViewModeRef.current !== viewMode;
    const genderChanged = prevGenderShiftRef.current !== genderShift;
    const indexChanged = prevCurrentIndexRef.current !== currentIndex;
    const listSignature = `${listId ?? ''}|${(listSongIds ?? []).join(',')}`;
    const listChanged = prevListSignatureRef.current !== listSignature;

    if (viewModeChanged) {
      console.log('[DIRECTOR_VIEW_MODE]', {
        from: prevViewModeRef.current,
        to: viewMode,
        sessionCode,
        currentIndex,
        listId: listId ?? null,
        songId,
      });
      prevViewModeRef.current = viewMode;
    }

    if (genderChanged) {
      console.log('[DIRECTOR_GENDER_SHIFT]', {
        from: prevGenderShiftRef.current,
        to: genderShift,
        sessionCode,
        songId,
      });
      prevGenderShiftRef.current = genderShift;
    }

    if (indexChanged) {
      console.log('[DIRECTOR_CURRENT_INDEX]', {
        from: prevCurrentIndexRef.current,
        to: currentIndex,
        sessionCode,
        songId,
        listId: listId ?? null,
      });
      prevCurrentIndexRef.current = currentIndex;
    }

    if (listChanged) {
      prevListSignatureRef.current = listSignature;
    }

    const songChanged = prevSongIdRef.current !== songId;
    if (songChanged) {
      prevSongIdRef.current = songId;
    }

    if (viewModeChanged) {
      publishFullDirectorState('view-mode-change');
    }
    if (genderChanged || indexChanged || listChanged || songChanged) {
      const reasons: string[] = [];
      if (genderChanged) reasons.push('gender-shift');
      if (indexChanged) reasons.push('current-index');
      if (listChanged) reasons.push('list');
      if (songChanged) reasons.push('song-id');
      publishFullDirectorState(reasons.join('+'));
    }
  }, [
    viewMode,
    genderShift,
    currentIndex,
    songId,
    listId,
    listSongIds,
    isDirector,
    sessionCode,
    isOutOfSessionScope,
    publishFullDirectorState,
  ]);

  /** Publish full snapshot when director session code becomes active (join / reconnect). */
  useEffect(() => {
    if (!useGlobalChannel || !isDirector || !sessionCode) return;
    if (sessionStartPublishedRef.current === sessionCode) return;
    sessionStartPublishedRef.current = sessionCode;
    publishFullDirectorState('session-start');
  }, [useGlobalChannel, isDirector, sessionCode, publishFullDirectorState]);

  /** Republish on mount so followers waiting on overlay receive handshake quickly. */
  useEffect(() => {
    if (!useGlobalChannel || !isDirector || !sessionCode) return;
    const t = window.setTimeout(() => {
      publishFullDirectorState('initial-handshake');
    }, 800);
    return () => window.clearTimeout(t);
  }, [useGlobalChannel, isDirector, sessionCode, publishFullDirectorState]);

  /** Transpose, key, bpm, section, youtube — legacy sync broadcast (debounced). */
  useEffect(() => {
    if (!isDirector || !sessionCode || isOutOfSessionScope()) return;
    scheduleBroadcast();
  }, [
    semitones,
    currentKey,
    bpm,
    activeSection,
    liveNote,
    youtubeUrl,
    youtubePlaying,
    youtubeSeek,
    sharedSectionAnchor,
    isDirector,
    sessionCode,
    scheduleBroadcast,
    isOutOfSessionScope,
  ]);

  const buildDirectorPersistInput = useCallback(
    (code: string, origin: SessionOrigin | null): PersistDirectorLiveSessionInput => {
      const snapshot = buildPersistSnapshot({
        songId,
        semitones,
        currentKey,
        bpm,
        listSongIds,
        viewMode,
        genderShift,
        currentIndex,
        listId,
        sharedSectionAnchor,
        followDirector,
      });
      return {
        sessionCode: code,
        currentSongId: snapshot.songId || null,
        listId: snapshot.listId,
        listSongIds: snapshot.listSongIds,
        viewMode: (snapshot.viewMode as ViewMode) ?? 'musician',
        currentIndex: snapshot.currentIndex,
        customSemitones: snapshot.semitones,
        currentKey: snapshot.currentKey ?? undefined,
        bpm: snapshot.bpm,
        sharedSectionAnchor: snapshot.sharedSectionAnchor,
        genderShift:
          snapshot.genderShift === 'male'
            ? 'male'
            : snapshot.genderShift === 'female'
              ? 'female'
              : '',
        followDirector: snapshot.followDirector,
        sessionOrigin: origin,
      };
    },
    [
      songId,
      semitones,
      currentKey,
      bpm,
      listSongIds,
      viewMode,
      genderShift,
      currentIndex,
      listId,
      sharedSectionAnchor,
      followDirector,
    ]
  );

  const startSession = async () => {
    const doStart = async () => {
      let auth = await resolveAuthenticatedDirector();
      if (!auth.ok && userName && !isGuest) {
        await supabase.auth.refreshSession();
        auth = await resolveAuthenticatedDirector();
      }

      if (!auth.ok) {
        if (isGuest) {
          toast.error('Los invitados no pueden crear sesiones en vivo. Inicia sesión con tu cuenta.');
        } else if (userName) {
          toast.error('No se pudo validar tu sesión. Recarga la página o vuelve a iniciar sesión.');
        } else {
          toast.error('Debes iniciar sesión para crear una sesión en vivo');
        }
        directorSessionLog('session create blocked — not authenticated', { userName, isGuest }, { always: true });
        onDirectorSessionStartFailed?.();
        if (!userName) navigate('/login');
        return;
      }

      await deactivateAllMyPreviousSessions();

      const code = generateSessionCode();
      const origin = buildSessionOrigin({
        songId,
        listId,
        listSongIds,
        listName,
      });
      directorSessionLog('creating session', { code, songId, listId, directorId: auth.userId }, { always: true });
      onDirectorSessionStarting?.();
      sessionOriginRef.current = origin;
      lastPersistedRef.current = null;
      sessionStartPublishedRef.current = code;

      const persistInput = buildDirectorPersistInput(code, origin);
      const rpcResult = await createDirectorLiveSessionRpc(persistInput);
      directorSessionLog('session created RPC', { code, rpcResult }, { always: true });

      if (!rpcResult.ok) {
        if (isLiveSessionAuthError(rpcResult)) {
          if (userName && !isGuest) {
            toast.error(`Error de autenticación en el servidor: ${rpcResult.error ?? 'sesión no válida'}`);
          } else {
            toast.error('Debes iniciar sesión para crear una sesión en vivo');
            navigate('/login');
          }
        } else {
          toast.error(rpcResult.error ?? 'No se pudo crear la sesión en la base de datos');
        }
        onDirectorSessionStartFailed?.();
        return;
      }

      beginDirectorSession({ code, origin, isNew: true, persistInput, rpcPersisted: true });
      publishFullDirectorState('session-created');
    };
    if (liveSessionCtx) {
      await liveSessionCtx.requestDirectorSessionStart(doStart);
    } else {
      await doStart();
    }
  };

  const endSession = (opts?: { silent?: boolean }) => {
    lastPersistedRef.current = null;
    void endDirectorSession(opts);
  };

  const joinSession = () => {
    const code = normalizeSessionCode(joinCode);
    if (code.length < 4) return toast.error('Código de sesión inválido (mínimo 4 caracteres)');
    sessionSyncLog('follower explicit join', { code, raw: joinCode });
    setJoinCode(code);
    if (liveSessionCtx) {
      void liveSessionCtx.joinWithCode(code);
    } else {
      toast.error('Servicio de sesión no disponible');
    }
  };

  const leaveSession = useCallback(() => {
    leaveFollowerSession();
    setJoinCode('');
  }, [leaveFollowerSession]);

  useEffect(() => {
    const onHardLeave = () => {
      if (isFollower) leaveSession();
    };
    window.addEventListener(SPECTATOR_SESSION_LEAVE_EVENT, onHardLeave);
    return () => window.removeEventListener(SPECTATOR_SESSION_LEAVE_EVENT, onHardLeave);
  }, [isFollower, leaveSession]);

  useEffect(() => {
    const onTerminate = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string }>).detail;
      if (detail?.code && sessionCode && detail.code !== sessionCode) return;
      if (isDirector) endSession({ silent: true });
    };
    window.addEventListener(DIRECTOR_SESSION_TERMINATE_EVENT, onTerminate);
    return () => window.removeEventListener(DIRECTOR_SESSION_TERMINATE_EVENT, onTerminate);
  }, [isDirector, sessionCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHardClear = () => {
      lastRecoveryKeyRef.current = '';
      lastPersistedRef.current = null;
      setJoinCode('');
    };
    window.addEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
    return () => window.removeEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
  }, []);
  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    toast.success('Código copiado');
  };

  const sendLiveNote = () => {
    if (!draftNote.trim()) return;
    scheduleBroadcast({ immediate: true, overrides: { liveNote: draftNote.trim() } });
    toast.success('Nota enviada');
    setDraftNote('');
  };

  // Persistencia en BD para reconexión (deduplicada; debounce ~400ms en el effect)
  const persistSession = useCallback(async (
    code: string,
    active: boolean,
    opts?: { force?: boolean }
  ): Promise<boolean> => {
    try {
      if (active && isOutOfSessionScope() && !opts?.force) {
        directorSessionLog('persist skipped — out of session scope', { code });
        return false;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        directorSessionLog('persist skipped — no auth session', { code });
        return false;
      }

      const snapshot = buildPersistSnapshot(stateRef.current);
      const last = lastPersistedRef.current;
      if (
        active &&
        !opts?.force &&
        last?.code === code &&
        persistSnapshotsEqual(snapshot, last.snapshot)
      ) {
        return true;
      }

      if (!active) {
        await deactivateLiveSessionRow(code);
        lastPersistedRef.current = null;
        return true;
      }

      const persistInput = {
        sessionCode: code,
        currentSongId: snapshot.songId,
        listId: snapshot.listId,
        listSongIds: snapshot.listSongIds,
        viewMode: (snapshot.viewMode as ViewMode) ?? 'musician',
        currentIndex: snapshot.currentIndex,
        customSemitones: snapshot.semitones,
        currentKey: snapshot.currentKey ?? undefined,
        bpm: snapshot.bpm,
        sharedSectionAnchor: snapshot.sharedSectionAnchor,
        genderShift:
          snapshot.genderShift === 'male'
            ? 'male'
            : snapshot.genderShift === 'female'
              ? 'female'
              : ('' as const),
        followDirector: snapshot.followDirector,
        sessionOrigin: sessionOriginRef.current,
      };

      const ok = await ensureDirectorLiveSessionPersisted(persistInput);

      if (ok) {
        lastPersistedRef.current = { code, snapshot };
      }
      return ok;
    } catch (e) {
      console.error('persistSession:', e);
      return false;
    }
  }, [isOutOfSessionScope]);

  // Mantiene is_active=true cada 5s mientras el director tiene sesión abierta.
  useEffect(() => {
    if (!isDirector || !sessionCode) return;
    void activateLiveSessionRow(sessionCode);
    const keepActive = window.setInterval(() => {
      void activateLiveSessionRow(sessionCode);
    }, 5000);
    return () => window.clearInterval(keepActive);
  }, [isDirector, sessionCode]);

  // Sync de campos de navegación en BD (debounce separado del heartbeat de is_active).
  useEffect(() => {
    if (!isDirector || !sessionCode) return;
    const syncFields = window.setInterval(() => {
      void persistSession(sessionCode, true);
    }, 10000);
    return () => window.clearInterval(syncFields);
  }, [isDirector, sessionCode, persistSession]);

  // Sync periódico del director con la BD para reconexión
  useEffect(() => {
    if (!isDirector || !sessionCode) return;
    const t = setTimeout(() => persistSession(sessionCode, true), 400);
    return () => clearTimeout(t);
  }, [
    isDirector,
    sessionCode,
    songId,
    semitones,
    currentKey,
    bpm,
    listSongIds,
    listId,
    viewMode,
    genderShift,
    currentIndex,
    sharedSectionAnchor,
    followDirector,
    persistSession,
  ]);

  // Reconexión: hidrata UI en página; el canal lo mantiene SessionProvider.
  useEffect(() => {
    const stored = readStoredLiveSession();
    const codeCandidate = initialJoinCode || stored?.code;
    if (!codeCandidate) return;

    const recoveryKey = [
      codeCandidate,
      autoJoinFollower ? '1' : '0',
      initialJoinCode ?? '',
      allowAutoReconnect ? '1' : '0',
      effectivePageContext.songId ?? '',
      effectivePageContext.listId ?? '',
    ].join('|');

    if (lastRecoveryKeyRef.current === recoveryKey) return;

    let cancelled = false;
    (async () => {
      try {
        let recovery = await resolveLiveSessionForReconnect(codeCandidate);
        let code = codeCandidate.trim().toUpperCase();

        if (!recovery && initialJoinCode && initialJoinCode.length >= 4 && autoJoinFollower) {
          recovery = await resolveLiveSessionForReconnect(initialJoinCode);
          code = initialJoinCode.trim().toUpperCase();
        }

        if (cancelled || !recovery) {
          if (!recovery && !cancelled && !isDirector && !isFollower) {
            clearSessionRecoveryStorage();
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const isOwner = session?.user?.id === recovery.directorId;
        const role: 'director' | 'follower' = isOwner
          ? 'director'
          : stored?.role === 'follower' || initialJoinCode
            ? 'follower'
            : 'follower';

        if (role === 'director' && !isOwner) {
          clearAllLiveSessionLocalState(code);
          return;
        }

        if (role === 'follower' && !autoJoinFollower) {
          sessionSyncLog('follower reconnect skipped — no explicit join', { code });
          return;
        }

        const origin =
          stored?.origin ?? inferSessionOriginFromRecovery(recovery);
        sessionOriginRef.current = origin;

        if (role === 'director' && isOwner) {
          if (!allowAutoReconnect || (origin && !isPageInSessionScope(origin, effectivePageContext))) {
            sessionRecoveryLog('director reconnect skipped — out of session scope');
            return;
          }
          if (isDirector && sessionCode === code && globalConnection?.role === 'director') {
            sessionSyncLog('director already connected', { code });
            onSessionRecoveredRef.current?.(recovery, { role, code });
            lastRecoveryKeyRef.current = recoveryKey;
            return;
          }
        }

        if (role === 'follower' && isFollower && followerCode.toUpperCase() === code && globalConnection?.role === 'follower') {
          sessionSyncLog('follower already connected', { code });
          onSessionRecoveredRef.current?.(recovery, { role, code });
          lastRecoveryKeyRef.current = recoveryKey;
          return;
        }

        sessionRecoveryLog('hydrate session', { code, role, viewMode: recovery.viewMode });
        sessionSyncLog('recovery connecting', { code, role, autoJoinFollower });
        onSessionRecoveredRef.current?.(recovery, { role, code });

        if (role === 'director' && isOwner) {
          beginDirectorSession({ code, origin, isNew: false });
          lastRecoveryKeyRef.current = recoveryKey;
        } else if (role === 'follower') {
          if (liveSessionCtx) {
            void liveSessionCtx.joinWithCode(code);
          } else {
            beginFollowerSession(code);
            setJoinCode(code);
          }
          lastRecoveryKeyRef.current = recoveryKey;
        }
      } catch (e) {
        console.error('auto-reconnect:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    initialJoinCode,
    autoJoinFollower,
    allowAutoReconnect,
    effectivePageContext.songId,
    effectivePageContext.listId,
    isDirector,
    isFollower,
    joinCode,
    sessionCode,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Asegura canal de seguidor cuando hay join explícito (código en ruta / Reunirme). */
  useEffect(() => {
    if (!autoJoinFollower || isDirector) return;

    const code = (initialJoinCode || readStoredLiveSession()?.code)?.trim().toUpperCase();
    if (!code || code.length < 4) return;
    if (isFollower && followerCode === code && globalConnection?.role === 'follower') return;

    void liveSessionCtx?.joinWithCode(code);
  }, [autoJoinFollower, initialJoinCode, isDirector, isFollower, followerCode, globalConnection, liveSessionCtx]);

  useEffect(() => {
    const onRedirect = (event: Event) => {
      const detail = (event as CustomEvent<import('@/features/director-session/utils/sessionRedirectEvents').SessionRedirectDetail>).detail;
      if (!detail || (sessionCode && detail.code !== sessionCode)) return;

      sessionOriginRef.current = detail.origin;
      stateRef.current = {
        ...stateRef.current,
        songId: detail.songId,
        listId: detail.listId ?? undefined,
        listSongIds: detail.listSongIds ?? [],
        currentIndex: detail.currentIndex ?? 0,
        viewMode: (detail.viewMode as ViewMode) ?? stateRef.current.viewMode,
      };

      beginDirectorSession({ code: detail.code, origin: detail.origin, isNew: false });
      void persistSession(detail.code, true);
      publishFullDirectorState('session-redirect');
    };

    window.addEventListener(SESSION_REDIRECT_EVENT, onRedirect);
    return () => window.removeEventListener(SESSION_REDIRECT_EVENT, onRedirect);
  }, [sessionCode, isDirector, persistSession, publishFullDirectorState, beginDirectorSession]);

  // Buscador para añadir canciones in-session
  const filteredSongs = songSearch
    ? songs.filter(s => matchesSearch(s.title, songSearch) || matchesSearch(s.artist, songSearch)).slice(0, 8)
    : [];

  const handleAddSong = (sid: string) => {
    if (listSongIds?.includes(sid)) return toast.info('Ya está en la lista');
    onAddSongToList?.(sid);
    setSongSearch('');
    toast.success('Canción añadida a la sesión');
  };

  // Setlist nav (Director)
  const listNavIndex = listSongIds?.indexOf(songId) ?? -1;
  const hasPrev = listNavIndex > 0;
  const hasNext = listSongIds && listNavIndex >= 0 && listNavIndex < listSongIds.length - 1;
  const goPrev = () => hasPrev && onNavigateSong?.(listSongIds![listNavIndex - 1]);
  const goNext = () => hasNext && onNavigateSong?.(listSongIds![listNavIndex + 1]);

  return (
    <div className="glass-card p-4 mt-4 border-t border-white/10 bg-black/10">
      <label className="text-[10px] font-black text-gold flex items-center gap-1.5 mb-3 uppercase tracking-[0.2em]">
        <Radio className={`w-3.5 h-3.5 ${isDirector ? 'animate-pulse text-red-500' : 'text-gold'}`} />
        {isDirector ? 'Transmitiendo en Vivo' : isFollower ? 'Modo Escucha Activo' : 'Sincronización'}
      </label>

      {!isDirector && !isFollower && (
        <div className="space-y-3">
          <button onClick={startSession}
            className="w-full py-3 rounded-xl gold-gradient text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]">
            <Wifi className="w-4 h-4" /> Ser el Director
          </button>
          <div className="relative flex items-center">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO..."
              maxLength={6}
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-secondary/40 border border-white/10 text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none uppercase font-mono tracking-[0.2em]"
            />
            <button onClick={joinSession} disabled={joinCode.length < 4}
              className="absolute right-1.5 p-2 rounded-lg bg-gold text-primary-foreground disabled:opacity-30 transition-all">
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isDirector && (
        <div className="space-y-3 animate-in fade-in duration-500">
          {directorChannelJoin === 'joining' && (
            <p className="text-xs text-amber-300/90 text-center py-1">
              Conectando sesión en vivo…
            </p>
          )}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gold/5 border border-gold/20">
            <div>
              <p className="text-[9px] text-gold/60 uppercase font-black">Tu código:</p>
              <p className="text-3xl font-mono font-black text-gold tracking-widest">{sessionCode}</p>
            </div>
            <button onClick={copyCode} className="p-3 bg-gold/10 rounded-full text-gold hover:bg-gold/20 transition-all">
              <Copy className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold px-1">
            <span className="inline-flex items-center gap-1 text-amber-400/90 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              Sincronizando asistentes
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4 text-gold" />
              {connectedCount} conectados
            </span>
          </div>

          {/* Setlist nav */}
          {listSongIds && listSongIds.length > 1 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/40 border border-white/5">
              <button onClick={goPrev} disabled={!hasPrev}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-foreground disabled:opacity-30">
                <ChevronLeft className="w-3 h-3" /> Anterior
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">
                {listNavIndex + 1} / {listSongIds.length}
              </span>
              <button onClick={goNext} disabled={!hasNext}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-foreground disabled:opacity-30">
                Siguiente <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Buscador in-session para añadir canciones */}
          {onAddSongToList && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={songSearch}
                  onChange={e => setSongSearch(e.target.value)}
                  placeholder="Añadir canción a la lista..."
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-secondary/40 border border-white/10 text-foreground text-xs outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>
              {filteredSongs.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/5 bg-black/20 divide-y divide-white/5">
                  {filteredSongs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleAddSong(s.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-gold/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-foreground truncate">{s.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{s.artist}</p>
                      </div>
                      <Plus className="w-3 h-3 text-gold shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live note input */}
          <div className="flex gap-2">
            <input value={draftNote} onChange={e => setDraftNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendLiveNote()}
              placeholder="Nota a la banda..."
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/40 border border-white/10 text-foreground text-xs outline-none focus:ring-1 focus:ring-gold/40" />
            <button onClick={sendLiveNote} disabled={!draftNote.trim()}
              className="px-2 rounded-lg bg-gold/20 text-gold disabled:opacity-30">
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={endSession}
            className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
            <X className="w-3.5 h-3.5" /> Detener
          </button>
        </div>
      )}

      {isFollower && (
        <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <p className="text-[9px] text-blue-400/70 uppercase font-black">Siguiendo a:</p>
            <p className="text-3xl font-mono font-black text-blue-400 tracking-widest">{joinCode}</p>
            <div className="flex items-center gap-2 mt-3 bg-black/20 p-2 rounded-lg">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-[9px] text-green-400 font-bold uppercase tracking-wider">
                {followDirector ? 'Siguiendo al director' : 'Sesión activa (sin seguir)'}
              </p>
            </div>
            {isFollower && onFollowDirectorChange ? (
              <label className="flex items-center justify-between gap-2 mt-2 px-2 py-1.5 rounded-lg bg-black/20 cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {followDirector ? 'Seguir al director' : 'Dejar de seguir al director'}
                </span>
                <input
                  type="checkbox"
                  checked={followDirector}
                  onChange={(e) => onFollowDirectorChange(e.target.checked)}
                  className="h-4 w-4 accent-gold"
                  aria-label={followDirector ? 'Seguir al director' : 'Dejar de seguir al director'}
                />
              </label>
            ) : null}
          </div>
          <button onClick={leaveSession}
            className="w-full py-2.5 rounded-xl border border-white/5 text-muted-foreground hover:text-red-400 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
            <X className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      )}
    </div>
  );
}
