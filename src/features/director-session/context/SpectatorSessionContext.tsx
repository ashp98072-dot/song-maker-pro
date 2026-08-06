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
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  enrichRecoveryForNavigation,
  isContinuousRecoveryReady,
  readStoredLiveSession,
  resolveLiveSessionForReconnect,
  resolveLiveSessionForReconnectWithRetry,
  getLiveSessionByCode,
  mapLiveSessionRow,
  queryLiveSessionForFollowerNav,
  writeStoredLiveSession,
  type SessionRecoveryState,
  type StoredLiveSessionRole,
} from '@/features/director-session/utils/sessionRecovery';
import { getJoinPathname, joinDebugLog } from '@/features/director-session/utils/joinNavigationDebug';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { SESSION_HARD_CLEAR_EVENT } from '@/features/director-session/utils/sessionHardClearEvents';
import { detectAvailableSpectatorSession } from '@/features/director-session/utils/detectAvailableLiveSession';
import {
  fetchActiveDirectorSession,
  type ActiveDirectorSession,
} from '@/features/director-session/utils/detectActiveDirectorSession';
import { terminateDirectorSession } from '@/features/director-session/utils/terminateDirectorSession';
import {
  activateLiveSessionRow,
  deactivateLiveSessionRow,
} from '@/features/director-session/utils/liveSessionActive';
import {
  createDirectorLiveSessionRpc,
  type PersistDirectorLiveSessionInput,
} from '@/features/director-session/utils/persistDirectorLiveSession';
import { getSongPathById } from '@/utils/songSlug';
import { deactivateAllMyPreviousSessions } from '@/features/director-session/utils/ghostSessionCleanup';
import { resolveAuthenticatedDirector } from '@/features/director-session/utils/liveSessionAuth';
import { dispatchSpectatorSessionLeave } from '@/features/director-session/utils/spectatorSessionEvents';
import {
  clearSpectatorSessionOptOut,
  markSpectatorSessionOptOut,
} from '@/features/director-session/utils/spectatorSessionOptOut';
import { clearManualExitContinuous } from '@/features/director-session/utils/continuousExitGuard';
import { followPrefLog, readFollowDirector } from '@/features/director-session/utils/followDirector';
import { persistFollowDirectorPreference } from '@/features/director-session/utils/persistFollowDirectorPreference';
import { sessionEndedLog } from '@/features/director-session/utils/sessionEndedLog';
import {
  clearDismissedSessionBanner,
  isSessionBannerDismissedForCode,
  sessionBannerLog,
  writeDismissedSessionBanner,
} from '@/features/director-session/utils/sessionBannerDismiss';
import { sessionRestoreLog } from '@/features/director-session/utils/sessionRestoreLog';
import {
  clearLiveSessionPersistence,
  readLiveSessionPersistence,
  writeLiveSessionPersistence,
} from '@/features/director-session/utils/liveSessionPersistence';
import { persistContinuousListSync } from '@/features/continuous-setlist/utils/continuousListSyncCache';
import {
  inferSessionOriginFromRecovery,
  sessionOriginLabel,
  type PageSessionContext,
  type SessionOrigin,
} from '@/features/director-session/utils/sessionOrigin';
import { redirectDirectorSession } from '@/features/director-session/utils/redirectDirectorSession';
import {
  checkSessionExists,
  querySessionActive,
  sessionJoinBlockedMessage,
  type SessionActiveCheckReason,
} from '@/features/director-session/utils/checkSessionActive';

export type JoinWithCodeResult = true | 'conflict' | SessionActiveCheckReason | 'busy';
import { FOLLOWER_AWAITING_SAFETY_TIMEOUT_MS } from '@/features/director-session/utils/followerAwaitingConstants';
import { normalizeSessionCode } from '@/features/director-session/types';
import type { DirectorSessionConnection } from '@/features/director-session/types';
import {
  publishSharedSessionEnd,
  publishFullSessionState,
  publishSharedSessionState,
  sendRequestCurrentState,
  unregisterDirectorBroadcastChannel,
} from '@/features/director-session/realtime/sharedSessionSync';
import {
  buildSharedSessionFromBroadcast,
  normalizeOutgoingSharedSession,
} from '@/features/director-session/realtime/buildFullSessionState';
import { dispatchForceContinuousIndex } from '@/features/director-session/utils/liveSessionContinuousSyncEvents';
import {
  installDebugLiveSession,
  type DebugLiveSessionSnapshot,
} from '@/features/director-session/utils/debugLiveSession';
import { resolveSharedViewMode, type ViewMode } from '@/types/music';
import type { SharedSessionState } from '@/features/director-session/types';
import {
  setDirectorPublisherActive,
} from '@/features/director-session/live/liveSessionAuthority';
import {
  clearPendingJoin,
  readPendingJoin,
  writePendingJoin,
} from '@/features/director-session/utils/pendingJoinStorage';
import { isPageInSessionScope } from '@/features/director-session/utils/sessionOrigin';
import { LiveSessionChannelHost } from '@/features/director-session/live/LiveSessionChannelHost';
import { LiveSessionChannelContext } from '@/features/director-session/live/liveSessionChannelContext';
import { useLiveSessionBroadcast } from '@/features/director-session/live/useLiveSessionBroadcast';
import type {
  DirectorChannelJoinState,
  LiveSessionPageHandlers,
  LiveSessionBroadcastState,
} from '@/features/director-session/live/liveSessionTypes';
import { sessionProviderLog } from '@/features/director-session/utils/sessionProviderLog';
import { realtimeLog } from '@/features/director-session/utils/realtimeLog';
import { joinSessionLog } from '@/features/director-session/utils/joinSessionLog';
import {
  logNavAttempt,
  type NavAttemptSource,
} from '@/features/director-session/utils/logNavAttempt';
import {
  forceFollowerNavFromDbRecovery,
  resolveEmergencyFollowerPath,
} from '@/features/director-session/utils/forceFollowerDbNavigation';
import {
  buildJoinNavigationKey,
  describeJoinNavigationTarget,
  sharedStateToRecovery,
  shouldNavigateToContinuousLive,
} from '@/features/director-session/utils/followerJoinNavigation';
import {
  directorMoveSessionLog,
  enforceFollowerLiveRetention,
  followLiveLockLog,
  followOwnerLog,
  followViewEnforcedLog,
  followViewLog,
  isExploringOutsideSessionScope,
  isContinuousLiveSimpleMode,
  isFollowerInContinuousMode,
  isFollowerNavigationOwnedByLive,
  followerPathMatchesDirectorTarget,
  resolveFollowerPreferredView,
  resolveFollowerTargetFromDirectorState,
  shouldRetainFollowerViewMode,
} from '@/features/director-session/utils/followerViewMode';
import {
  shouldSkipSubscribedRecovery,
  realtimeSkipLog,
} from '@/features/director-session/utils/subscribedRecoveryGuard';
import { auditEventLog } from '@/features/director-session/utils/auditEventLog';
import { followTrace, traceFollow } from '@/features/director-session/utils/followTrace';
import { navigateFollowerSongViewOnly } from '@/features/director-session/utils/navigateFollowerSongViewOnly';
import { FEATURES } from '@/config/features';
import {
  getFollowV3State,
  isFollowV3SpectatorActive,
  shouldDisableLegacyFollowPipeline,
} from '@/features/director-session/follow-v3/isFollowV3Active';
import type { FollowV3RemoteState } from '@/features/director-session/follow-v3/types';
import { resetFollowV3State } from '@/features/director-session/follow-v3/followV3Store';
import { useFollowV3RouteMount } from '@/features/director-session/follow-v3/useFollowV3RouteMount';
import { useSpectatorFollowV3 } from '@/features/director-session/follow-v3/useSpectatorFollowV3';
import { shouldIgnoreFollowerUpdate } from '@/features/director-session/utils/shouldIgnoreFollowerUpdate';
import {
  evaluateRealtimeReconnectRequest,
  mapChannelStatusToEventType,
  realtimeEventLog,
  realtimeReconnectBlockedLog,
  realtimeReconnectRequestLog,
  realtimeStableLog,
  RECONNECT_TOAST_MIN_MS,
  RECONNECT_UI_DELAY_MS,
} from '@/features/director-session/utils/realtimeReconnectGuard';
import { persistDirectorLiveSessionFromShared } from '@/features/director-session/utils/persistDirectorLiveSession';
import { SessionRenderErrorBoundary } from '@/components/SessionRenderErrorBoundary';
import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';
import { logSessionStatusTransition } from '@/features/director-session/utils/sessionStatusLog';
import {
  isJoinBlockedByStatus,
  LIVE_SESSION_RECOVERY_BANNER_STATUS,
} from '@/features/director-session/utils/liveSessionStatus';
import { sessionGuardLog, sessionUiLog } from '@/features/director-session/utils/sessionUiLog';
import {
  followCleanupLog,
  followIgnoreRecoveryLog,
  followRecoveryBlockedLog,
  followJoinLog,
  followRecoveryFailed,
  followRecoveryLog,
  followRecoverySuccess,
  joinFastpathLog,
  followViewmodeLog,
  realtimeRecoveredLog,
  realtimeReconnectLog,
  sessionEndLog,
  sessionEndSuccessLog,
  type FollowerRecoverySource,
} from '@/features/director-session/utils/followerRecoveryLog';
import {
  isStaleHistoricalReplay,
  resolveFollowerRecovery,
  shouldSkipReconnectReplay,
} from '@/features/director-session/utils/resolveFollowerRecovery';
import { withJoinInFlight } from '@/features/director-session/utils/liveSessionHardening';
import { assertLiveSessionInvariants } from '@/features/director-session/utils/liveSessionAssertions';

console.log('[BOOT_IMPORT]', 'SpectatorSessionContext');

export type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

type SpectatorSessionContextValue = {
  sessionDetected: boolean;
  sessionConnected: boolean;
  detectedCode: string | null;
  detectedRecovery: SessionRecoveryState | null;
  detectedRole: StoredLiveSessionRole | null;
  bannerDismissed: boolean;
  activeJoinCode: string | null;
  showAvailableBanner: boolean;
  dismissBanner: () => void;
  reunirseASesion: () => void;
  continuarSesionDirector: () => void;
  cerrarSesionDirector: () => void;
  salirDeSesion: () => void;
  markExplicitJoin: (code: string) => void;
  markDirectorSessionConnected: (code: string) => void;
  refreshDetection: () => Promise<void>;
  hasActiveDirectorSession: () => Promise<boolean>;
  requestDirectorSessionStart: (onStart: () => void) => Promise<void>;
  directorConflictOpen: boolean;
  directorConflictCode: string | null;
  closeDirectorConflict: () => void;
  continuarSesionFromConflict: () => void;
  cerrarSesionFromConflict: () => void;
  joinConflictOpen: boolean;
  joinConflictCurrentCode: string | null;
  joinConflictTargetCode: string | null;
  closeJoinConflict: () => void;
  confirmLeaveSessionAndJoin: () => Promise<void>;
  redirectSessionHere: (target: PageSessionContext & { listName?: string }) => Promise<void>;
  sessionOriginLabel: string | null;
  /** Global Realtime connection (survives navigation). */
  connection: DirectorSessionConnection | null;
  liveIsDirector: boolean;
  liveSessionCode: string;
  liveIsFollower: boolean;
  liveFollowerCode: string;
  /** True when follower joined but director snapshot has no routable song/list yet. */
  followerAwaitingDirector: boolean;
  /** Verifies live_sessions row exists and is_active. */
  checkSessionExists: (code: string) => Promise<boolean>;
  /** Leave follower session, close channel, stop awaiting overlay. */
  cancelFollowerConnection: (opts?: {
    navigateTo?: 'home' | 'back';
    message?: string;
    silent?: boolean;
  }) => void;
  directorChannelJoin: DirectorChannelJoinState;
  connectedCount: number;
  beginDirectorSession: (params: {
    code: string;
    origin: SessionOrigin | null;
    isNew?: boolean;
    /** Full payload for RPC upsert when creating a new session. */
    persistInput?: PersistDirectorLiveSessionInput;
    /** Set when createDirectorLiveSessionRpc already ran (e.g. startSession). */
    rpcPersisted?: boolean;
  }) => void;
  endDirectorSession: (opts?: { silent?: boolean }) => Promise<void>;
  beginFollowerSession: (code: string, opts?: { enableAwaitingOverlay?: boolean }) => void;
  leaveFollowerSession: () => void;
  joinWithCode: (code: string) => Promise<JoinWithCodeResult>;
  setFollowDirectorPreference: (value: boolean) => void;
  registerPageHandlers: (handlers: LiveSessionPageHandlers) => () => void;
  updateBroadcastState: (state: LiveSessionBroadcastState) => void;
  scheduleBroadcast: ReturnType<typeof useLiveSessionBroadcast>['scheduleBroadcast'];
  publishSharedSessionIfDirector: (
    sessionId: string,
    state: SharedSessionState,
    opts?: { immediate?: boolean; navigationRedirect?: boolean }
  ) => void;
  /** Full shared-session snapshot (view_mode, index, list) — forces broadcast. */
  publishFullSessionStateIfDirector: (
    sessionCode: string,
    opts?: { force?: boolean; reason?: string }
  ) => void;
  /** Follower: ask director to republish shared-session (handshake). */
  requestFollowerCurrentState: () => void;
  /** Follower overlay: RPC debug + force exit attempt. */
  debugFollowerDb: () => Promise<void>;
  /** Follower overlay: leave session and hard-navigate to Home. */
  goHomeFromFollowerOverlay: () => void;
  reportPageContext: (page: PageSessionContext) => void;
  passiveListenMode: boolean;
  directorAwayFromScope: boolean;
  directorDisconnected: boolean;
  isReconnecting: boolean;
  /** True only after reconnect persists longer than RECONNECT_UI_DELAY_MS. */
  isReconnectingUiVisible: boolean;
  /** Director viewMode from latest shared-session (follower CTA). */
  directorSharedViewMode: ViewMode | null;
  directorSharedListId: string | null;
  /** FSM observability (FASE 3) — no reemplaza booleans legacy aún. */
  liveSessionStatus: LiveSessionStatus;
  volverASesion: () => Promise<void>;
  ignorarSesion: () => void;
  redirigirSesion: () => Promise<void>;
  sessionCodeDisplay: string | null;
};

const SpectatorSessionContext = createContext<SpectatorSessionContextValue | null>(null);

function sessionLog(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (detail !== undefined) {
    console.log(`[LiveSession] ${message}`, detail);
  } else {
    console.log(`[LiveSession] ${message}`);
  }
}

export function SpectatorSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [detected, setDetected] = useState<{
    code: string;
    recovery: SessionRecoveryState;
    role: StoredLiveSessionRole;
  } | null>(null);
  const [sessionConnected, setSessionConnected] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeJoinCode, setActiveJoinCode] = useState<string | null>(null);
  const [directorConflictOpen, setDirectorConflictOpen] = useState(false);
  const [directorConflict, setDirectorConflict] = useState<ActiveDirectorSession | null>(null);
  const [conflictOnStart, setConflictOnStart] = useState<(() => void) | null>(null);
  const [joinConflictOpen, setJoinConflictOpen] = useState(false);
  const [joinConflictCurrentCode, setJoinConflictCurrentCode] = useState<string | null>(null);
  const [joinConflictTargetCode, setJoinConflictTargetCode] = useState<string | null>(null);
  const pendingJoinCodeRef = useRef<string | null>(null);

  const [connection, setConnection] = useState<DirectorSessionConnection | null>(null);
  const [liveIsDirector, setLiveIsDirector] = useState(false);
  const [liveSessionCode, setLiveSessionCode] = useState('');
  const [liveIsFollower, setLiveIsFollower] = useState(false);
  const [liveFollowerCode, setLiveFollowerCode] = useState('');
  const [directorChannelJoin, setDirectorChannelJoin] =
    useState<DirectorChannelJoinState>('idle');
  const [connectedCount, setConnectedCount] = useState(0);

  const directorChannelRef = useRef<RealtimeChannel | null>(null);
  const followerChannelRef = useRef<RealtimeChannel | null>(null);
  const sessionOriginRef = useRef<SessionOrigin | null>(null);
  const lastRemoteStateRef = useRef<SharedSessionState | null>(null);
  const followV3HandlerRef = useRef<((state: FollowV3RemoteState) => void) | null>(null);
  const pageContextRef = useRef<PageSessionContext>({});
  const newSessionRef = useRef(false);
  const isHydratingRef = useRef(false);
  const pageHandlersRef = useRef<LiveSessionPageHandlers>({});
  const [passiveListenMode, setPassiveListenMode] = useState(false);
  const [followerRemoteNavTick, setFollowerRemoteNavTick] = useState(0);
  const [followerAwaitingDirector, setFollowerAwaitingDirector] = useState(false);
  const [directorAwayFromScope, setDirectorAwayFromScope] = useState(false);
  const [directorDisconnected, setDirectorDisconnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isReconnectingUiVisible, setIsReconnectingUiVisible] = useState(false);
  const reconnectUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectToastShownRef = useRef(false);
  const [liveSessionStatus, setLiveSessionStatus] = useState<LiveSessionStatus>('idle');
  const liveSessionStatusRef = useRef<LiveSessionStatus>('idle');
  const restoreToastShownRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const lastJoinNavigationKeyRef = useRef<string>('');
  const pendingFollowerNavRef = useRef<{ code: string; source: string } | null>(null);
  const followerNavInFlightRef = useRef(false);
  const joinInFlightRef = useRef(false);
  const reconnectSequenceIdRef = useRef(0);
  const reconnectCooldownRef = useRef(0);
  const browserWasOfflineRef = useRef(false);
  const lastRecoverySequenceKeyRef = useRef('');
  const reconnectToastOnceRef = useRef(false);
  const replayHandledForSequenceRef = useRef(-1);
  const pageRecoveryHandledKeyRef = useRef('');
  const pageRecoveryLastIndexRef = useRef<number | null>(null);
  const pageRecoveryLastSongIdRef = useRef<string | null>(null);
  const networkRestoredRef = useRef(false);
  const reconnectStartedAtRef = useRef<number | null>(null);
  const lastRemoteStateAtRef = useRef(0);
  const lastSubscribedKeyRef = useRef<string | null>(null);
  const lastDirectorViewSyncSignatureRef = useRef<string | null>(null);
  const lastForceContinuousIndexRef = useRef<string | null>(null);
  const awaitingFirstBroadcastRef = useRef(false);
  const hasReceivedBroadcastRef = useRef(false);
  const lastDbRowRef = useRef<Awaited<ReturnType<typeof getLiveSessionByCode>>>(null);
  /** Join precheck (`querySessionActive`) succeeded — session row should exist in DB. */
  const followerJoinPrecheckOkRef = useRef(false);
  const followerAwaitingDirectorRef = useRef(followerAwaitingDirector);
  const lastFollowerNavResolvedViewModeRef = useRef<ViewMode | null>(null);
  const syncForceContinuousIndexFromRemoteRef = useRef<
    ((remote: SharedSessionState, source: string) => void) | null
  >(null);

  useSpectatorFollowV3({
    enabled: FEATURES.USE_FOLLOW_V3 && liveIsFollower,
    sessionCode: liveFollowerCode || activeJoinCode || '',
    handlerRef: followV3HandlerRef,
    lastRemoteStateRef,
  });

  const resetFollowerHardeningState = useCallback(() => {
    reconnectSequenceIdRef.current = 0;
    replayHandledForSequenceRef.current = -1;
    pageRecoveryHandledKeyRef.current = '';
    pageRecoveryLastIndexRef.current = null;
    pageRecoveryLastSongIdRef.current = null;
    lastJoinNavigationKeyRef.current = '';
    lastFollowerNavResolvedViewModeRef.current = null;
    awaitingFirstBroadcastRef.current = false;
    hasReceivedBroadcastRef.current = false;
    followerJoinPrecheckOkRef.current = false;
    pendingFollowerNavRef.current = null;
    followerNavInFlightRef.current = false;
    if (reconnectUiTimerRef.current) {
      clearTimeout(reconnectUiTimerRef.current);
      reconnectUiTimerRef.current = null;
    }
    reconnectToastShownRef.current = false;
    reconnectToastOnceRef.current = false;
    setIsReconnectingUiVisible(false);
    reconnectCooldownRef.current = 0;
    lastRecoverySequenceKeyRef.current = '';
  }, []);

  const clearReconnectUiTimers = useCallback(() => {
    if (reconnectUiTimerRef.current) {
      clearTimeout(reconnectUiTimerRef.current);
      reconnectUiTimerRef.current = null;
    }
    reconnectToastShownRef.current = false;
  }, []);

  const scheduleReconnectFeedback = useCallback(() => {
    if (reconnectUiTimerRef.current) return;
    reconnectUiTimerRef.current = setTimeout(() => {
      reconnectUiTimerRef.current = null;
      setIsReconnectingUiVisible(true);
      if (!reconnectToastShownRef.current) {
        reconnectToastShownRef.current = true;
        toast.info('Reconectando sesión...');
      }
    }, RECONNECT_UI_DELAY_MS);
  }, []);

  const { broadcastStateRef, scheduleBroadcast, updateBroadcastState, broadcastTimeoutRef } =
    useLiveSessionBroadcast(directorChannelRef);

  const passiveListenModeRef = useRef(passiveListenMode);
  const connectionRef = useRef(connection);
  useEffect(() => {
    passiveListenModeRef.current = passiveListenMode;
  }, [passiveListenMode]);
  useEffect(() => {
    followerAwaitingDirectorRef.current = followerAwaitingDirector;
  }, [followerAwaitingDirector]);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  const transitionSessionStatus = useCallback((to: LiveSessionStatus, reason: string) => {
    const from = liveSessionStatusRef.current;
    if (from === to) return;
    liveSessionStatusRef.current = to;
    setLiveSessionStatus(to);
    logSessionStatusTransition(from, to, reason);
    assertLiveSessionInvariants({
      liveSessionStatus: to,
      liveIsFollower,
      sessionConnected,
      hasDetected: !!detected,
      activeJoinCode,
      liveFollowerCode,
    });
  }, [liveIsFollower, sessionConnected, detected, activeJoinCode, liveFollowerCode]);

  const requestRealtimeReconnect = useCallback(
    (reason: string, sessionCode?: string | null) => {
      const seq = reconnectSequenceIdRef.current;
      const evaluation = evaluateRealtimeReconnectRequest(
        reason,
        reconnectCooldownRef.current > 0 ? reconnectCooldownRef.current : null
      );
      realtimeReconnectRequestLog({
        reason,
        allowed: evaluation.allowed,
        sessionCode: sessionCode ?? null,
        sequenceId: seq,
        blockedReason: evaluation.blockedReason ?? null,
      });
      if (!evaluation.allowed) {
        if (evaluation.blockedReason) {
          realtimeReconnectBlockedLog({
            reason: evaluation.blockedReason,
            trigger: reason,
            sessionCode: sessionCode ?? null,
            sequenceId: seq,
          });
        }
        return false;
      }
      reconnectCooldownRef.current = Date.now();
      reconnectSequenceIdRef.current += 1;
      replayHandledForSequenceRef.current = -1;
      lastRecoverySequenceKeyRef.current = '';
      realtimeReconnectLog({
        sequenceId: reconnectSequenceIdRef.current,
        role: liveIsFollower ? 'follower' : 'director',
        reason,
      });
      auditEventLog({
        source: 'SpectatorSessionContext',
        action: 'reconnect-request',
        sessionCode: sessionCode ?? liveFollowerCode ?? liveSessionCode ?? null,
        reconnectState: true,
        liveSessionStatus: liveSessionStatusRef.current,
        extra: { reason, sequenceId: reconnectSequenceIdRef.current },
      });
      if (reconnectStartedAtRef.current == null) {
        reconnectStartedAtRef.current = Date.now();
      }
      setIsReconnecting(true);
      transitionSessionStatus('reconnecting', reason);
      scheduleReconnectFeedback();
      return true;
    },
    [liveIsFollower, transitionSessionStatus, scheduleReconnectFeedback]
  );

  const bumpReconnectSequence = useCallback(
    (reason: string) => {
      requestRealtimeReconnect(reason);
    },
    [requestRealtimeReconnect]
  );

  const onRealtimeSubscribed = useCallback(
    (role: 'director' | 'follower', code: string) => {
      transitionSessionStatus('subscribed', `realtime SUBSCRIBED (${role}) code=${code}`);
      if (role === 'director') {
        transitionSessionStatus('active', 'director session usable');
      }
    },
    [transitionSessionStatus]
  );

  const markRealtimeSubscriptionStable = useCallback(
    (role: 'director' | 'follower', code: string) => {
      realtimeStableLog({
        message: 'subscription healthy',
        role,
        sessionCode: code,
        sequenceId: reconnectSequenceIdRef.current,
      });
      auditEventLog({
        source: 'SpectatorSessionContext',
        action: 'SUBSCRIBED-stable',
        sessionCode: code,
        reconnectState: false,
        liveSessionStatus: liveSessionStatusRef.current,
        extra: { role, sequenceId: reconnectSequenceIdRef.current },
      });
      clearReconnectUiTimers();
      setIsReconnectingUiVisible(false);
      const reconnectStarted = reconnectStartedAtRef.current;
      setIsReconnecting(false);
      if (
        reconnectStarted != null &&
        Date.now() - reconnectStarted >= RECONNECT_TOAST_MIN_MS
      ) {
        toast.success('Reconectado');
      }
      reconnectStartedAtRef.current = null;
      if (role === 'director') {
        transitionSessionStatus('active', 'subscription healthy');
        return;
      }
      transitionSessionStatus(
        passiveListenModeRef.current ? 'passive' : 'active',
        'subscription healthy'
      );
    },
    [transitionSessionStatus, clearReconnectUiTimers]
  );

  const handleRealtimeChannelStatus = useCallback(
    (role: 'director' | 'follower', code: string, status: string, errMessage?: string) => {
      const eventType = mapChannelStatusToEventType(status);
      const rawReason = errMessage?.trim() ? `${status}: ${errMessage}` : status;
      realtimeEventLog({
        type: eventType,
        reason: rawReason,
        sessionCode: code,
        sequenceId: reconnectSequenceIdRef.current,
        role,
      });

      if (status === 'SUBSCRIBED') {
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        requestRealtimeReconnect(String(status), code);
      }
    },
    [requestRealtimeReconnect]
  );

  const setReconnectingWithStatus = useCallback(
    (value: boolean, reason = 'unspecified') => {
      if (value) {
        requestRealtimeReconnect(reason);
        return;
      }
      clearReconnectUiTimers();
      setIsReconnectingUiVisible(false);
      setIsReconnecting(false);
      const normalized = reason.toLowerCase();
      if (
        normalized.includes('subscribed') ||
        normalized.includes('subscription healthy') ||
        normalized.includes('online')
      ) {
        if (connectionRef.current || liveIsDirector || liveIsFollower) {
          transitionSessionStatus(
            passiveListenModeRef.current ? 'passive' : 'active',
            reason
          );
        }
        return;
      }
      if (liveSessionStatusRef.current !== 'reconnecting') return;
      if (connectionRef.current) {
        transitionSessionStatus(
          passiveListenModeRef.current ? 'passive' : 'active',
          'reconnect cleared with connection'
        );
      } else if (liveIsFollower || liveIsDirector) {
        transitionSessionStatus('joining', 'reconnect cleared without connection');
      }
    },
    [
      transitionSessionStatus,
      liveIsFollower,
      liveIsDirector,
      requestRealtimeReconnect,
      clearReconnectUiTimers,
    ]
  );

  const syncPersistenceRef = useRef<
    (patch: Partial<import('@/features/director-session/utils/liveSessionPersistence').LiveSessionPersistenceState>) => void
  >(() => {});

  const syncPersistence = useCallback(
    (patch: Partial<import('@/features/director-session/utils/liveSessionPersistence').LiveSessionPersistenceState>) => {
      const code = normalizeSessionCode(
        patch.sessionCode ??
          (liveSessionCode ||
            liveFollowerCode ||
            activeJoinCode ||
            readLiveSessionPersistence()?.sessionCode ||
            '')
      );
      if (code.length < 4) return;

      const role: StoredLiveSessionRole =
        patch.role ?? (liveIsDirector ? 'director' : liveIsFollower ? 'follower' : readLiveSessionPersistence()?.role ?? 'follower');

      writeLiveSessionPersistence({
        role,
        sessionCode: code,
        connected: patch.connected ?? sessionConnected ?? !!connection,
        followDirector: patch.followDirector ?? readFollowDirector(),
        passiveMode: patch.passiveMode ?? passiveListenMode,
        lastRoute: patch.lastRoute ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        lastSongId: patch.lastSongId ?? pageContextRef.current.songId,
        lastSetlistId: patch.lastSetlistId ?? pageContextRef.current.listId,
        directorAwayFromScope: patch.directorAwayFromScope ?? directorAwayFromScope,
        joinedAt: patch.joinedAt ?? readLiveSessionPersistence()?.joinedAt ?? Date.now(),
        lastHeartbeatAt: patch.lastHeartbeatAt,
        lastViewMode: patch.lastViewMode,
      });
    },
    [
      liveSessionCode,
      liveFollowerCode,
      activeJoinCode,
      liveIsDirector,
      liveIsFollower,
      sessionConnected,
      connection,
      passiveListenMode,
      directorAwayFromScope,
    ]
  );

  syncPersistenceRef.current = syncPersistence;

  const onDirectorHeartbeat = useCallback(() => {
    setDirectorDisconnected(false);
    syncPersistenceRef.current({ lastHeartbeatAt: Date.now() });
    sessionLog('heartbeat received');
  }, []);

  /** Opens follower Realtime channel. Call only after `checkSessionExists` / `querySessionActive`. */
  const beginFollowerSession = useCallback(
    (code: string, opts?: { enableAwaitingOverlay?: boolean }) => {
    const normalized = normalizeSessionCode(code);
    if (normalized.length < 4) return;
    transitionSessionStatus('joining', 'beginFollowerSession');
    setDirectorPublisherActive(false);
    setLiveFollowerCode(normalized);
    setLiveIsFollower(true);
    setLiveIsDirector(false);
    setLiveSessionCode('');
    writeStoredLiveSession(normalized, 'follower', sessionOriginRef.current ?? undefined);
    const followPref = readFollowDirector();
    syncPersistence({
      role: 'follower',
      sessionCode: normalized,
      connected: true,
      passiveMode: !followPref,
      followDirector: followPref,
    });
    clearPendingJoin();
    hasReceivedBroadcastRef.current = false;
    if (readFollowDirector() && opts?.enableAwaitingOverlay !== false) {
      setFollowerAwaitingDirector(true);
      awaitingFirstBroadcastRef.current = true;
    } else {
      setFollowerAwaitingDirector(false);
      awaitingFirstBroadcastRef.current = false;
    }
    realtimeLog('join session', { role: 'follower', code: normalized });
    sessionLog('channel joined', { role: 'follower', code: normalized });
  },
  [syncPersistence, transitionSessionStatus]
  );

  const beginDirectorSession = useCallback(
    (params: {
      code: string;
      origin: SessionOrigin | null;
      isNew?: boolean;
      persistInput?: PersistDirectorLiveSessionInput;
      rpcPersisted?: boolean;
    }) => {
      const normalized = normalizeSessionCode(params.code);
      transitionSessionStatus('joining', 'beginDirectorSession');
      sessionOriginRef.current = params.origin;
      newSessionRef.current = Boolean(params.isNew);
      setLiveIsFollower(false);
      setLiveFollowerCode('');
      setLiveSessionCode(normalized);
      setLiveIsDirector(true);
      setSessionConnected(true);
      setActiveJoinCode(normalized);
      setDirectorPublisherActive(true);
      setPassiveListenMode(false);
      if (params.origin) writeStoredLiveSession(normalized, 'director', params.origin);
      syncPersistence({
        role: 'director',
        sessionCode: normalized,
        connected: true,
        passiveMode: false,
        directorAwayFromScope: false,
      });
      realtimeLog('create session', { role: 'director', code: normalized, isNew: params.isNew });
      sessionLog('session restored', { role: 'director', code: normalized, isNew: params.isNew });

      if (params.isNew && params.persistInput && !params.rpcPersisted) {
        void createDirectorLiveSessionRpc({
          ...params.persistInput,
          sessionCode: normalized,
        }).then((result) => {
          if (!result.ok) {
            console.error('[LIVE_SESSION] beginDirectorSession RPC failed', result);
          }
        });
      } else if (!params.isNew) {
        void activateLiveSessionRow(normalized);
      }
    },
    [syncPersistence, transitionSessionStatus]
  );

  const failDirectorStart = useCallback((message: string, reason?: string) => {
    sessionProviderLog('session start failed', { message, reason });
    transitionSessionStatus('idle', `failDirectorStart: ${reason ?? message}`);
    newSessionRef.current = false;
    setLiveIsDirector(false);
    setLiveSessionCode('');
    setDirectorChannelJoin('error');
    if (directorChannelRef.current) {
      void supabase.removeChannel(directorChannelRef.current);
      directorChannelRef.current = null;
    }
    setDirectorPublisherActive(false);
    setConnection(null);
    toast.error(message);
    pageHandlersRef.current.onDirectorSessionStartFailed?.();
  }, [transitionSessionStatus]);

  const endDirectorSession = useCallback(async (opts?: { silent?: boolean }) => {
    const code = liveSessionCode;
    transitionSessionStatus('ended', 'endDirectorSession');
    sessionProviderLog('director context update', { action: 'end', code });
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
      broadcastTimeoutRef.current = null;
    }
    if (directorChannelRef.current) {
      if (code) unregisterDirectorBroadcastChannel(code);
      void supabase.removeChannel(directorChannelRef.current);
      directorChannelRef.current = null;
    }
    setDirectorPublisherActive(false);
    setLiveIsDirector(false);
    setLiveSessionCode('');
    setConnectedCount(0);
    newSessionRef.current = false;
    setDirectorChannelJoin('idle');
    setConnection(null);
    setSessionConnected(false);
    setActiveJoinCode(null);
    setDirectorAwayFromScope(false);

    if (code) {
      publishSharedSessionEnd(code);
      await deactivateLiveSessionRow(code);
      clearAllLiveSessionLocalState(code);
    } else {
      clearAllLiveSessionLocalState();
    }
    if (!opts?.silent) toast.info('Transmisión finalizada');
    transitionSessionStatus('idle', 'endDirectorSession cleanup');
  }, [liveSessionCode, broadcastTimeoutRef, transitionSessionStatus]);

  const leaveFollowerSession = useCallback(() => {
    const code = liveFollowerCode;
    transitionSessionStatus('idle', 'leaveFollowerSession');
    if (followerChannelRef.current) {
      void supabase.removeChannel(followerChannelRef.current);
      followerChannelRef.current = null;
    }
    setDirectorPublisherActive(false);
    setLiveIsFollower(false);
    setLiveFollowerCode('');
    setConnection(null);
    setSessionConnected(false);
    setActiveJoinCode(null);
    setPassiveListenMode(false);
    setIsReconnecting(false);
    setDirectorDisconnected(false);
    clearPendingJoin();
    resetFollowerHardeningState();
    resetFollowV3State();
    setFollowerAwaitingDirector(false);
    awaitingFirstBroadcastRef.current = false;
    lastFollowerNavResolvedViewModeRef.current = null;
    clearAllLiveSessionLocalState(code);
  }, [liveFollowerCode, transitionSessionStatus, resetFollowerHardeningState]);

  const setFollowDirectorPreference = useCallback(
    (value: boolean) => {
      setPassiveListenMode(!value);
      const code = normalizeSessionCode(
        liveFollowerCode || liveSessionCode || activeJoinCode || ''
      );
      if (code.length >= 4) {
        void persistFollowDirectorPreference({
          sessionCode: code,
          followDirector: value,
          role: liveIsDirector ? 'director' : 'follower',
          connected: sessionConnected ?? !!connection,
          asDirector: liveIsDirector,
        });
      }
      syncPersistence({
        followDirector: value,
        passiveMode: !value,
      });
      followPrefLog('setFollowDirectorPreference', { followDirector: value, code });
      if (!value) {
        setFollowerAwaitingDirector(false);
      }
    },
    [
      syncPersistence,
      liveFollowerCode,
      liveSessionCode,
      activeJoinCode,
      liveIsDirector,
      sessionConnected,
      connection,
    ]
  );

  const cancelFollowerConnection = useCallback(
    (opts?: { navigateTo?: 'home' | 'back'; message?: string; silent?: boolean }) => {
      const code = liveFollowerCode;
      joinDebugLog('JOIN_NAV', 'cancelFollowerConnection', {
        code,
        navigateTo: opts?.navigateTo ?? 'home',
      });

      setFollowerAwaitingDirector(false);
      markSpectatorSessionOptOut();
      dispatchSpectatorSessionLeave();

      if (followerChannelRef.current) {
        void supabase.removeChannel(followerChannelRef.current);
        followerChannelRef.current = null;
      }

      leaveFollowerSession();

      setLiveIsFollower(false);
      setLiveFollowerCode('');
      setConnection(null);
      setSessionConnected(false);
      setActiveJoinCode(null);
      setDetected(null);
      setBannerDismissed(false);
      clearDismissedSessionBanner();
      transitionSessionStatus('idle', 'cancelFollowerConnection');

      if (!opts?.silent) {
        toast.info(opts?.message ?? 'Conexión cancelada');
      }

      if (opts?.navigateTo === 'back' && typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    },
    [liveFollowerCode, leaveFollowerSession, navigate, transitionSessionStatus]
  );

  const abortFollowerJoinIfSessionInactive = useCallback(
    async (code: string, source: string): Promise<boolean> => {
      const result = await querySessionActive(code);
      if (result.active) return true;

      joinDebugLog('JOIN_ABORT', 'session not active', {
        code: result.code,
        reason: result.reason,
        source,
      });

      setFollowerAwaitingDirector(false);

      if (result.reason === 'inactive' && (liveIsFollower || liveFollowerCode)) {
        completeFollowerSessionEndedByDirectorRef.current?.();
        return false;
      }

      toast.error(sessionJoinBlockedMessage(result.reason));

      if (liveIsFollower || liveFollowerCode) {
        cancelFollowerConnection({
          navigateTo: 'home',
          silent: true,
          message: sessionJoinBlockedMessage(result.reason),
        });
      }
      return false;
    },
    [liveIsFollower, liveFollowerCode, cancelFollowerConnection]
  );

  const completeFollowerSessionEndedByDirectorRef = useRef<(() => void) | null>(null);

  /** Director ended session — followers only: cleanup + home. Director pages are not redirected. */
  const completeFollowerSessionEndedByDirector = useCallback(() => {
    const code = liveFollowerCode;
    sessionEndLog({ reason: 'director terminated', code });
    sessionEndedLog('redirect follower home');
    transitionSessionStatus('ended', 'completeFollowerSessionEndedByDirector');
    toast.info('El director finalizó la sesión');
    setDetected(null);
    setBannerDismissed(false);
    clearDismissedSessionBanner();
    setDirectorDisconnected(false);
    setIsReconnecting(false);
    clearPendingJoin();
    resetFollowerHardeningState();
    dispatchSpectatorSessionLeave();
    followCleanupLog({ code, landingReset: 'page', pendingJoin: 'cleared' });
    leaveFollowerSession();
    navigate('/');
    sessionEndSuccessLog({ code });
  }, [leaveFollowerSession, navigate, transitionSessionStatus, liveFollowerCode, resetFollowerHardeningState]);

  completeFollowerSessionEndedByDirectorRef.current = completeFollowerSessionEndedByDirector;

  const onFollowerChannelLost = useCallback(
    (code: string, status: string) => {
      const normalized = normalizeSessionCode(code);
      sessionProviderLog('follower channel lost', { code: normalized, status });
      void (async () => {
        const result = await querySessionActive(normalized);
        if (!result.active) {
          joinDebugLog('JOIN_ABORT', 'channel lost — session inactive', {
            status,
            reason: result.reason,
          });
          if (result.reason === 'inactive') {
            completeFollowerSessionEndedByDirector();
          } else {
            toast.error(sessionJoinBlockedMessage(result.reason));
            cancelFollowerConnection({ navigateTo: 'home', silent: true });
          }
          return;
        }
        if (liveIsFollower && liveFollowerCode === normalized) {
          toast.error('Se perdió la conexión con la sesión en vivo');
          cancelFollowerConnection({ navigateTo: 'home' });
        }
      })();
    },
    [
      liveIsFollower,
      liveFollowerCode,
      completeFollowerSessionEndedByDirector,
      cancelFollowerConnection,
    ]
  );

  const registerPageHandlers = useCallback(
    (handlers: LiveSessionPageHandlers) => {
      const wrappedHandlers: LiveSessionPageHandlers = { ...handlers };

      if (handlers.onSessionUpdate) {
        const original = handlers.onSessionUpdate;
        wrappedHandlers.onSessionUpdate = (state) => {
          if (shouldDisableLegacyFollowPipeline('follower')) return;
          original(state);
        };
      }

      pageHandlersRef.current = { ...pageHandlersRef.current, ...wrappedHandlers };

      const code = normalizeSessionCode(liveFollowerCode || activeJoinCode || '');
      const remote = lastRemoteStateRef.current;
      if (
        liveIsFollower &&
        code.length >= 4 &&
        handlers.onSessionRecovered &&
        !shouldDisableLegacyFollowPipeline('follower')
      ) {
        void (async () => {
          const pathnameEarly = getJoinPathname();
          const followDirector = readFollowDirector();
          traceFollow('FOLLOW_RECOVERY_GATE', {
            pathname: pathnameEarly,
            followDirector,
            shouldBypass:
              pathnameEarly?.includes('/live') && followDirector,
          });
          if (isContinuousLiveSimpleMode(pathnameEarly)) {
            traceFollow('FOLLOW_RECOVERY_BYPASSED_ACTIVE', {
              pathname: pathnameEarly,
              followDirector,
            });
            followTrace('FOLLOW_RECOVERY_BYPASSED', {
              actor: 'spectator',
              sessionCode: code,
              currentRoute: pathnameEarly,
              reason: 'continuous-live-simple-mode',
              extra: {
                reason: 'continuous-live-simple-mode',
                pathname: pathnameEarly,
                sessionCode: code,
                route: pathnameEarly,
              },
            });
            const remoteHandler = pageHandlersRef.current.onSharedSessionUpdate;
            if (followDirector && remoteHandler && lastRemoteStateRef.current) {
              traceFollow('FOLLOW_RECOVERY_REPLAY_REMOTE', {
                remoteIndex: lastRemoteStateRef.current.currentIndex,
                remoteSongId: lastRemoteStateRef.current.currentSongId,
              });
              remoteHandler(lastRemoteStateRef.current);
            }
            return;
          }

          const dbRecovery = await resolveLiveSessionForReconnectWithRetry(code);
          let { recovery, source } = resolveFollowerRecovery({
            code,
            remote,
            dbRecovery,
            sessionOrigin: sessionOriginRef.current,
          });

          if (!recovery) {
            followRecoveryFailed({ code, reason: 'no recovery on page register' });
            return;
          }

          if (remote && isStaleHistoricalReplay(recovery, remote)) {
            followIgnoreRecoveryLog({
              reason: 'stale historical replay',
              candidateIndex: recovery.currentIndex ?? null,
              remoteIndex: remote.currentIndex ?? null,
              source,
            });
            const upgraded = resolveFollowerRecovery({
              code,
              remote,
              dbRecovery: null,
              sessionOrigin: sessionOriginRef.current,
            });
            if (upgraded.recovery) {
              recovery = upgraded.recovery;
              source = upgraded.source;
            }
          }

          recovery = enrichRecoveryForNavigation(recovery);
          const navKey = buildJoinNavigationKey(code, recovery);
          const pathname = getJoinPathname();
          const recoveryIndex = recovery.currentIndex ?? null;
          const recoverySongId = recovery.songId ?? null;
          const listIdForLive = recovery.listId ?? pageContextRef.current.listId ?? null;
          const isLiveMounted =
            !!listIdForLive && isFollowerInContinuousMode(pathname, listIdForLive);
          const isFollowerLiveOwner =
            readFollowDirector() &&
            isLiveMounted &&
            !!pageHandlersRef.current.onSharedSessionUpdate;

          followRecoveryLog({
            source,
            code,
            currentIndex: recoveryIndex,
            songId: recoverySongId,
          });

          const dedupeBase = {
            currentIndex: recoveryIndex,
            songId: recoverySongId,
            navKey: navKey ?? '',
            previousIndex: pageRecoveryLastIndexRef.current,
            previousSongId: pageRecoveryLastSongIdRef.current,
            isLiveMounted,
            isFollowerLiveOwner,
            followDirector: readFollowDirector(),
            recoverySequenceKey: `${code}|${reconnectSequenceIdRef.current}`,
            pathname,
          };

          if (navKey) {
            const joinDedupe = shouldIgnoreFollowerUpdate({
              ...dedupeBase,
              source: 'join-nav',
              previousNavKey: lastJoinNavigationKeyRef.current,
            });
            if (joinDedupe.ignore) {
              followIgnoreRecoveryLog({
                reason: 'page recovery skipped — nav already applied',
                navKey,
                source,
                dedupeReason: joinDedupe.reason,
              });
              return;
            }
          }

          if (navKey) {
            const pageDedupe = shouldIgnoreFollowerUpdate({
              ...dedupeBase,
              source: 'page-recovery',
              previousNavKey: pageRecoveryHandledKeyRef.current,
            });
            if (pageDedupe.ignore) {
              followIgnoreRecoveryLog({
                reason: 'page recovery already dispatched',
                navKey,
                dedupeReason: pageDedupe.reason,
                currentIndex: recoveryIndex,
                songId: recoverySongId,
              });
              return;
            }
          }

          pageRecoveryHandledKeyRef.current = navKey;
          pageRecoveryLastIndexRef.current = recoveryIndex;
          pageRecoveryLastSongIdRef.current = recoverySongId;
          handlers.onSessionRecovered?.(recovery, { role: 'follower', code });
          followRecoverySuccess({
            source,
            code,
            currentIndex: recovery.currentIndex ?? null,
            songId: recovery.songId ?? null,
          });
        })();
      }

      return () => {
        for (const key of Object.keys(handlers) as (keyof LiveSessionPageHandlers)[]) {
          if (pageHandlersRef.current[key] === handlers[key]) {
            delete pageHandlersRef.current[key];
          }
        }
      };
    },
    [liveIsFollower, liveFollowerCode, activeJoinCode]
  );

  const publishSharedSessionIfDirector = useCallback(
    (
      sessionId: string,
      state: SharedSessionState,
      opts?: { immediate?: boolean; navigationRedirect?: boolean }
    ) => {
      if (!liveIsDirector) {
        sessionLog('publish blocked (not director)');
        return;
      }
      if (directorAwayFromScope && !opts?.navigationRedirect) {
        sessionLog('context updated', {
          blocked: true,
          reason: 'director away from scope',
          songId: state.currentSongId,
        });
        return;
      }
      const normalized = normalizeOutgoingSharedSession(sessionId, state);
      broadcastStateRef.current = {
        ...broadcastStateRef.current,
        songId: normalized.currentSongId ?? broadcastStateRef.current.songId,
        semitones: normalized.customSemitones,
        currentIndex: normalized.currentIndex,
        listId: normalized.listId ?? undefined,
        listSongIds: normalized.listSongIds,
        viewMode: normalized.viewMode,
        genderShift:
          normalized.genderShift === 'male'
            ? 'male'
            : normalized.genderShift === 'female'
              ? 'female'
              : '',
        sharedSectionAnchor: normalized.sharedSectionAnchor,
      };
      sessionLog(opts?.navigationRedirect ? 'manual redirect' : 'context updated', {
        viewMode: normalized.viewMode,
        currentIndex: normalized.currentIndex,
        listId: normalized.listId,
        songId: normalized.currentSongId,
      });
      publishSharedSessionState(sessionId, normalized, opts);
      void persistDirectorLiveSessionFromShared(normalized, sessionOriginRef.current);
    },
    [liveIsDirector, directorAwayFromScope]
  );

  const reportPageContext = useCallback(
    (page: PageSessionContext) => {
      pageContextRef.current = page;
      const remote = lastRemoteStateRef.current;
      const origin =
        sessionOriginRef.current ??
        (remote?.listId
          ? {
              type: 'setlist' as const,
              listId: remote.listId,
              songId: remote.currentSongId ?? undefined,
            }
          : remote?.currentSongId
            ? { type: 'song' as const, songId: remote.currentSongId }
            : null);

      if (!origin) {
        setPassiveListenMode((prev) => (prev ? false : prev));
        setDirectorAwayFromScope((prev) => (prev ? false : prev));
        return;
      }

      const inScope = isPageInSessionScope(origin, page);
      if (liveIsFollower && connection?.role === 'follower') {
        const passive = !inScope;
        setPassiveListenMode((prev) => {
          if (prev === passive) return prev;
          if (passive) sessionLog('passive mode enabled', { page, origin });
          else sessionLog('navigation preserved', { role: 'follower', inScope: true });
          return passive;
        });
        if (!isHydratingRef.current) {
          syncPersistence({
            passiveMode: !inScope,
            lastSongId: page.songId,
            lastSetlistId: page.listId,
            lastRoute: typeof window !== 'undefined' ? window.location.pathname : undefined,
          });
        }
      }
      if (liveIsDirector) {
        setDirectorAwayFromScope((prev) => {
          const away = !inScope;
          if (prev === away) return prev;
          if (!away) sessionLog('navigation preserved', { role: 'director' });
          else sessionLog('context updated', { directorAwayFromScope: true });
          return away;
        });
        if (!isHydratingRef.current) {
          syncPersistence({
            directorAwayFromScope: !inScope,
            lastSongId: page.songId,
            lastSetlistId: page.listId,
            lastRoute: typeof window !== 'undefined' ? window.location.pathname : undefined,
          });
        }
      }
    },
    [liveIsFollower, liveIsDirector, connection, syncPersistence]
  );

  useEffect(() => {
    if (isHydratingRef.current) return;
    if (!liveSessionCode && !liveFollowerCode) return;
    syncPersistence({
      connected: !!connection,
      followDirector: readFollowDirector(),
      passiveMode: passiveListenMode,
      directorAwayFromScope,
    });
  }, [
    connection,
    liveSessionCode,
    liveFollowerCode,
    passiveListenMode,
    directorAwayFromScope,
    syncPersistence,
  ]);

  useEffect(() => {
    const onOnline = () => {
      if (!liveSessionCode && !liveFollowerCode) return;
      networkRestoredRef.current = true;
      realtimeEventLog({
        type: 'ONLINE',
        reason: 'browser online',
        sessionCode: liveSessionCode || liveFollowerCode,
        sequenceId: reconnectSequenceIdRef.current,
      });
      browserWasOfflineRef.current = false;
    };
    const onOffline = () => {
      if (!liveSessionCode && !liveFollowerCode) return;
      browserWasOfflineRef.current = true;
      realtimeEventLog({
        type: 'OFFLINE',
        reason: 'browser offline',
        sessionCode: liveSessionCode || liveFollowerCode,
        sequenceId: reconnectSequenceIdRef.current,
      });
      sessionLog('director disconnected', { reason: 'browser offline' });
      requestRealtimeReconnect('OFFLINE', liveSessionCode || liveFollowerCode);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [liveSessionCode, liveFollowerCode, setReconnectingWithStatus, requestRealtimeReconnect]);

  const refreshDetection = useCallback(async () => {
    const statusNow = liveSessionStatusRef.current;
    if (isJoinBlockedByStatus(statusNow)) {
      sessionUiLog({
        status: statusNow,
        bannerVisible: false,
        reason: 'refreshDetection skipped — live session in progress',
      });
      return;
    }

    if (liveIsFollower && liveFollowerCode) {
      sessionProviderLog('reconnect available', {
        role: 'follower',
        code: liveFollowerCode,
        passive: passiveListenMode,
      });
    }

    if (sessionConnected && liveIsFollower) {
      const director = await fetchActiveDirectorSession();
      if (!director) {
        setDetected(null);
      }
      return;
    }

    const director = await fetchActiveDirectorSession();
    if (director) {
      setDetected({
        code: director.code,
        recovery: director.recovery,
        role: 'director',
      });
      transitionSessionStatus('detected', 'refreshDetection director');
      sessionLog('director session detected', { code: director.code });
      return;
    }

    const follower = await detectAvailableSpectatorSession();
    if (follower) {
      setDetected({
        code: follower.code,
        recovery: follower.recovery,
        role: 'follower',
      });
      transitionSessionStatus('detected', 'refreshDetection follower');
      sessionLog('follower session detected', { code: follower.code });
    } else {
      setDetected(null);
      if (!sessionConnected && !liveIsFollower && !liveIsDirector) {
        transitionSessionStatus('idle', 'refreshDetection no session');
      }
    }
  }, [
    sessionConnected,
    liveIsFollower,
    liveIsDirector,
    transitionSessionStatus,
  ]);

  useEffect(() => {
    void (async () => {
      const auth = await resolveAuthenticatedDirector();
      if (!auth.ok) return;

      const persisted = readLiveSessionPersistence();
      const localDirectorActive =
        persisted?.role === 'director' &&
        persisted.connected &&
        Boolean(persisted.sessionCode);

      if (localDirectorActive) {
        console.log('[GHOST_SESSIONS] skip startup cleanup — local director persistence', {
          code: persisted?.sessionCode,
        });
        return;
      }

      await deactivateAllMyPreviousSessions();
    })();
  }, []);

  useEffect(() => {
    const onHardClear = () => {
      transitionSessionStatus('idle', 'SESSION_HARD_CLEAR');
      setDetected(null);
      setSessionConnected(false);
      setActiveJoinCode(null);
      setBannerDismissed(false);
      setDirectorConflictOpen(false);
      setDirectorConflict(null);
      setConflictOnStart(null);
      setLiveIsDirector(false);
      setLiveSessionCode('');
      setLiveIsFollower(false);
      setLiveFollowerCode('');
      setConnection(null);
      newSessionRef.current = false;
      void refreshDetection();
    };
    window.addEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
    return () => window.removeEventListener(SESSION_HARD_CLEAR_EVENT, onHardClear);
  }, [refreshDetection, transitionSessionStatus]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionLog('banner dismissed');
  }, []);

  type RecoveryNavigateSource = 'manual' | 'auto';

  const clearFollowerAwaitingFromBroadcast = useCallback(
    (state: SharedSessionState) => {
      if (!liveIsFollower || !readFollowDirector()) return;
      const hasViewMode = Boolean(state.viewMode);
      const hasListId = Boolean(state.listId);
      const hasSongId = Boolean(state.currentSongId);
      const hasListSongs = (state.listSongIds?.length ?? 0) > 0;
      if (hasViewMode || hasListId || hasSongId || hasListSongs) {
        setFollowerAwaitingDirector(false);
      }
    },
    [liveIsFollower]
  );

  const resolveFollowerSongIdForNav = useCallback((recovery: SessionRecoveryState): string | null => {
    if (recovery.songId) return recovery.songId;
    const remote = lastRemoteStateRef.current;
    if (remote?.currentSongId) return remote.currentSongId;
    const v3SongId = getFollowV3State().currentSongId;
    if (v3SongId) return v3SongId;
    if (recovery.listSongIds.length > 0) {
      const idx = Math.max(0, recovery.currentIndex ?? 0);
      return recovery.listSongIds[idx] ?? recovery.listSongIds[0] ?? null;
    }
    return null;
  }, []);

  /** Routes follower to match director viewMode (continuous vs song); V3-safe (no legacy song owner). */
  const navigateFollowerToMatchDirectorView = useCallback(
    async (
      code: string,
      input: SharedSessionState | SessionRecoveryState,
      opts?: {
        source?: string;
        force?: boolean;
        replace?: boolean;
        navSource?: NavAttemptSource;
      }
    ): Promise<boolean> => {
      if (!liveIsFollower || !readFollowDirector()) return false;

      const navReplace = opts?.replace ?? false;

      const normalized = normalizeSessionCode(code);
      const recovery = enrichRecoveryForNavigation(
        'sessionId' in input
          ? sharedStateToRecovery(
              normalized,
              input as SharedSessionState,
              sessionOriginRef.current
            )
          : (input as SessionRecoveryState)
      );

      const navSource: NavAttemptSource =
        opts?.navSource ??
        (opts?.source?.includes('rpc')
          ? 'rpc'
          : opts?.source?.includes('fallback-db') || opts?.source?.includes('db')
            ? 'db'
            : opts?.source?.includes('fallback')
              ? 'fallback'
              : 'broadcast');

      const isDbOrRpcNav = navSource === 'db' || navSource === 'rpc';

      logNavAttempt(navSource, {
        view_mode: recovery.viewMode,
        list_id: recovery.listId,
        current_index: recovery.currentIndex,
        list_song_ids: recovery.listSongIds,
        song_id: recovery.songId,
        extra: { source: opts?.source ?? null },
      });

      if (isDbOrRpcNav) {
        setFollowerAwaitingDirector(false);
        awaitingFirstBroadcastRef.current = false;
        const forced = forceFollowerNavFromDbRecovery(
          recovery,
          normalized,
          navigate,
          resolveFollowerSongIdForNav
        );
        console.log('[JOIN_NAV_FINAL]', {
          result: forced ? 'db-rpc-forced-nav' : 'db-rpc-force-failed',
          navSource,
          pathnameBefore: getJoinPathname(),
          viewMode: recovery.viewMode,
          listId: recovery.listId,
          songId: recovery.songId,
        });
        return forced;
      }

      const resolvedViewMode = resolveSharedViewMode(
        recovery.viewMode,
        recovery.listId,
        recovery.listSongIds
      );
      const pathnameBefore = getJoinPathname();
      const songIdForNav = resolveFollowerSongIdForNav(recovery);
      const recoveryWithSong =
        songIdForNav && !recovery.songId ? { ...recovery, songId: songIdForNav } : recovery;

      const target = resolveFollowerTargetFromDirectorState(pathnameBefore, recoveryWithSong);

      const prevResolvedViewMode = lastFollowerNavResolvedViewModeRef.current;
      const viewModeChanged =
        prevResolvedViewMode !== null && prevResolvedViewMode !== resolvedViewMode;
      lastFollowerNavResolvedViewModeRef.current = resolvedViewMode;
      const forceNav = Boolean(opts?.force) || viewModeChanged;

      const logJoinNavFinal = (result: string, extra?: Record<string, unknown>) => {
        console.log('[JOIN_NAV_FINAL]', {
          result,
          source: opts?.source,
          forceNav,
          viewModeChanged,
          pathname: pathnameBefore,
          resolvedViewMode,
          targetType: target.type,
          viewMode: recovery.viewMode,
          listId: recovery.listId,
          songId: songIdForNav,
          currentIndex: recovery.currentIndex,
          ...extra,
        });
      };

      followTrace('FOLLOW_VIEW_NAV', {
        actor: 'spectator',
        sessionCode: normalized,
        currentRoute: pathnameBefore,
        reason: opts?.source,
        extra: {
          viewMode: recovery.viewMode,
          resolvedViewMode,
          targetType: target.type,
          currentIndex: recovery.currentIndex,
          songId: recoveryWithSong.songId,
          listId: recovery.listId,
          v3: shouldDisableLegacyFollowPipeline('follower'),
        },
      });

      const navigateContinuousLive = (): boolean => {
        if (!recovery.listId) return false;
        const listSongIds =
          recovery.listSongIds.length > 0
            ? recovery.listSongIds
            : songIdForNav
              ? [songIdForNav]
              : [];
        const currentIndex =
          typeof recovery.currentIndex === 'number' && recovery.currentIndex >= 0
            ? recovery.currentIndex
            : songIdForNav && listSongIds.length > 0
              ? Math.max(0, listSongIds.indexOf(songIdForNav))
              : 0;
        const initialSongId =
          songIdForNav ??
          (listSongIds[currentIndex] ?? listSongIds[0] ?? undefined);

        const path = `/setlist/${recovery.listId}/live`;
        persistContinuousListSync(recovery.listId, listSongIds);
        joinDebugLog('JOIN_NAV', 'match-director-view → continuous live (forced)', {
          path,
          viewMode: recovery.viewMode,
          resolvedViewMode,
          currentIndex,
          initialSongId,
          source: opts?.source,
        });
        setFollowerAwaitingDirector(false);
        navigate(path, {
          replace: navReplace || true,
          state: {
            listId: recovery.listId,
            listSongIds,
            joinSessionCode: normalized,
            initialSongId,
            initialIndex: currentIndex,
          },
        });
        logJoinNavFinal('navigated-continuous-live', { path });
        return true;
      };

      if (resolvedViewMode === 'continuous' && recovery.listId) {
        const navKey = buildJoinNavigationKey(normalized, recoveryWithSong, {
          type: 'continuous-live',
          listId: recovery.listId,
          songId: songIdForNav,
          currentIndex: recovery.currentIndex,
        });
        if (
          !forceNav &&
          navKey &&
          lastJoinNavigationKeyRef.current === navKey &&
          followerPathMatchesDirectorTarget(pathnameBefore, {
            type: 'continuous-live',
            listId: recovery.listId,
            songId: songIdForNav,
            currentIndex: recovery.currentIndex,
          })
        ) {
          setFollowerAwaitingDirector(false);
          logJoinNavFinal('skipped-already-on-live', { navKey });
          return true;
        }
        if (navKey) lastJoinNavigationKeyRef.current = navKey;
        const ok = navigateContinuousLive();
        logJoinNavFinal(ok ? 'navigated-continuous-priority' : 'continuous-priority-failed');
        return ok;
      }

      if (!recovery.listId && !songIdForNav) {
        if (!isDbOrRpcNav) {
          setFollowerAwaitingDirector(true);
        }
        joinDebugLog('JOIN_NAV', 'awaiting director — no songId/listId', {
          source: opts?.source,
          viewMode: recovery.viewMode,
        });
        logJoinNavFinal('awaiting-no-song-or-list');
        return false;
      }

      if (target.type === 'none') {
        if (recovery.listId && resolvedViewMode === 'continuous') {
          const ok = navigateContinuousLive();
          logJoinNavFinal(ok ? 'navigated-continuous-from-none-target' : 'continuous-none-target-failed');
          return ok;
        }
        if (!songIdForNav) {
          if (!isDbOrRpcNav) {
            setFollowerAwaitingDirector(true);
          }
          joinDebugLog('JOIN_NAV', 'awaiting director — target none', { source: opts?.source });
          logJoinNavFinal('awaiting-target-none');
          return false;
        }
      }

      if (followerPathMatchesDirectorTarget(pathnameBefore, target) && !forceNav) {
        setFollowerAwaitingDirector(false);
        const handler = pageHandlersRef.current.onSharedSessionUpdate;
        if (handler && lastRemoteStateRef.current) {
          handler(lastRemoteStateRef.current);
        }
        logJoinNavFinal('skipped-already-on-target', { targetType: target.type });
        return true;
      }

      const navKey = buildJoinNavigationKey(normalized, recovery, target);
      if (!forceNav && navKey && lastJoinNavigationKeyRef.current === navKey) {
        logJoinNavFinal('skipped-nav-key-dedupe', { navKey });
        return true;
      }

      if (
        !forceNav &&
        recovery.listId &&
        shouldRetainFollowerViewMode(pathnameBefore, recovery.listId) &&
        target.type === 'continuous-live'
      ) {
        const handler = pageHandlersRef.current.onSharedSessionUpdate;
        if (handler && lastRemoteStateRef.current) {
          handler(lastRemoteStateRef.current);
        }
        if (navKey) lastJoinNavigationKeyRef.current = navKey;
        logJoinNavFinal('retained-live-mode');
        return true;
      }

      if (target.type === 'continuous-live' && recovery.listId) {
        const v3Active = shouldDisableLegacyFollowPipeline('follower');
        if (
          !v3Active &&
          songIdForNav &&
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: true,
            songId: songIdForNav,
            remoteIndex: recovery.currentIndex,
            listId: recovery.listId,
            listSongIds: recovery.listSongIds,
            joinSessionCode: normalized,
          })
        ) {
          setFollowerAwaitingDirector(false);
          if (navKey) lastJoinNavigationKeyRef.current = navKey;
          logJoinNavFinal('navigated-song-view-only-legacy');
          return true;
        }

        if (navKey) lastJoinNavigationKeyRef.current = navKey;
        const okLive = navigateContinuousLive();
        logJoinNavFinal(okLive ? 'navigated-continuous-target' : 'continuous-target-failed');
        return okLive;
      }

      const songId = songIdForNav ?? recoveryWithSong.songId;
      if (songId) {
        const path = getSongPathById(songId);
        const liveLock = enforceFollowerLiveRetention({
          pathname: pathnameBefore,
          followDirector: true,
          targetPath: path,
          source: opts?.source ?? 'match-director-view',
          listId: recovery.listId,
        });
        if (liveLock.blocked) {
          const handler = pageHandlersRef.current.onSharedSessionUpdate;
          if (handler && lastRemoteStateRef.current) {
            handler(lastRemoteStateRef.current);
          }
          if (navKey) lastJoinNavigationKeyRef.current = navKey;
          logJoinNavFinal('blocked-by-live-retention');
          return true;
        }

        joinDebugLog('JOIN_NAV', 'match-director-view → song', {
          path,
          viewMode: recovery.viewMode,
          currentIndex: recovery.currentIndex,
          source: opts?.source,
        });
        setFollowerAwaitingDirector(false);
        navigate(path, {
          replace: navReplace || true,
          state: {
            listId: recovery.listId ?? undefined,
            listSongIds: recovery.listSongIds,
            currentIndex: recovery.currentIndex,
            joinSessionCode: normalized,
          },
        });
        if (navKey) lastJoinNavigationKeyRef.current = navKey;
        logJoinNavFinal('navigated-song', { path });
        return true;
      }

      if (!recovery.listId) {
        if (!isDbOrRpcNav) {
          setFollowerAwaitingDirector(true);
        }
        joinDebugLog('JOIN_NAV', 'awaiting director — no navigable target', {
          source: opts?.source,
          viewMode: recovery.viewMode,
        });
      }
      logJoinNavFinal('no-navigable-target');
      return false;
    },
    [liveIsFollower, navigate, resolveFollowerSongIdForNav]
  );

  const retryFollowerNavFromRemote = useCallback(() => {
    if (!liveIsFollower || !liveFollowerCode || !readFollowDirector()) return;
    const remote = lastRemoteStateRef.current;
    if (!remote) return;
    void navigateFollowerToMatchDirectorView(liveFollowerCode, remote, {
      source: 'follow-v3-remote-retry',
      force: true,
    });
  }, [liveIsFollower, liveFollowerCode, navigateFollowerToMatchDirectorView]);

  const isDirectorContinuousView = useCallback(() => {
    const remote = lastRemoteStateRef.current;
    if (!remote?.listId) return false;
    return (
      resolveSharedViewMode(remote.viewMode, remote.listId, remote.listSongIds ?? null) ===
      'continuous'
    );
  }, []);

  useFollowV3RouteMount({
    liveIsFollower,
    isDirectorContinuousView,
    retryRemoteNavigation: retryFollowerNavFromRemote,
  });

  const syncForceContinuousIndexFromRemote = useCallback(
    (remote: SharedSessionState, source: string) => {
      if (!liveIsFollower || !readFollowDirector()) return;
      const listId = remote.listId ?? null;
      if (!listId || typeof remote.currentIndex !== 'number' || remote.currentIndex < 0) {
        return;
      }

      const resolved = resolveSharedViewMode(
        remote.viewMode,
        listId,
        remote.listSongIds ?? null
      );
      if (resolved !== 'continuous') return;

      const pathname = getJoinPathname();
      if (!isFollowerInContinuousMode(pathname, listId)) return;

      const signature = `${listId}|${remote.currentIndex}|${remote.currentSongId ?? ''}`;
      if (lastForceContinuousIndexRef.current === signature) return;
      lastForceContinuousIndexRef.current = signature;

      console.log('[LIVE_SESSION_FORCE_INDEX]', {
        source,
        currentIndex: remote.currentIndex,
        currentSongId: remote.currentSongId,
        listId,
        viewMode: remote.viewMode,
        pathname,
      });

      dispatchForceContinuousIndex({
        currentIndex: remote.currentIndex,
        currentSongId: remote.currentSongId ?? null,
        listId,
        sessionCode: remote.sessionId ?? liveFollowerCode,
        viewMode: remote.viewMode,
        source,
      });

      const handler = pageHandlersRef.current.onSharedSessionUpdate;
      if (handler) {
        handler(remote);
      }
    },
    [liveIsFollower, liveFollowerCode]
  );

  syncForceContinuousIndexFromRemoteRef.current = syncForceContinuousIndexFromRemote;

  const navigateToRecoveryTarget = useCallback(
    (
      code: string,
      recovery: SessionRecoveryState,
      role: StoredLiveSessionRole,
      opts?: { source?: RecoveryNavigateSource; recoverySource?: FollowerRecoverySource }
    ) => {
      if (role === 'director' && opts?.source !== 'manual') {
        sessionRestoreLog('director detected — skipping auto navigation', {
          code,
          caller: opts?.source ?? 'unspecified',
        });
        return;
      }

      const pathnameBefore = getJoinPathname();
      const enriched = enrichRecoveryForNavigation(recovery);
      const origin = inferSessionOriginFromRecovery(enriched);

      if (role === 'follower' && shouldDisableLegacyFollowPipeline('follower')) {
        if (readFollowDirector()) {
          void navigateFollowerToMatchDirectorView(code, enriched, {
            source: `recovery-target-v3:${opts?.source ?? 'auto'}`,
            force: opts?.source === 'manual',
          });
        }
        return;
      }

      const target =
        role === 'follower'
          ? readFollowDirector()
            ? resolveFollowerTargetFromDirectorState(pathnameBefore, enriched)
            : resolveFollowerPreferredView(pathnameBefore, enriched)
          : describeJoinNavigationTarget(enriched);

      if (
        role === 'follower' &&
        enriched.listId &&
        shouldRetainFollowerViewMode(pathnameBefore, enriched.listId)
      ) {
        if (
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: readFollowDirector(),
            songId: enriched.songId ?? lastRemoteStateRef.current?.currentSongId,
            remoteIndex: enriched.currentIndex,
            listId: enriched.listId,
            listSongIds: enriched.listSongIds,
            joinSessionCode: code,
          })
        ) {
          return;
        }
        followViewmodeLog({ reason: 'retained continuous mode' });
        followViewLog({ mode: 'continuous', action: 'sync-inside-live' });
        if (target.type === 'song') {
          followViewEnforcedLog({
            retainedLiveMode: true,
            attemptedNavigation: getSongPathById(enriched.songId ?? ''),
            blocked: true,
            pathname: pathnameBefore,
          });
        }
        const handler = pageHandlersRef.current.onSharedSessionUpdate;
        if (handler && lastRemoteStateRef.current) {
          handler(lastRemoteStateRef.current);
        }
        return;
      }
      joinDebugLog('JOIN_ROUTE', 'navigateToRecoveryTarget', {
        code,
        role,
        target,
        source: opts?.source ?? 'auto',
        pathnameBefore,
        songId: enriched.songId,
        listId: enriched.listId,
        viewMode: enriched.viewMode,
      });

      if (role === 'director') {
        clearManualExitContinuous();
        writeStoredLiveSession(code, 'director', origin);
      } else {
        writeStoredLiveSession(code, 'follower', origin);
      }

      if (target.type === 'continuous-live' && enriched.listId) {
        if (
          role === 'follower' &&
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: readFollowDirector(),
            songId: enriched.songId,
            remoteIndex: enriched.currentIndex,
            listId: enriched.listId,
            listSongIds: enriched.listSongIds,
            joinSessionCode: code,
          })
        ) {
          return;
        }
        const listSongIds =
          enriched.listSongIds.length > 0
            ? enriched.listSongIds
            : enriched.songId
              ? [enriched.songId]
              : [];
        const path = `/setlist/${enriched.listId}/live`;
        persistContinuousListSync(enriched.listId, listSongIds);
        joinDebugLog('JOIN_NAV', 'router.navigate', { path, pathnameBefore });
        navigate(path, {
          state: {
            listId: enriched.listId,
            listSongIds,
            joinSessionCode: code,
            initialSongId: enriched.songId ?? undefined,
            initialIndex: enriched.currentIndex,
            recoverySource: opts?.recoverySource,
          },
        });
        queueMicrotask(() => {
          const after = getJoinPathname();
          if (after !== pathnameBefore) {
            joinDebugLog('JOIN_REDIRECT', 'continuous live', { from: pathnameBefore, to: after });
          } else {
            joinDebugLog('JOIN_BLOCKED', 'pathname unchanged after continuous navigate', {
              path,
              pathnameBefore,
            });
          }
        });
        return;
      }

      if (enriched.songId) {
        const path = getSongPathById(enriched.songId);
        const liveLock = enforceFollowerLiveRetention({
          pathname: pathnameBefore,
          followDirector: role === 'follower' ? readFollowDirector() : false,
          targetPath: path,
          source: 'navigateToRecoveryTarget',
          listId: enriched.listId,
        });
        if (liveLock.blocked) {
          followTrace('FOLLOW_ROUTE_DECISION', {
            actor: 'spectator',
            currentRoute: pathnameBefore,
            targetRoute: path,
            source: 'navigateToRecoveryTarget',
            reason: 'live-lock-blocked',
            extra: { blocked: true, retainLive: liveLock.retainedLiveMode },
          });
          auditEventLog({
            source: 'SpectatorSessionContext',
            action: 'FOLLOW_BLOCK-navigate-recovery-song',
            sessionCode: code,
            songId: enriched.songId ?? null,
            pathname: pathnameBefore,
            extra: { attemptedPath: path },
          });
          const handler = pageHandlersRef.current.onSharedSessionUpdate;
          if (handler && lastRemoteStateRef.current) {
            handler(lastRemoteStateRef.current);
          }
          return;
        }
        joinDebugLog('JOIN_NAV', 'router.navigate', { path, pathnameBefore });
        auditEventLog({
          source: 'SpectatorSessionContext',
          action: 'navigate-recovery-song',
          sessionCode: code,
          songId: enriched.songId ?? null,
          remoteIndex: enriched.currentIndex ?? null,
          pathname: pathnameBefore,
          liveSessionStatus: liveSessionStatusRef.current,
          extra: { recoverySource: opts?.recoverySource },
        });
        navigate(path, {
          state: {
            listId: enriched.listId ?? undefined,
            listSongIds: enriched.listSongIds,
            currentIndex: enriched.currentIndex,
            joinSessionCode: role === 'follower' ? code : undefined,
          },
        });
        queueMicrotask(() => {
          const after = getJoinPathname();
          if (after !== pathnameBefore) {
            joinDebugLog('JOIN_REDIRECT', 'song view', { from: pathnameBefore, to: after });
          } else {
            joinDebugLog('JOIN_BLOCKED', 'pathname unchanged after song navigate', {
              path,
              pathnameBefore,
            });
          }
        });
        return;
      }

      if (enriched.listId) {
        const path = `/lista/${enriched.listId}`;
        joinDebugLog('JOIN_NAV', 'router.navigate', { path, pathnameBefore });
        navigate(path);
        queueMicrotask(() => {
          const after = getJoinPathname();
          if (after !== pathnameBefore) {
            joinDebugLog('JOIN_REDIRECT', 'list detail', { from: pathnameBefore, to: after });
          }
        });
        return;
      }

      joinDebugLog('JOIN_BLOCKED', 'navigateToRecoveryTarget — no route', {
        code,
        recovery: enriched,
      });
      toast.info('Sesión activa — abre una canción para ver el contenido');
    },
    [navigate, navigateFollowerToMatchDirectorView]
  );

  const dispatchFollowerToPageHandler = useCallback(
    (state: SharedSessionState, source: string) => {
      if (shouldDisableLegacyFollowPipeline('follower')) return true;
      if (
        navigateFollowerSongViewOnly({
          navigate,
          followDirector: readFollowDirector(),
          songId: state.currentSongId,
          remoteIndex: state.currentIndex,
          listId: state.listId,
          listSongIds: state.listSongIds,
          joinSessionCode: state.sessionId,
        })
      ) {
        return true;
      }
      const handler = pageHandlersRef.current.onSharedSessionUpdate;
      if (!handler) return false;
      followTrace('FOLLOW_OWNER_DECISION', {
        actor: 'spectator',
        currentRoute: getJoinPathname(),
        page: 'continuous-live',
        remoteSongId: state.currentSongId ?? undefined,
        remoteIndex: state.currentIndex ?? undefined,
        source,
        extra: { liveMounted: true, dispatchToPageHandler: true },
      });
      followOwnerLog({ owner: 'live-mounted', source });
      handler(state);
      return true;
    },
    [navigate]
  );

  const isFollowerLivePageOwner = useCallback(() => {
    const pathname = getJoinPathname();
    const remote = lastRemoteStateRef.current;
    return isFollowerNavigationOwnedByLive({
      pathname,
      followDirector: readFollowDirector(),
      listId: remote?.listId ?? pageContextRef.current.listId ?? null,
      hasSharedSessionHandler: !!pageHandlersRef.current.onSharedSessionUpdate,
    });
  }, []);

  const navigateFollowerToDirectorState = useCallback(
    async (
      code: string,
      opts?: {
        source?: string;
        recovery?: SessionRecoveryState | null;
        force?: boolean;
        recoverySource?: FollowerRecoverySource;
      }
    ) => {
      const normalized = normalizeSessionCode(code);
      const pathnameBefore = getJoinPathname();
      const source = opts?.source ?? 'unknown';

      joinDebugLog('JOIN_NAV', 'navigateFollowerToDirectorState start', {
        code: normalized,
        source,
        pathnameBefore,
        force: opts?.force ?? false,
        liveIsFollower,
        connectionRole: connection?.role ?? null,
        hasRemote: !!lastRemoteStateRef.current?.currentSongId,
      });

      if (normalized.length < 4) {
        joinDebugLog('JOIN_BLOCKED', 'invalid session code', { code: normalized });
        return false;
      }
      if (!readFollowDirector()) {
        joinDebugLog('JOIN_BLOCKED', 'followDirector disabled (wt_follow_director)', { source });
        return false;
      }

      if (shouldDisableLegacyFollowPipeline('follower')) {
        joinDebugLog('JOIN_NAV', 'follow-v3 — view-mode navigation only', { source });
        const remote = lastRemoteStateRef.current;
        const recovery =
          opts?.recovery ??
          (remote
            ? enrichRecoveryForNavigation(
                sharedStateToRecovery(normalized, remote, sessionOriginRef.current)
              )
            : null);
        if (recovery) {
          await navigateFollowerToMatchDirectorView(normalized, recovery, {
            source: `v3:${source}`,
            force: opts?.force,
          });
        }
        return true;
      }

      if (isFollowerLivePageOwner() && lastRemoteStateRef.current?.currentSongId) {
        const remoteSnap = lastRemoteStateRef.current;
        if (
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: readFollowDirector(),
            songId: remoteSnap.currentSongId,
            remoteIndex: remoteSnap.currentIndex,
            listId: remoteSnap.listId,
            listSongIds: remoteSnap.listSongIds,
            joinSessionCode: normalized,
          })
        ) {
          return true;
        }
        followTrace('FOLLOW_OWNER_DECISION', {
          actor: 'spectator',
          currentRoute: pathnameBefore,
          page: 'continuous-live',
          remoteSongId: remoteSnap.currentSongId ?? undefined,
          remoteIndex: remoteSnap.currentIndex ?? undefined,
          reason: `navigate-blocked:${source}`,
          extra: {
            liveMounted: true,
            isFollowerLiveOwner: true,
            retainFollowerView: shouldRetainFollowerViewMode(
              pathnameBefore,
              remoteSnap.listId ?? ''
            ),
          },
        });
        followOwnerLog({
          owner: 'live-mounted',
          source: `navigate-blocked:${source}`,
          pathname: pathnameBefore,
        });
        dispatchFollowerToPageHandler(remoteSnap, `navigateFollower-blocked:${source}`);
        return true;
      }

      if (followerNavInFlightRef.current && !opts?.force) {
        joinDebugLog('JOIN_BLOCKED', 'navigation already in flight', { source });
        return false;
      }

      followerNavInFlightRef.current = true;
      try {
        joinSessionLog('session connected', { code: normalized, source });

        let recoverySource: FollowerRecoverySource =
          opts?.recoverySource ?? 'fallback';
        let recovery: SessionRecoveryState | null = opts?.recovery
          ? enrichRecoveryForNavigation(opts.recovery)
          : null;

        if (!recovery) {
          const remote = lastRemoteStateRef.current;
          const isExplicitJoin =
            source === 'joinWithCode' ||
            source === 'markExplicitJoin' ||
            source.startsWith('joinWithCode');
          if (isExplicitJoin && remote?.currentSongId) {
            const resolved = resolveFollowerRecovery({
              code: normalized,
              remote,
              dbRecovery: null,
              sessionOrigin: sessionOriginRef.current,
            });
            recovery = resolved.recovery
              ? enrichRecoveryForNavigation(resolved.recovery)
              : null;
            recoverySource = 'shared-session';
            joinFastpathLog({ source: 'shared-session', code: normalized, joinSource: source });
          }
          if (!recovery) {
            const dbRecovery = isExplicitJoin
              ? await resolveLiveSessionForReconnect(normalized)
              : await resolveLiveSessionForReconnectWithRetry(normalized);
            const resolved = resolveFollowerRecovery({
              code: normalized,
              remote,
              dbRecovery,
              sessionOrigin: sessionOriginRef.current,
            });
            recovery = resolved.recovery
              ? enrichRecoveryForNavigation(resolved.recovery)
              : null;
            recoverySource = resolved.source;
            if (isExplicitJoin) {
              joinFastpathLog({
                source: recovery ? resolved.source : 'fallback',
                code: normalized,
                joinSource: source,
              });
            }
          }
          followRecoveryLog({
            source: recoverySource,
            code: normalized,
            currentIndex: recovery?.currentIndex ?? null,
            songId: recovery?.songId ?? null,
            reason: source,
          });
        } else if (lastRemoteStateRef.current?.currentSongId) {
          recoverySource = 'shared-session';
        } else {
          recoverySource = 'db';
        }

        if (!recovery) {
          pendingFollowerNavRef.current = { code: normalized, source };
          joinDebugLog('JOIN_BLOCKED', 'no recovery after retry — pending until broadcast', {
            source,
          });
          return false;
        }

        recovery = enrichRecoveryForNavigation(recovery);

        if (
          recovery.listId &&
          shouldRetainFollowerViewMode(pathnameBefore, recovery.listId)
        ) {
          if (
            navigateFollowerSongViewOnly({
              navigate,
              followDirector: readFollowDirector(),
              songId: recovery.songId ?? lastRemoteStateRef.current?.currentSongId,
              remoteIndex: recovery.currentIndex,
              listId: recovery.listId,
              listSongIds: recovery.listSongIds,
              joinSessionCode: normalized,
            })
          ) {
            pendingFollowerNavRef.current = null;
            return true;
          }
          followViewmodeLog({ reason: 'retained continuous mode' });
          followViewLog({ mode: 'continuous', action: 'sync-inside-live' });
          const handler = pageHandlersRef.current.onSharedSessionUpdate;
          if (handler && lastRemoteStateRef.current) {
            handler(lastRemoteStateRef.current);
          }
          pendingFollowerNavRef.current = null;
          return true;
        }

        const target = resolveFollowerTargetFromDirectorState(pathnameBefore, recovery);
        followJoinLog({
          remoteTargetIndex: recovery.currentIndex ?? null,
          songId: recovery.songId,
          viewMode: recovery.viewMode,
          source,
        });
        joinDebugLog('JOIN_ROUTE', 'navigation target', {
          code: normalized,
          target,
          songId: recovery.songId,
          listId: recovery.listId,
          viewMode: recovery.viewMode,
          currentIndex: recovery.currentIndex,
          recoverySource,
        });

        if (target.type === 'none') {
          pendingFollowerNavRef.current = { code: normalized, source };
          joinDebugLog('JOIN_BLOCKED', 'target type none after enrich', {
            source,
            songId: recovery.songId,
            listId: recovery.listId,
            viewMode: recovery.viewMode,
            listSongIds: recovery.listSongIds,
          });
          return false;
        }

        if (
          target.type === 'continuous-live' &&
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: readFollowDirector(),
            songId: recovery.songId ?? target.songId,
            remoteIndex: recovery.currentIndex ?? target.currentIndex,
            listId: recovery.listId ?? target.listId,
            listSongIds: recovery.listSongIds,
            joinSessionCode: normalized,
          })
        ) {
          pendingFollowerNavRef.current = null;
          return true;
        }

        sessionOriginRef.current = inferSessionOriginFromRecovery(recovery);
        lastRemoteStateRef.current = {
          sessionId: normalized,
          currentSongId: recovery.songId,
          currentIndex: recovery.currentIndex,
          listId: recovery.listId,
          listSongIds: recovery.listSongIds,
          customSemitones: recovery.semitones,
          genderShift: recovery.genderShift,
          viewMode: recovery.viewMode,
          sharedSectionAnchor: recovery.sharedSectionAnchor ?? undefined,
          updatedAt: new Date().toISOString(),
        };

        const navKey = buildJoinNavigationKey(normalized, recovery, target);
        if (navKey && !opts?.force && lastJoinNavigationKeyRef.current === navKey) {
          joinDebugLog('JOIN_BLOCKED', 'duplicate navKey (force=false)', { navKey, source });
          return true;
        }

        setPassiveListenMode(false);
        setDirectorAwayFromScope(false);

        joinDebugLog('JOIN_NAV', 'calling navigateToRecoveryTarget', { target, source, navKey });
        navigateToRecoveryTarget(normalized, recovery, 'follower', {
          source: 'auto',
          recoverySource,
        });
        if (navKey) lastJoinNavigationKeyRef.current = navKey;
        followRecoverySuccess({
          source: recoverySource,
          code: normalized,
          currentIndex: recovery.currentIndex ?? null,
          songId: recovery.songId ?? null,
        });
        pendingFollowerNavRef.current = null;
        return true;
      } finally {
        followerNavInFlightRef.current = false;
      }
    },
    [
      navigate,
      navigateToRecoveryTarget,
      navigateFollowerToMatchDirectorView,
      liveIsFollower,
      connection?.role,
      isFollowerLivePageOwner,
      dispatchFollowerToPageHandler,
    ]
  );

  const restorePersistedSession = useCallback(async () => {
    try {
      isHydratingRef.current = true;

      const pending = readPendingJoin();
      const persisted = readLiveSessionPersistence();
      const stored = readStoredLiveSession();
      const code = normalizeSessionCode(
        pending ?? persisted?.sessionCode ?? stored?.code ?? ''
      );
      if (code.length < 4) return;

      const storedRole = persisted?.role ?? stored?.role;
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      let recovery = await resolveLiveSessionForReconnect(code);
      const isOwner =
        !!authSession?.user?.id &&
        !!recovery?.directorId &&
        authSession.user.id === recovery.directorId;

      if (!recovery && storedRole === 'director') {
        recovery = await resolveLiveSessionForReconnectWithRetry(code);
      }

      sessionRestoreLog('active session found', {
        code,
        storedRole,
        pending: !!pending,
        isOwner,
      });

      if (!restoreToastShownRef.current) {
        restoreToastShownRef.current = true;
        if (!isOwner && (storedRole === 'follower' || pending)) {
          toast.info('Reconectando a sesión...');
        } else if (isOwner) {
          toast.info('Sesión activa detectada');
        }
      }

      /** Director owner: banner only — no canal, no navigate hasta "Volver a sesión". */
      if (isOwner) {
        clearPendingJoin();
        sessionRestoreLog('director detected — skipping auto navigation', { code });
        sessionOriginRef.current = stored?.origin ?? null;
        if (persisted?.directorAwayFromScope) setDirectorAwayFromScope(true);
        if (recovery) {
          setDetected({ code, recovery, role: 'director' });
        }
        transitionSessionStatus('detected', 'restorePersistedSession director owner');
        setActiveJoinCode(code);
        sessionBannerLog('restored active session', { code, role: 'director' });
        setIsReconnecting(false);
        return;
      }

      if (storedRole === 'follower' || pending) {
        await withJoinInFlight(
          joinInFlightRef,
          'restorePersistedSession',
          liveSessionStatusRef.current,
          async () => {
            transitionSessionStatus('joining', 'restorePersistedSession follower auto');
            sessionRestoreLog('follower reconnect auto navigate', { code, pending: !!pending });
            sessionOriginRef.current = stored?.origin ?? sessionOriginRef.current;
            if (persisted?.passiveMode) setPassiveListenMode(true);
            if (persisted?.followDirector === false) writeFollowDirector(false);
            const active = await abortFollowerJoinIfSessionInactive(
              code,
              'restorePersistedSession'
            );
            if (!active) return;
            beginFollowerSession(code);
            setActiveJoinCode(code);
            setSessionConnected(true);

            const remote = lastRemoteStateRef.current;
            const resolved = resolveFollowerRecovery({
              code,
              remote,
              dbRecovery: recovery,
              sessionOrigin: sessionOriginRef.current,
            });
            followRecoveryLog({
              source: resolved.source,
              code,
              currentIndex: resolved.recovery?.currentIndex ?? null,
              songId: resolved.recovery?.songId ?? null,
              reason: 'restore-persisted',
            });

            if (resolved.recovery && readFollowDirector()) {
              await navigateFollowerToDirectorState(code, {
                source: 'restore-persisted',
                recovery: resolved.recovery,
                recoverySource: resolved.source,
                force: true,
              });
            } else if (resolved.recovery) {
              sessionRestoreLog('follower restore — navigation skipped (followDirector off)');
            } else {
              followRecoveryFailed({ code, reason: 'restore-persisted no recovery' });
            }

            sessionLog('reconnected', { code, role: 'follower' });
            toast.success('Sesión restaurada');
            setIsReconnecting(false);
          }
        );
        return;
      }

      if (recovery) {
        setDetected({ code, recovery, role: storedRole ?? 'follower' });
        transitionSessionStatus('detected', 'restorePersistedSession recovery banner');
        sessionBannerLog('restored active session', { code });
      }
    } catch (error) {
      console.error('[LiveSession] restore failed', error);
      clearLiveSessionPersistence();
    } finally {
      isHydratingRef.current = false;
      const st = liveSessionStatusRef.current;
      if (st === 'idle' || st === 'detected' || st === 'ended') {
        void refreshDetection();
      }
    }
  }, [beginFollowerSession, navigateFollowerToDirectorState, transitionSessionStatus, refreshDetection]);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    void restorePersistedSession();
  }, [restorePersistedSession]);

  const applyFollowerBroadcastFallback = useCallback(
    (state: SharedSessionState) => {
      const pathname = getJoinPathname();
      followTrace('FOLLOW_ROUTE_DECISION', {
        actor: 'spectator',
        currentRoute: pathname,
        remoteSongId: state.currentSongId ?? undefined,
        remoteIndex: state.currentIndex ?? undefined,
        source: 'applyFollowerBroadcastFallback',
        reason: 'entry',
        extra: {
          retainLive: state.listId
            ? shouldRetainFollowerViewMode(pathname, state.listId)
            : false,
          liveMounted: isFollowerInContinuousMode(pathname, state.listId),
        },
      });
      if (!liveIsFollower) {
        joinDebugLog('JOIN_BLOCKED', 'broadcast fallback — not follower', {
          connectionRole: connection?.role ?? null,
        });
        return;
      }
      if (!readFollowDirector()) {
        joinDebugLog('JOIN_BLOCKED', 'broadcast fallback — followDirector off');
        return;
      }

      if (shouldDisableLegacyFollowPipeline('follower')) {
        return;
      }

      if (
        navigateFollowerSongViewOnly({
          navigate,
          followDirector: true,
          songId: state.currentSongId,
          remoteIndex: state.currentIndex,
          listId: state.listId,
          listSongIds: state.listSongIds,
          joinSessionCode: state.sessionId,
        })
      ) {
        return;
      }

      const code = normalizeSessionCode(
        liveFollowerCode || connection?.sessionCode || state.sessionId
      );
      if (code.length < 4 || !state.currentSongId) {
        joinDebugLog('JOIN_BLOCKED', 'broadcast fallback — missing code or songId', {
          code,
          currentSongId: state.currentSongId,
        });
        return;
      }

      joinDebugLog('JOIN_NAV', 'broadcast fallback navigate', {
        code,
        songId: state.currentSongId,
        connectionRole: connection?.role ?? 'pending',
        pathname: getJoinPathname(),
      });

      if (
        state.listId &&
        readFollowDirector() &&
        isFollowerInContinuousMode(pathname, state.listId)
      ) {
        followTrace('FOLLOW_ROUTE_DECISION', {
          actor: 'spectator',
          currentRoute: pathname,
          targetRoute: `/setlist/${state.listId}/live`,
          source: 'broadcast-fallback:live',
          reason: 'dispatch-page-handler',
          extra: { blocked: false, retainLive: true },
        });
        if (dispatchFollowerToPageHandler(state, 'broadcast-fallback:live')) return;
      }

      if (state.listId && shouldRetainFollowerViewMode(pathname, state.listId)) {
        followTrace('FOLLOW_ROUTE_DECISION', {
          actor: 'spectator',
          currentRoute: pathname,
          targetRoute: `/setlist/${state.listId}/live`,
          source: 'broadcast-fallback:retain',
          reason: 'dispatch-page-handler',
          extra: { blocked: false, retainLive: true },
        });
        followViewLog({ mode: 'continuous', action: 'sync-inside-live' });
        if (dispatchFollowerToPageHandler(state, 'broadcast-fallback:retain')) return;
      }

      if (
        state.listId &&
        state.currentSongId &&
        !isFollowerInContinuousMode(pathname, state.listId)
      ) {
        followTrace('FOLLOW_ROUTE_DECISION', {
          actor: 'spectator',
          currentRoute: pathname,
          targetRoute: getSongPathById(state.currentSongId),
          source: 'broadcast-fallback:song-only',
          reason: 'handler-or-defer',
          extra: { retainLive: false },
        });
        followViewLog({ mode: 'song', action: 'sync-song-only' });
        const handler = pageHandlersRef.current.onSharedSessionUpdate;
        if (handler) {
          handler(state);
          return;
        }
      }

      followTrace('FOLLOW_ROUTE_DECISION', {
        actor: 'spectator',
        currentRoute: pathname,
        source: 'broadcast-fallback',
        reason: 'navigateFollowerToDirectorState',
        extra: { blocked: false },
      });
      realtimeLog('follow director trigger', {
        source: 'provider-fallback',
        songId: state.currentSongId,
        listId: state.listId,
        viewMode: state.viewMode,
      });
      void navigateFollowerToDirectorState(code, {
        source: 'broadcast-fallback',
        recovery: sharedStateToRecovery(code, state, sessionOriginRef.current),
        force: true,
      });
    },
    [liveIsFollower, connection, liveFollowerCode, navigate, navigateFollowerToDirectorState]
  );

  const dispatchSharedSessionUpdate = useCallback(
    (state: SharedSessionState) => {
      const v3BlocksLegacyNav =
        shouldDisableLegacyFollowPipeline('follower') && liveIsFollower;

      lastRemoteStateRef.current = state;
      lastRemoteStateAtRef.current = Date.now();
      if (liveIsFollower) {
        hasReceivedBroadcastRef.current = true;
      }
      clearFollowerAwaitingFromBroadcast(state);

      if (liveIsFollower && awaitingFirstBroadcastRef.current) {
        awaitingFirstBroadcastRef.current = false;
        console.log('[FIRST_BROADCAST]', {
          view_mode: state.viewMode,
          current_index: state.currentIndex ?? null,
          list_id: state.listId ?? null,
          list_song_ids: state.listSongIds ?? [],
          current_song_id: state.currentSongId ?? null,
          gender_shift: state.genderShift,
          session_id: state.sessionId,
          updated_at: state.updatedAt,
        });
        if (readFollowDirector()) {
          void navigateFollowerToMatchDirectorView(
            state.sessionId ?? liveFollowerCode ?? '',
            state,
            {
              source: 'first-broadcast',
              force: true,
              replace: true,
              navSource: 'broadcast',
            }
          );
        }
      }

      void querySessionActive(state.sessionId ?? liveFollowerCode ?? '').then((result) => {
        if (!result.active && liveIsFollower) {
          void abortFollowerJoinIfSessionInactive(
            result.code,
            'dispatchSharedSessionUpdate-inactive'
          );
        }
      });

      followTrace('FOLLOW_SHARED_RECEIVE', {
        actor: 'spectator',
        sessionCode: state.sessionId ?? liveFollowerCode ?? undefined,
        currentRoute: getJoinPathname(),
        remoteSongId: state.currentSongId ?? undefined,
        remoteIndex: state.currentIndex ?? undefined,
        source: 'dispatchSharedSessionUpdate',
        extra: {
          viewMode: state.viewMode,
          listId: state.listId,
          followDirector: readFollowDirector(),
          hasPageHandler: !!pageHandlersRef.current.onSharedSessionUpdate,
        },
      });
      auditEventLog({
        source: 'SpectatorSessionContext',
        action: 'shared-session-receive',
        sessionCode: state.sessionId ?? liveFollowerCode ?? null,
        songId: state.currentSongId ?? null,
        remoteIndex: state.currentIndex ?? null,
        reconnectState: isReconnecting,
        liveSessionStatus: liveSessionStatusRef.current,
        extra: { viewMode: state.viewMode, listId: state.listId },
      });
      if (liveIsFollower) setFollowerRemoteNavTick((t) => t + 1);
      const handler = pageHandlersRef.current.onSharedSessionUpdate;
      if (handler) {
        joinDebugLog('JOIN_NAV', 'shared-session handled by page', {
          songId: state.currentSongId,
          pathname: getJoinPathname(),
          viewMode: state.viewMode,
          currentIndex: state.currentIndex,
        });
        handler(state);
        if (liveIsFollower && readFollowDirector()) {
          syncForceContinuousIndexFromRemote(state, 'shared-session-page-handler');
          const pathname = getJoinPathname();
          const alreadyOnMatchingLive =
            state.viewMode === 'continuous' &&
            !!state.listId &&
            isFollowerInContinuousMode(pathname, state.listId);
          // Avoid force remount of /live on every shared-session tick (caso 2).
          if (!alreadyOnMatchingLive) {
            void navigateFollowerToMatchDirectorView(
              state.sessionId ?? liveFollowerCode ?? '',
              state,
              { source: 'shared-session-page-handler', force: false }
            );
          }
        }
        return;
      }
      joinDebugLog('JOIN_NAV', 'shared-session no page handler — provider fallback', {
        songId: state.currentSongId,
        pathname: getJoinPathname(),
        pending: pendingFollowerNavRef.current?.source ?? null,
        v3BlocksLegacyNav,
      });
      if (v3BlocksLegacyNav) {
        if (readFollowDirector()) {
          syncForceContinuousIndexFromRemote(state, 'shared-session-v3-fallback');
          const pathname = getJoinPathname();
          const alreadyOnMatchingLive =
            state.viewMode === 'continuous' &&
            !!state.listId &&
            isFollowerInContinuousMode(pathname, state.listId);
          if (!alreadyOnMatchingLive) {
            void navigateFollowerToMatchDirectorView(
              state.sessionId ?? liveFollowerCode ?? '',
              state,
              { source: 'shared-session-v3-fallback', force: false }
            );
          }
        }
        return;
      }
      applyFollowerBroadcastFallback(state);
    },
    [
      applyFollowerBroadcastFallback,
      liveIsFollower,
      liveFollowerCode,
      dispatchFollowerToPageHandler,
      navigateFollowerToMatchDirectorView,
      syncForceContinuousIndexFromRemote,
      clearFollowerAwaitingFromBroadcast,
      abortFollowerJoinIfSessionInactive,
    ]
  );

  /** Director handshake: page publish + broadcast ref fallback (view_mode, index, list). */
  const publishFullSessionStateIfDirector = useCallback(
    (sessionCode: string, opts?: { force?: boolean; reason?: string }) => {
      if (!liveIsDirector) return;
      const key = normalizeSessionCode(sessionCode);
      if (key.length < 4) return;

      pageHandlersRef.current.onRequestSharedSessionPublish?.();
      scheduleBroadcast({ immediate: true });

      const snapshot = buildSharedSessionFromBroadcast(key, broadcastStateRef.current);
      if (snapshot) {
        const normalized = normalizeOutgoingSharedSession(key, snapshot);
        const publishLog = {
          session_code: key,
          reason: opts?.reason ?? null,
          view_mode: normalized.viewMode,
          current_index: normalized.currentIndex ?? null,
          list_id: normalized.listId ?? null,
          list_song_ids: normalized.listSongIds ?? [],
          current_song_id: normalized.currentSongId ?? null,
          gender_shift: normalized.genderShift,
          shared_section_anchor: normalized.sharedSectionAnchor ?? null,
          updated_at: normalized.updatedAt,
          force: opts?.force ?? true,
        };
        if (opts?.reason?.startsWith('director-initial')) {
          console.log('[DIRECTOR_INITIAL_PUBLISH]', publishLog);
        }
        console.log('[HANDSHAKE_SENT]', publishLog);
        publishFullSessionState(key, normalized, { force: opts?.force ?? true });
        void persistDirectorLiveSessionFromShared(normalized, sessionOriginRef.current);
      } else {
        sessionLog('publishFullSessionState skipped — no broadcast snapshot', { code: key });
      }
    },
    [liveIsDirector, scheduleBroadcast]
  );

  const rememberDbRow = useCallback(
    (row: NonNullable<Awaited<ReturnType<typeof getLiveSessionByCode>>>) => {
      lastDbRowRef.current = row;
      return row;
    },
    []
  );

  const resolvePathFromRpcRow = useCallback(
    (
      code: string,
      rpcRow: NonNullable<Awaited<ReturnType<typeof getLiveSessionByCode>>>
    ): string | null => {
      const dbRecovery = enrichRecoveryForNavigation(mapLiveSessionRow(rpcRow));
      const path = resolveEmergencyFollowerPath(
        dbRecovery,
        code,
        resolveFollowerSongIdForNav
      );
      if (path) return path;
      if (rpcRow.list_id) {
        return `/setlist/${rpcRow.list_id}/live?index=${rpcRow.current_index ?? 0}`;
      }
      if (rpcRow.song_id) {
        return getSongPathById(rpcRow.song_id);
      }
      return null;
    },
    [resolveFollowerSongIdForNav]
  );

  const forceHomeFromOverlayEmergency = useCallback((source: string) => {
    followerAwaitingDirectorRef.current = false;
    awaitingFirstBroadcastRef.current = false;
    setFollowerAwaitingDirector(false);
    try {
      sessionStorage.setItem(
        'follower_sync_error',
        'No se pudo sincronizar con el director tras 10 segundos.'
      );
    } catch {
      /* ignore */
    }
    console.error('[EMERGENCY_NAV]', { source, path: '/', reason: 'overlay-10s-timeout' });
    window.location.replace('/?follower_sync_error=1');
  }, []);

  const rpcOverlayPollTick = useCallback(
    async (source: string): Promise<boolean> => {
      if (!liveIsFollower || !liveFollowerCode) return false;
      const code = normalizeSessionCode(liveFollowerCode);
      if (code.length < 4) return false;

      const rpcRow = await getLiveSessionByCode(code);
      if (!rpcRow) return false;

      rememberDbRow(rpcRow);
      const path = resolvePathFromRpcRow(code, rpcRow);
      const dbRecovery = enrichRecoveryForNavigation(mapLiveSessionRow(rpcRow));

      console.error('[EMERGENCY_RPC_IMMEDIATE]', {
        source,
        path,
        view_mode: dbRecovery.viewMode,
        list_id: dbRecovery.listId,
        song_id: dbRecovery.songId,
      });

      if (!path) {
        console.error('[EMERGENCY_NAV]', { source, result: 'no-path-from-row', dbRecovery });
        return false;
      }

      followerAwaitingDirectorRef.current = false;
      awaitingFirstBroadcastRef.current = false;
      setFollowerAwaitingDirector(false);
      window.location.replace(path);
      return true;
    },
    [liveIsFollower, liveFollowerCode, rememberDbRow, resolvePathFromRpcRow]
  );

  const resolveEmergencyPathFromRemote = useCallback(
    (remote: SharedSessionState | null): string | null => {
      if (!remote) return null;
      if (remote.viewMode === 'continuous' && remote.listId) {
        return `/setlist/${remote.listId}/live?index=${remote.currentIndex ?? 0}`;
      }
      if (
        (remote.viewMode === 'musician' || remote.viewMode === 'singer') &&
        remote.currentSongId
      ) {
        return getSongPathById(remote.currentSongId);
      }
      if (remote.currentSongId) return getSongPathById(remote.currentSongId);
      if (remote.listId) {
        return `/setlist/${remote.listId}/live?index=${remote.currentIndex ?? 0}`;
      }
      return null;
    },
    []
  );

  const tryExitFollowerAwaitingFromDb = useCallback(
    async (source: string) => {
      if (!liveIsFollower || !liveFollowerCode) return;
      if (!followerAwaitingDirectorRef.current) return;

      const code = normalizeSessionCode(liveFollowerCode);
      console.log('[OVERLAY_DIAG]', {
        source,
        followerAwaitingDirector: followerAwaitingDirectorRef.current,
        awaitingFirstBroadcast: awaitingFirstBroadcastRef.current,
        hasReceivedBroadcast: hasReceivedBroadcastRef.current,
        pathname: getJoinPathname(),
      });

      const escaped = await rpcOverlayPollTick(source);
      if (escaped) return;

      if (followerJoinPrecheckOkRef.current) {
        console.error('[RLS_BLOCKED]', {
          source,
          code,
          message: 'RPC returned null while join precheck passed',
        });
      }
      console.log('[OVERLAY_DIAG]', { source, result: 'rpc-miss' });
    },
    [liveIsFollower, liveFollowerCode, rpcOverlayPollTick]
  );

  const goHomeFromFollowerOverlay = useCallback(() => {
    try {
      sessionStorage.setItem(
        'follower_sync_error',
        'Volviste al inicio. No se pudo completar la sincronización con el director.'
      );
    } catch {
      /* ignore */
    }
    cancelFollowerConnection({ navigateTo: 'home', silent: true });
    forceHomeFromOverlayEmergency('go-home-overlay-button');
  }, [cancelFollowerConnection, forceHomeFromOverlayEmergency]);

  const debugFollowerDb = useCallback(async () => {
    const code = normalizeSessionCode(liveFollowerCode);
    console.log('[DEBUG_DB]', { phase: 'start', code, liveIsFollower });
    if (code.length < 4) {
      console.log('[DEBUG_DB]', { phase: 'done', error: 'invalid code' });
      return;
    }
    const escaped = await rpcOverlayPollTick('debug-db-button');
    console.log('[DEBUG_DB]', { phase: 'done', escaped });
  }, [liveFollowerCode, rpcOverlayPollTick]);

  const requestFollowerCurrentState = useCallback(() => {
    const code = normalizeSessionCode(liveFollowerCode);
    const channel = followerChannelRef.current;
    if (code.length < 4 || !channel) {
      joinDebugLog('JOIN_BLOCKED', 'requestFollowerCurrentState — no channel', { code });
      return;
    }
    joinDebugLog('JOIN_NAV', 'requestFollowerCurrentState manual', { code });
    logNavAttempt('dev-request', {
      view_mode: lastRemoteStateRef.current?.viewMode ?? null,
      list_id: lastRemoteStateRef.current?.listId ?? null,
      current_index: lastRemoteStateRef.current?.currentIndex ?? null,
    });
    void sendRequestCurrentState(channel, code);
    void tryExitFollowerAwaitingFromDb('dev-force');
  }, [liveFollowerCode, tryExitFollowerAwaitingFromDb]);

  const runAwaitingBroadcastFallback = useCallback(async () => {
    if (!liveIsFollower || !liveFollowerCode) return;
    if (!awaitingFirstBroadcastRef.current && !followerAwaitingDirectorRef.current) return;
    if (!readFollowDirector()) {
      setFollowerAwaitingDirector(false);
      awaitingFirstBroadcastRef.current = false;
      return;
    }

    const code = normalizeSessionCode(liveFollowerCode);
    console.log('[FIRST_BROADCAST_FALLBACK]', { code, afterMs: 2500 });

    const remote = lastRemoteStateRef.current;
    if (remote && (remote.viewMode || remote.listId || remote.currentSongId)) {
      awaitingFirstBroadcastRef.current = false;
      setFollowerAwaitingDirector(false);
      await navigateFollowerToMatchDirectorView(code, remote, {
        source: 'first-broadcast-fallback-remote',
        force: true,
        replace: true,
        navSource: 'fallback',
      });
      return;
    }

    const attemptDbNav = async (label: string): Promise<boolean> => {
      const dbRecovery = await queryLiveSessionForFollowerNav(code, {
        expectSessionExists: followerJoinPrecheckOkRef.current,
      });
      if (!dbRecovery) {
        console.log('[FIRST_BROADCAST_FALLBACK]', { code, label, db: 'miss' });
        return false;
      }
      awaitingFirstBroadcastRef.current = false;
      setFollowerAwaitingDirector(false);
      const enriched = enrichRecoveryForNavigation(dbRecovery);
      const ok = await navigateFollowerToMatchDirectorView(code, enriched, {
        source: `first-broadcast-fallback-db-${label}`,
        force: true,
        replace: true,
        navSource: 'db',
      });
      console.log('[FIRST_BROADCAST_FALLBACK]', { code, label, db: 'hit', navOk: ok });
      return ok;
    };

    if (await attemptDbNav('immediate')) return;

    await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));

    if (await attemptDbNav('1500ms')) return;

    joinDebugLog('JOIN_BLOCKED', 'fallback-db — no row after double query', { code });
  }, [liveIsFollower, liveFollowerCode, navigateFollowerToMatchDirectorView]);

  useEffect(() => {
    if (!followerAwaitingDirector || !liveIsFollower || !liveFollowerCode) return;
    const t = window.setTimeout(() => {
      void runAwaitingBroadcastFallback();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [
    followerAwaitingDirector,
    liveIsFollower,
    liveFollowerCode,
    runAwaitingBroadcastFallback,
  ]);

  useEffect(() => {
    if (!followerAwaitingDirector || !liveIsFollower || !liveFollowerCode) return;

    void rpcOverlayPollTick('rpc-poll-immediate');

    const rpcPollId = window.setInterval(() => {
      if (!followerAwaitingDirectorRef.current) return;
      void rpcOverlayPollTick('rpc-poll-1s');
    }, 1000);

    const stopPollId = window.setTimeout(() => {
      window.clearInterval(rpcPollId);
    }, 10000);

    const forceHomeId = window.setTimeout(() => {
      if (!followerAwaitingDirectorRef.current) return;
      void (async () => {
        const escaped = await rpcOverlayPollTick('rpc-poll-10s-final');
        if (escaped || !followerAwaitingDirectorRef.current) return;

        const remotePath = resolveEmergencyPathFromRemote(lastRemoteStateRef.current);
        if (remotePath) {
          followerAwaitingDirectorRef.current = false;
          setFollowerAwaitingDirector(false);
          window.location.replace(remotePath);
          return;
        }

        forceHomeFromOverlayEmergency('overlay-10s-force-home');
      })();
    }, 10000);

    return () => {
      window.clearInterval(rpcPollId);
      window.clearTimeout(stopPollId);
      window.clearTimeout(forceHomeId);
    };
  }, [
    followerAwaitingDirector,
    liveIsFollower,
    liveFollowerCode,
    rpcOverlayPollTick,
    resolveEmergencyPathFromRemote,
    forceHomeFromOverlayEmergency,
  ]);

  useEffect(() => {
    console.error('[LIVE_SESSION_CRITICAL]', {
      liveFollowerCode,
      followerAwaitingDirector,
      hasSessionInDB: !!lastDbRowRef.current,
    });
  }, []);

  useEffect(() => {
    if (!followerAwaitingDirector) return;
    void (async () => {
      const code = normalizeSessionCode(liveFollowerCode);
      if (code.length >= 4) {
        const row = await getLiveSessionByCode(code);
        if (row) rememberDbRow(row);
      }
      console.error('[LIVE_SESSION_CRITICAL]', {
        liveFollowerCode,
        followerAwaitingDirector,
        hasSessionInDB: !!lastDbRowRef.current,
      });
    })();
  }, [followerAwaitingDirector, liveFollowerCode, rememberDbRow]);

  useEffect(() => {
    if (!followerAwaitingDirector || !liveIsFollower) return;

    const warnId = window.setInterval(() => {
      const remote = lastRemoteStateRef.current;
      console.warn('[OVERLAY_STUCK_DIAG]', {
        liveFollowerCode,
        followerAwaitingDirector: followerAwaitingDirectorRef.current,
        awaitingFirstBroadcast: awaitingFirstBroadcastRef.current,
        hasReceivedBroadcast: hasReceivedBroadcastRef.current,
        followDirector: readFollowDirector(),
        pathname: getJoinPathname(),
        remoteViewMode: remote?.viewMode ?? null,
        remoteListId: remote?.listId ?? null,
        remoteSongId: remote?.currentSongId ?? null,
        remoteIndex: remote?.currentIndex ?? null,
        joinPrecheckOk: followerJoinPrecheckOkRef.current,
      });
    }, 3000);

    return () => window.clearInterval(warnId);
  }, [followerAwaitingDirector, liveIsFollower, liveFollowerCode]);

  const onFollowerRealtimeJoined = useCallback(
    (code: string) => {
      const normalized = normalizeSessionCode(code);
      void (async () => {
        const stillActive = await abortFollowerJoinIfSessionInactive(
          normalized,
          'onFollowerRealtimeJoined'
        );
        if (!stillActive) return;

        if (
          readFollowDirector() &&
          (followerAwaitingDirectorRef.current || awaitingFirstBroadcastRef.current)
        ) {
          const dbEarly = await queryLiveSessionForFollowerNav(normalized, {
            expectSessionExists: followerJoinPrecheckOkRef.current,
          });
          if (dbEarly) {
            awaitingFirstBroadcastRef.current = false;
            setFollowerAwaitingDirector(false);
            await navigateFollowerToMatchDirectorView(
              normalized,
              enrichRecoveryForNavigation(dbEarly),
              {
                source: 'realtime-subscribed-db',
                force: true,
                replace: true,
                navSource: 'db',
              }
            );
            return;
          }
        }

        const seq = reconnectSequenceIdRef.current;
        const pathname = getJoinPathname();
        const remote = lastRemoteStateRef.current;
        const recoverySequenceKey = `${normalized}|${seq}`;

      if (shouldDisableLegacyFollowPipeline('follower')) {
        joinDebugLog('JOIN_NAV', 'onFollowerRealtimeJoined — follow-v3 view sync', {
          code: normalized,
          hasRemote: !!remote?.currentSongId,
          viewMode: remote?.viewMode,
        });

        const remoteAgeMs =
          lastRemoteStateAtRef.current > 0
            ? Date.now() - lastRemoteStateAtRef.current
            : null;
        const skipRecovery = shouldSkipSubscribedRecovery({
          sessionCode: normalized,
          reconnectSequence: seq,
          replayHandledForSequence: replayHandledForSequenceRef.current,
          hasPageHandler: !!pageHandlersRef.current.onSharedSessionUpdate,
          lastRemoteStateAgeMs: remoteAgeMs,
          lastRemoteStateValid: !!remote?.currentSongId || !!remote?.listId,
          lastSubscribedKey: lastSubscribedKeyRef.current,
        });

        if (skipRecovery.skip && skipRecovery.reason) {
          realtimeSkipLog({
            reason: skipRecovery.reason,
            sessionCode: normalized,
            reconnectSequence: seq,
            extra: { remoteAgeMs, pathname, pipeline: 'follow-v3' },
          });
          lastSubscribedKeyRef.current = recoverySequenceKey;
          replayHandledForSequenceRef.current = seq;
          if (remote && readFollowDirector()) {
            syncForceContinuousIndexFromRemote(
              remote,
              `subscribed-skip-v3:${skipRecovery.reason}`
            );
          }
          return;
        }

        if (remote && readFollowDirector()) {
          void navigateFollowerToMatchDirectorView(normalized, remote, {
            source: 'v3-realtime-subscribed',
            force: false,
          });
        }
        lastSubscribedKeyRef.current = recoverySequenceKey;
        replayHandledForSequenceRef.current = seq;
        return;
      }

      if (!recoverySequenceKey || recoverySequenceKey === '|') {
        auditEventLog({
          source: 'SpectatorSessionContext',
          action: 'recovery-sequence-missing',
          sessionCode: code,
          extra: { seq, normalized },
        });
      }

      auditEventLog({
        source: 'SpectatorSessionContext',
        action: 'onFollowerRealtimeJoined',
        sessionCode: code,
        songId: remote?.currentSongId ?? null,
        remoteIndex: remote?.currentIndex ?? null,
        pathname,
        reconnectState: isReconnecting,
        liveSessionStatus: liveSessionStatusRef.current,
        extra: { reconnectSequenceId: seq, recoverySequenceKey },
      });
      joinDebugLog('JOIN_NAV', 'onFollowerRealtimeJoined', {
        code,
        pathname,
        pending: pendingFollowerNavRef.current?.source ?? null,
        hasRemote: !!remote?.currentSongId,
        reconnectSequenceId: seq,
      });
      joinSessionLog('session connected', { code, via: 'realtime-subscribed' });
      realtimeRecoveredLog({ sequenceId: seq, role: 'follower', code });

      const remoteAgeMs =
        lastRemoteStateAtRef.current > 0
          ? Date.now() - lastRemoteStateAtRef.current
          : null;
      const skipRecovery = shouldSkipSubscribedRecovery({
        sessionCode: normalized,
        reconnectSequence: seq,
        replayHandledForSequence: replayHandledForSequenceRef.current,
        hasPageHandler: !!pageHandlersRef.current.onSharedSessionUpdate,
        lastRemoteStateAgeMs: remoteAgeMs,
        lastRemoteStateValid: !!remote?.currentSongId,
        lastSubscribedKey: lastSubscribedKeyRef.current,
      });

      if (skipRecovery.skip && skipRecovery.reason) {
        realtimeSkipLog({
          reason: skipRecovery.reason,
          sessionCode: normalized,
          reconnectSequence: seq,
          extra: { remoteAgeMs, pathname },
        });
        lastSubscribedKeyRef.current = recoverySequenceKey;
        replayHandledForSequenceRef.current = seq;
        if (remote && isFollowerLivePageOwner()) {
          dispatchFollowerToPageHandler(remote, `subscribed-skip:${skipRecovery.reason}`);
        }
        return;
      }

      if (
        remote?.listId &&
        readFollowDirector() &&
        shouldRetainFollowerViewMode(pathname, remote.listId)
      ) {
        if (
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: true,
            songId: remote.currentSongId,
            remoteIndex: remote.currentIndex,
            listId: remote.listId,
            listSongIds: remote.listSongIds,
            joinSessionCode: normalized,
          })
        ) {
          lastRecoverySequenceKeyRef.current = recoverySequenceKey;
          replayHandledForSequenceRef.current = seq;
          lastSubscribedKeyRef.current = recoverySequenceKey;
          return;
        }
        followLiveLockLog({
          blocked: true,
          retainedLiveMode: true,
          attemptedNavigation: getSongPathById(remote.currentSongId ?? ''),
          source: 'realtime-subscribed',
          pathname,
        });
        dispatchFollowerToPageHandler(remote, 'realtime-subscribed:retain-live');
        lastRecoverySequenceKeyRef.current = recoverySequenceKey;
        replayHandledForSequenceRef.current = seq;
        lastSubscribedKeyRef.current = recoverySequenceKey;
        return;
      }

      if (isFollowerLivePageOwner() && remote?.currentSongId) {
        dispatchFollowerToPageHandler(remote, 'realtime-subscribed:live-owner');
        lastRecoverySequenceKeyRef.current = recoverySequenceKey;
        replayHandledForSequenceRef.current = seq;
        lastSubscribedKeyRef.current = recoverySequenceKey;
        return;
      }

      if (shouldSkipReconnectReplay(seq, replayHandledForSequenceRef.current)) {
        followIgnoreRecoveryLog({
          reason: 'reconnect duplicate replay',
          sequenceId: seq,
          code,
        });
        lastSubscribedKeyRef.current = recoverySequenceKey;
        return;
      }

      if (lastRecoverySequenceKeyRef.current === recoverySequenceKey) {
        followRecoveryBlockedLog({
          reason: 'same reconnect sequence',
          code: normalized,
          sequenceId: seq,
        });
        auditEventLog({
          source: 'SpectatorSessionContext',
          action: 'FOLLOW_RECOVERY_BLOCKED',
          sessionCode: normalized,
          extra: { reason: 'same reconnect sequence', sequenceId: seq },
        });
        lastSubscribedKeyRef.current = recoverySequenceKey;
        return;
      }

      if (remote?.currentSongId) {
        const recovery = enrichRecoveryForNavigation(
          sharedStateToRecovery(normalized, remote, sessionOriginRef.current)
        );
        const navKey = buildJoinNavigationKey(
          normalized,
          recovery,
          resolveFollowerTargetFromDirectorState(getJoinPathname(), recovery)
        );
        if (navKey && lastJoinNavigationKeyRef.current === navKey && !pendingFollowerNavRef.current) {
          lastRecoverySequenceKeyRef.current = recoverySequenceKey;
          replayHandledForSequenceRef.current = seq;
          lastSubscribedKeyRef.current = recoverySequenceKey;
          followIgnoreRecoveryLog({
            reason: 'reconnect duplicate replay',
            sequenceId: seq,
            navKey,
          });
          return;
        }
        void navigateFollowerToDirectorState(normalized, {
          source: 'realtime-subscribed-remote',
          recovery,
          recoverySource: 'shared-session',
          force: true,
        }).then(() => {
          lastRecoverySequenceKeyRef.current = recoverySequenceKey;
          replayHandledForSequenceRef.current = seq;
          lastSubscribedKeyRef.current = recoverySequenceKey;
        });
        return;
      }

      void navigateFollowerToDirectorState(normalized, {
        source: 'realtime-subscribed',
        force: true,
      }).then(() => {
        lastRecoverySequenceKeyRef.current = recoverySequenceKey;
        replayHandledForSequenceRef.current = seq;
        lastSubscribedKeyRef.current = recoverySequenceKey;
      });
      })();
    },
    [
      abortFollowerJoinIfSessionInactive,
      navigate,
      navigateFollowerToDirectorState,
      navigateFollowerToMatchDirectorView,
      isFollowerLivePageOwner,
      dispatchFollowerToPageHandler,
      syncForceContinuousIndexFromRemote,
      isReconnecting,
    ]
  );

  /** Re-route follower when director viewMode / list changes (V3 + legacy).
   * Index/song changes while already on matching /live only sync index — no remount. */
  useEffect(() => {
    if (!liveIsFollower || !liveFollowerCode || !readFollowDirector()) return;

    const remote = lastRemoteStateRef.current;
    if (!remote?.viewMode) return;

    const routeKey = `${remote.viewMode}|${remote.listId ?? ''}`;
    const contentKey = [
      remote.currentIndex ?? '',
      remote.currentSongId ?? '',
      remote.genderShift ?? '',
    ].join('|');
    const signature = `${routeKey}|${contentKey}`;

    if (lastDirectorViewSyncSignatureRef.current === signature) return;

    const prevSignature = lastDirectorViewSyncSignatureRef.current;
    lastDirectorViewSyncSignatureRef.current = signature;
    const prevRouteKey = prevSignature
      ? prevSignature.split('|').slice(0, 2).join('|')
      : null;
    const routeChanged = prevRouteKey !== routeKey;

    followViewmodeLog({
      reason: 'director-view-sync-effect',
      viewMode: remote.viewMode,
      currentIndex: remote.currentIndex,
      listId: remote.listId,
      songId: remote.currentSongId,
      routeChanged,
    });

    syncForceContinuousIndexFromRemote(remote, 'director-view-sync-effect');

    const pathname = getJoinPathname();
    const onMatchingLive =
      remote.viewMode === 'continuous' &&
      !!remote.listId &&
      isFollowerInContinuousMode(pathname, remote.listId);

    if (onMatchingLive && !routeChanged) {
      return;
    }

    void navigateFollowerToMatchDirectorView(liveFollowerCode, remote, {
      source: 'director-view-sync-effect',
      force: routeChanged,
    });
  }, [
    followerRemoteNavTick,
    liveIsFollower,
    liveFollowerCode,
    navigateFollowerToMatchDirectorView,
    syncForceContinuousIndexFromRemote,
  ]);

  /** Follower on /live: re-apply remote current_index when broadcast changes (V3-safe). */
  useEffect(() => {
    if (!liveIsFollower || !liveFollowerCode || !readFollowDirector()) return;
    const remote = lastRemoteStateRef.current;
    if (!remote) return;
    syncForceContinuousIndexFromRemote(remote, 'continuous-index-effect');
  }, [followerRemoteNavTick, liveIsFollower, liveFollowerCode, syncForceContinuousIndexFromRemote]);

  /** Poll DB while awaiting overlay — exit if director closed session. */
  useEffect(() => {
    if (!liveIsFollower || !liveFollowerCode || !followerAwaitingDirector) return;
    const code = liveFollowerCode;
    const tick = () => {
      void abortFollowerJoinIfSessionInactive(code, 'awaiting-director-poll');
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [
    liveIsFollower,
    liveFollowerCode,
    followerAwaitingDirector,
    abortFollowerJoinIfSessionInactive,
  ]);

  /** Safety: auto-cancel if director snapshot never arrives. */
  useEffect(() => {
    if (!followerAwaitingDirector || !liveIsFollower || !liveFollowerCode) return;

    const code = liveFollowerCode;
    const timeoutId = window.setTimeout(() => {
      sessionProviderLog('awaiting safety timeout — auto cancel', {
        code,
        timeoutMs: FOLLOWER_AWAITING_SAFETY_TIMEOUT_MS,
      });
      cancelFollowerConnection({
        message: 'No se recibió respuesta del director. Conexión cancelada.',
      });
    }, FOLLOWER_AWAITING_SAFETY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    followerAwaitingDirector,
    liveIsFollower,
    liveFollowerCode,
    cancelFollowerConnection,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    installDebugLiveSession((): DebugLiveSessionSnapshot => {
      const remote = lastRemoteStateRef.current;
      return {
        pathname: getJoinPathname(),
        connection: connection
          ? { sessionCode: connection.sessionCode, role: connection.role }
          : null,
        liveIsDirector,
        liveSessionCode,
        liveIsFollower,
        liveFollowerCode,
        directorChannelJoin,
        directorChannelState: directorChannelRef.current?.state ?? null,
        followerChannelState: followerChannelRef.current?.state ?? null,
        remote: remote
          ? {
              viewMode: remote.viewMode,
              resolvedViewMode: resolveSharedViewMode(
                remote.viewMode,
                remote.listId ?? null,
                remote.listSongIds ?? null
              ),
              currentIndex:
                typeof remote.currentIndex === 'number' ? remote.currentIndex : null,
              listId: remote.listId ?? null,
              currentSongId: remote.currentSongId ?? null,
              genderShift: remote.genderShift ?? null,
              sharedSectionAnchor: remote.sharedSectionAnchor ?? null,
              updatedAt: remote.updatedAt ?? null,
            }
          : null,
        liveSessionStatus,
        followDirector: readFollowDirector(),
      };
    });
  }, []);

  useEffect(() => {
    if (!liveIsFollower || !liveFollowerCode) return;
    if (shouldDisableLegacyFollowPipeline('follower')) return;
    const pending = pendingFollowerNavRef.current;
    if (!pending || pending.code !== liveFollowerCode) return;
    if (!lastRemoteStateRef.current?.currentSongId) return;

    joinDebugLog('JOIN_NAV', 'pending join navigation retry on remote state', {
      source: pending.source,
      songId: lastRemoteStateRef.current.currentSongId,
    });
    void navigateFollowerToDirectorState(pending.code, {
      source: `${pending.source}-pending-retry`,
      recovery: sharedStateToRecovery(
        pending.code,
        lastRemoteStateRef.current,
        sessionOriginRef.current
      ),
      force: true,
    });
  }, [liveIsFollower, liveFollowerCode, followerRemoteNavTick, navigateFollowerToDirectorState]);

  const channelContextValue = useMemo(
    () => ({
      liveIsDirector,
      liveSessionCode,
      liveIsFollower,
      liveFollowerCode,
      connection,
      directorChannelJoin,
      connectedCount,
      sessionOriginRef,
      newSessionRef,
      isHydratingRef,
      broadcastStateRef,
      pageHandlersRef,
      directorChannelRef,
      followerChannelRef,
      lastRemoteStateRef,
      followV3HandlerRef,
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
      setIsReconnecting: setReconnectingWithStatus,
      onDirectorHeartbeat,
      dispatchSharedSessionUpdate,
      onFollowerRealtimeJoined,
      onRealtimeSubscribed,
      completeFollowerSessionEndedByDirector,
      onFollowerChannelLost,
      bumpReconnectSequence,
      markRealtimeSubscriptionStable,
      handleRealtimeChannelStatus,
      publishFullSessionStateIfDirector,
      syncForceContinuousIndexFromRemoteRef,
    }),
    [
      liveIsDirector,
      liveSessionCode,
      liveIsFollower,
      liveFollowerCode,
      connection,
      directorChannelJoin,
      connectedCount,
      scheduleBroadcast,
      failDirectorStart,
      setReconnectingWithStatus,
      onDirectorHeartbeat,
      dispatchSharedSessionUpdate,
      onFollowerRealtimeJoined,
      onRealtimeSubscribed,
      completeFollowerSessionEndedByDirector,
      onFollowerChannelLost,
      bumpReconnectSequence,
      markRealtimeSubscriptionStable,
      handleRealtimeChannelStatus,
      publishFullSessionStateIfDirector,
      syncForceContinuousIndexFromRemoteRef,
    ]
  );

  const volverASesion = useCallback(async () => {
    await withJoinInFlight(
      joinInFlightRef,
      'volverASesion',
      liveSessionStatusRef.current,
      async () => {
    transitionSessionStatus('joining', 'volverASesion');
    sessionProviderLog('reconnect pressed', {
      role: liveIsDirector ? 'director' : 'follower',
    });
    setBannerDismissed(false);
    setPassiveListenMode(false);
    setDirectorAwayFromScope(false);
    clearSpectatorSessionOptOut();

    const code = normalizeSessionCode(
      liveFollowerCode ||
        liveSessionCode ||
        activeJoinCode ||
        detected?.code ||
        readPendingJoin() ||
        ''
    );
    if (code.length < 4) return;

    let recovery = detected?.recovery ?? null;
    let recoverySource: FollowerRecoverySource = recovery ? 'route' : 'fallback';
    if (!recovery) {
      const dbRecovery = await resolveLiveSessionForReconnectWithRetry(code);
      const resolved = resolveFollowerRecovery({
        code,
        remote: lastRemoteStateRef.current,
        dbRecovery,
        sessionOrigin: sessionOriginRef.current,
      });
      recovery = resolved.recovery;
      recoverySource = resolved.source;
    }
    if (!recovery && lastRemoteStateRef.current?.currentSongId) {
      recovery = sharedStateToRecovery(code, lastRemoteStateRef.current, sessionOriginRef.current);
      recoverySource = 'shared-session';
    }

    if (detected?.role === 'director' || liveIsDirector) {
      if (recovery) {
        const origin = inferSessionOriginFromRecovery(recovery);
        beginDirectorSession({ code, origin, isNew: false });
        setDetected(null);
        navigateToRecoveryTarget(code, recovery, 'director', { source: 'manual' });
      }
      return;
    }

    const origin = recovery ? inferSessionOriginFromRecovery(recovery) : sessionOriginRef.current;
    if (origin) sessionOriginRef.current = origin;
    const active = await abortFollowerJoinIfSessionInactive(code, 'volverASesion');
    if (!active) return;
    beginFollowerSession(code);
    setActiveJoinCode(code);
    setSessionConnected(true);
    setDetected(null);
    sessionLog('follower rejoin', { code });
    await navigateFollowerToDirectorState(code, {
      source: 'volverASesion',
      recovery,
      recoverySource,
      force: true,
    });
      }
    );
  }, [
    detected,
    liveIsDirector,
    liveIsFollower,
    liveFollowerCode,
    liveSessionCode,
    activeJoinCode,
    navigateFollowerToDirectorState,
    beginFollowerSession,
    beginDirectorSession,
    transitionSessionStatus,
  ]);

  const reunirseASesion = volverASesion;

  const ignorarSesion = useCallback(() => {
    if (liveIsFollower) {
      sessionLog('passive mode enabled', { ignored: true });
      transitionSessionStatus('passive', 'ignorarSesion follower explore');
      setPassiveListenMode(true);
      writeFollowDirector(false);
      syncPersistence({ passiveMode: true, followDirector: false });
      return;
    }
    const code =
      liveSessionCode || activeJoinCode || detected?.code || liveFollowerCode || '';
    if (code.length >= 4) writeDismissedSessionBanner(code);
    setBannerDismissed(true);
    sessionLog('banner dismissed');
  }, [
    liveIsFollower,
    syncPersistence,
    liveSessionCode,
    activeJoinCode,
    detected?.code,
    liveFollowerCode,
    transitionSessionStatus,
  ]);

  const redirigirSesion = useCallback(async () => {
    const page = pageContextRef.current;
    const code = liveSessionCode;
    if (!liveIsDirector || !code || !page.songId) {
      toast.error('Abre una canción o lista para redirigir la sesión');
      return;
    }
    const bs = broadcastStateRef.current;
    try {
      directorMoveSessionLog({
        target: {
          songId: page.songId,
          listId: page.listId,
          viewMode: bs.viewMode,
          scope: sessionOriginRef.current,
        },
      });
      await redirectDirectorSession({
        code,
        songId: page.songId,
        listId: page.listId,
        listName: page.listName,
        listSongIds: page.listSongIds,
        semitones: bs.semitones,
        currentKey: bs.currentKey,
        bpm: bs.bpm,
        viewMode: bs.viewMode,
        genderShift: bs.genderShift,
        currentIndex: bs.currentIndex,
      });
      setDirectorAwayFromScope(false);
      setBannerDismissed(false);
      syncPersistence({ directorAwayFromScope: false, lastSongId: page.songId, lastSetlistId: page.listId });
      pageHandlersRef.current.onManualRedirect?.();
      sessionLog('manual redirect', { code, songId: page.songId });
      toast.success('Asistentes redirigidos');
    } catch {
      toast.error('No se pudo redirigir la sesión');
    }
  }, [liveIsDirector, liveSessionCode, broadcastStateRef, syncPersistence]);

  const continuarSesionDirector = useCallback(() => {
    if (liveIsDirector || directorAwayFromScope) {
      void volverASesion();
      return;
    }
    if (!detected || detected.role !== 'director') return;

    const { code, recovery } = detected;
    const origin = inferSessionOriginFromRecovery(recovery);
    beginDirectorSession({ code, origin, isNew: false });
    void activateLiveSessionRow(code);
    setDetected(null);

    sessionLog('director continue', { code });
    navigateToRecoveryTarget(code, recovery, 'director', { source: 'manual' });
  }, [
    liveIsDirector,
    directorAwayFromScope,
    volverASesion,
    detected,
    navigateToRecoveryTarget,
    beginDirectorSession,
  ]);

  const cerrarSesionDirector = useCallback(async () => {
    if (liveIsDirector && liveSessionCode) {
      try {
        await endDirectorSession();
        setDetected(null);
        setBannerDismissed(false);
        sessionLog('director session closed', { code: liveSessionCode });
        toast.success('Sesión cerrada');
        void refreshDetection();
      } catch {
        toast.error('No se pudo cerrar la sesión');
      }
      return;
    }
    if (!detected || detected.role !== 'director') return;

    const code = detected.code;
    try {
      await terminateDirectorSession(code);
      setDetected(null);
      setSessionConnected(false);
      setActiveJoinCode(null);
      setBannerDismissed(false);
      sessionLog('director session closed', { code });
      toast.success('Sesión cerrada');
      void refreshDetection();
    } catch {
      toast.error('No se pudo cerrar la sesión');
    }
  }, [liveIsDirector, liveSessionCode, endDirectorSession, detected, refreshDetection]);

  const salirDeSesion = useCallback(() => {
    transitionSessionStatus('ended', 'salirDeSesion');
    markSpectatorSessionOptOut();
    dispatchSpectatorSessionLeave();
    leaveFollowerSession();
    setDetected(null);
    setBannerDismissed(false);
    clearDismissedSessionBanner();
    sessionLog('follower hard leave');
    toast.success('Has salido de la sesión del director');
  }, [leaveFollowerSession, transitionSessionStatus]);

  const markExplicitJoin = useCallback(
    (code: string) => {
      if (code.length < 4) return;
      transitionSessionStatus('joining', 'markExplicitJoin');
      clearSpectatorSessionOptOut();
      const normalized = normalizeSessionCode(code);
      writePendingJoin(normalized);
      setActiveJoinCode(normalized);
      setSessionConnected(true);
      clearDismissedSessionBanner();
      setBannerDismissed(false);
      setPassiveListenMode(!readFollowDirector());
      setDetected(null);
      pendingFollowerNavRef.current = { code: normalized, source: 'markExplicitJoin' };
      joinDebugLog('JOIN_NAV', 'markExplicitJoin', {
        code: normalized,
        pathname: getJoinPathname(),
      });
      beginFollowerSession(normalized, { enableAwaitingOverlay: true });
      sessionLog('follower explicit join', { code: normalized });
    },
    [beginFollowerSession, transitionSessionStatus]
  );

  const resolveActiveLiveSessionCode = useCallback((): string | null => {
    const raw =
      connection?.sessionCode ??
      (liveIsFollower ? liveFollowerCode : '') ??
      (liveIsDirector ? liveSessionCode : '') ??
      activeJoinCode ??
      '';
    const normalized = normalizeSessionCode(raw);
    return normalized.length >= 4 ? normalized : null;
  }, [connection?.sessionCode, liveIsFollower, liveFollowerCode, liveIsDirector, liveSessionCode, activeJoinCode]);

  const isInActiveLiveSession = useCallback((): boolean => {
    return isJoinBlockedByStatus(liveSessionStatusRef.current);
  }, []);

  const executeJoinWithCode = useCallback(
    async (normalized: string, opts?: { skipSessionRecheck?: boolean }) => {
      if (!opts?.skipSessionRecheck) {
        const active = await abortFollowerJoinIfSessionInactive(normalized, 'executeJoinWithCode');
        if (!active) {
          setFollowerAwaitingDirector(false);
          return false;
        }
      }

      const result = await withJoinInFlight(
        joinInFlightRef,
        'joinWithCode',
        liveSessionStatusRef.current,
        async () => {
          markExplicitJoin(normalized);

          const navigated = await navigateFollowerToDirectorState(normalized, {
            source: 'joinWithCode',
            force: true,
          });

          joinDebugLog('JOIN_NAV', 'joinWithCode finished', {
            code: normalized,
            navigated,
            pathnameAfter: getJoinPathname(),
          });

          if (!navigated) {
            joinDebugLog('JOIN_BLOCKED', 'joinWithCode — navigation deferred', {
              reason: 'awaiting live_sessions or broadcast',
              pending: pendingFollowerNavRef.current?.source ?? null,
            });
          }
          return true;
        }
      );
      return result ?? false;
    },
    [markExplicitJoin, navigateFollowerToDirectorState, abortFollowerJoinIfSessionInactive]
  );

  const leaveCurrentSessionForSwitch = useCallback(async () => {
    if (liveIsDirector && liveSessionCode.length >= 4) {
      await endDirectorSession({ silent: true });
      setDetected(null);
      setSessionConnected(false);
      setActiveJoinCode(null);
      setBannerDismissed(false);
      clearDismissedSessionBanner();
      return;
    }
    markSpectatorSessionOptOut();
    dispatchSpectatorSessionLeave();
    leaveFollowerSession();
    setDetected(null);
    setBannerDismissed(false);
    clearDismissedSessionBanner();
  }, [liveIsDirector, liveSessionCode, endDirectorSession, leaveFollowerSession]);

  const closeJoinConflict = useCallback(() => {
    setJoinConflictOpen(false);
    setJoinConflictCurrentCode(null);
    setJoinConflictTargetCode(null);
    pendingJoinCodeRef.current = null;
  }, []);

  const confirmLeaveSessionAndJoin = useCallback(async () => {
    const target = pendingJoinCodeRef.current;
    closeJoinConflict();
    if (!target || target.length < 4) return;
    await leaveCurrentSessionForSwitch();
    joinDebugLog('JOIN_NAV', 'joinWithCode after leave current', { code: target });
    await executeJoinWithCode(target);
  }, [closeJoinConflict, leaveCurrentSessionForSwitch, executeJoinWithCode]);

  const joinWithCode = useCallback(
    async (code: string): Promise<JoinWithCodeResult> => {
      const normalized = normalizeSessionCode(code);
      joinDebugLog('JOIN_NAV', 'joinWithCode start', { code: normalized, pathname: getJoinPathname() });
      if (normalized.length < 4) return 'invalid';

      const statusNow = liveSessionStatusRef.current;
      const currentCode = resolveActiveLiveSessionCode();

      if (isInActiveLiveSession() && currentCode && currentCode !== normalized) {
        sessionGuardLog({
          action: 'join',
          allowed: false,
          status: statusNow,
          reason: 'already in live session — conflict modal',
        });
        pendingJoinCodeRef.current = normalized;
        setJoinConflictCurrentCode(currentCode);
        setJoinConflictTargetCode(normalized);
        setJoinConflictOpen(true);
        joinDebugLog('JOIN_BLOCKED', 'already in live session — conflict modal', {
          current: currentCode,
          target: normalized,
          status: statusNow,
        });
        return 'conflict';
      }

      const precheck = await querySessionActive(normalized);
      console.log('[JOIN_WITH_CODE]', { code: normalized, precheck });
      followerJoinPrecheckOkRef.current = precheck.active;
      if (!precheck.active) {
        followerJoinPrecheckOkRef.current = false;
        setFollowerAwaitingDirector(false);
        sessionGuardLog({
          action: 'join',
          allowed: false,
          status: statusNow,
          reason: `session ${precheck.reason}`,
        });
        toast.error(sessionJoinBlockedMessage(precheck.reason));
        return precheck.reason;
      }

      sessionGuardLog({
        action: 'join',
        allowed: true,
        status: statusNow,
        reason: 'joinWithCode proceed',
      });
      const executed = await executeJoinWithCode(normalized, { skipSessionRecheck: true });
      if (executed === undefined) return 'busy';
      if (executed === false) {
        joinDebugLog('JOIN_BLOCKED', 'joinWithCode execute failed after active precheck', {
          code: normalized,
        });
        return 'query_error';
      }
      return true;
    },
    [
      resolveActiveLiveSessionCode,
      isInActiveLiveSession,
      executeJoinWithCode,
    ]
  );

  const markDirectorSessionConnected = useCallback(
    (code: string) => {
      beginDirectorSession({
        code,
        origin: sessionOriginRef.current,
        isNew: false,
      });
      void activateLiveSessionRow(code);
    },
    [beginDirectorSession]
  );

  const hasActiveDirectorSession = useCallback(async () => {
    const active = await fetchActiveDirectorSession();
    return !!active;
  }, []);

  const requestDirectorSessionStart = useCallback(async (onStart: () => void) => {
    const auth = await resolveAuthenticatedDirector();
    if (!auth.ok) {
      toast.error('Debes iniciar sesión para crear una sesión en vivo');
      navigate('/login');
      return;
    }

    if (!liveIsDirector || !liveSessionCode) {
      await deactivateAllMyPreviousSessions();
    } else {
      await deactivateAllMyPreviousSessions(liveSessionCode);
    }

    const existing = await fetchActiveDirectorSession();
    if (!existing) {
      onStart();
      return;
    }

    if (liveIsDirector && liveSessionCode === existing.code) {
      onStart();
      return;
    }

    setDirectorConflict(existing);
    setConflictOnStart(() => onStart);
    setDirectorConflictOpen(true);
    sessionLog('blocked duplicate director session start', { code: existing.code });
  }, [liveIsDirector, liveSessionCode, navigate]);

  const closeDirectorConflict = useCallback(() => {
    setDirectorConflictOpen(false);
    setDirectorConflict(null);
    setConflictOnStart(null);
  }, []);

  const continuarSesionFromConflict = useCallback(() => {
    if (!directorConflict) return;
    const { code, recovery } = directorConflict;
    closeDirectorConflict();
    const origin = inferSessionOriginFromRecovery(recovery);
    beginDirectorSession({ code, origin, isNew: false });
    void activateLiveSessionRow(code);
    setDetected(null);
    toast.success(`Continuando sesión ${code}`);
    navigateToRecoveryTarget(code, recovery, 'director', { source: 'manual' });
  }, [directorConflict, closeDirectorConflict, navigateToRecoveryTarget, beginDirectorSession]);

  const redirectSessionHere = useCallback(
    async (target: PageSessionContext & { listName?: string }) => {
      if (!target.songId) return;
      const director = await fetchActiveDirectorSession();
      if (!director) {
        toast.error('No hay sesión activa para redirigir');
        return;
      }
      try {
        await redirectDirectorSession({
          code: director.code,
          songId: target.songId,
          listId: target.listId,
          listSongIds: target.listSongIds,
          listName: target.listName,
          semitones: director.recovery.semitones,
          currentKey: director.recovery.currentKey ?? undefined,
          bpm: director.recovery.bpm,
          viewMode: director.recovery.viewMode,
          currentIndex:
            target.listSongIds?.indexOf(target.songId) ??
            director.recovery.currentIndex,
        });
        setActiveJoinCode(director.code);
        setSessionConnected(true);
        setDetected(null);
        sessionLog('director redirect session', { code: director.code, target });
        toast.success('Sesión redirigida aquí');
        void refreshDetection();
      } catch {
        toast.error('No se pudo redirigir la sesión');
      }
    },
    [refreshDetection]
  );

  const cerrarSesionFromConflict = useCallback(async () => {
    if (!directorConflict) return;
    const code = directorConflict.code;
    const pendingStart = conflictOnStart;
    try {
      await terminateDirectorSession(code);
      setDetected(null);
      setSessionConnected(false);
      setActiveJoinCode(null);
      setBannerDismissed(false);
      closeDirectorConflict();
      toast.success('Sesión cerrada');
      void refreshDetection();
      if (pendingStart) pendingStart();
    } catch {
      toast.error('No se pudo cerrar la sesión');
    }
  }, [directorConflict, conflictOnStart, closeDirectorConflict, refreshDetection]);

  const sessionCodeDisplay =
    liveFollowerCode ||
    liveSessionCode ||
    activeJoinCode ||
    detected?.code ||
    null;

  const hasActiveSession =
    (!!liveSessionCode && liveIsDirector) || (!!liveFollowerCode && liveIsFollower) || !!detected;

  const lastBannerCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const code = sessionCodeDisplay;
    if (!code) {
      lastBannerCodeRef.current = null;
      return;
    }
    const normalized = code.trim().toUpperCase();
    if (lastBannerCodeRef.current && lastBannerCodeRef.current !== normalized) {
      clearDismissedSessionBanner();
      setBannerDismissed(false);
      sessionBannerLog('restored active session', { code: normalized, reason: 'code changed' });
    }
    lastBannerCodeRef.current = normalized;

    if (isSessionBannerDismissedForCode(normalized)) {
      setBannerDismissed(true);
    } else if (hasActiveSession) {
      setBannerDismissed(false);
      sessionBannerLog('restored active session', { code: normalized });
    }
  }, [sessionCodeDisplay, hasActiveSession]);

  const directorSharedViewMode = useMemo((): ViewMode | null => {
    return (
      lastRemoteStateRef.current?.viewMode ?? detected?.recovery?.viewMode ?? null
    );
  }, [detected, followerRemoteNavTick]);

  const directorSharedListId = useMemo((): string | null => {
    return lastRemoteStateRef.current?.listId ?? detected?.recovery?.listId ?? null;
  }, [detected, followerRemoteNavTick]);

  const showAvailableBanner =
    liveSessionStatus === LIVE_SESSION_RECOVERY_BANNER_STATUS &&
    !!sessionCodeDisplay &&
    !bannerDismissed &&
    !isSessionBannerDismissedForCode(sessionCodeDisplay);

  const lastSessionUiLogRef = useRef<string>('');
  useEffect(() => {
    const reason =
      liveSessionStatus !== LIVE_SESSION_RECOVERY_BANNER_STATUS
        ? 'status not detected'
        : !sessionCodeDisplay
          ? 'no session code'
          : bannerDismissed
            ? 'banner dismissed'
            : isSessionBannerDismissedForCode(sessionCodeDisplay)
              ? 'code dismissed in storage'
              : 'recovery banner visible';
    const key = `${liveSessionStatus}|${showAvailableBanner}|${reason}`;
    if (lastSessionUiLogRef.current === key) return;
    lastSessionUiLogRef.current = key;
    sessionUiLog({
      status: liveSessionStatus,
      bannerVisible: showAvailableBanner,
      reason,
    });
    if (
      hasActiveSession &&
      !showAvailableBanner &&
      liveSessionStatus !== 'detected'
    ) {
      sessionBannerLog('hidden because status not detected', { status: liveSessionStatus });
    }
  }, [
    liveSessionStatus,
    showAvailableBanner,
    sessionCodeDisplay,
    bannerDismissed,
    hasActiveSession,
  ]);

  const detectedOriginLabel = (() => {
    if (detected) {
      const origin = inferSessionOriginFromRecovery(detected.recovery);
      return origin ? sessionOriginLabel(origin) : null;
    }
    if (passiveListenMode && lastRemoteStateRef.current) {
      const remote = lastRemoteStateRef.current;
      const origin = remote.listId
        ? {
            type: 'setlist' as const,
            listId: remote.listId,
            songId: remote.currentSongId ?? undefined,
          }
        : remote.currentSongId
          ? { type: 'song' as const, songId: remote.currentSongId }
          : null;
      return origin ? sessionOriginLabel(origin) : null;
    }
    return sessionOriginRef.current ? sessionOriginLabel(sessionOriginRef.current) : null;
  })();

  const value = useMemo(
    (): SpectatorSessionContextValue => ({
      sessionDetected: !!detected,
      sessionConnected,
      detectedCode: detected?.code ?? null,
      detectedRecovery: detected?.recovery ?? null,
      detectedRole: detected?.role ?? null,
      bannerDismissed,
      activeJoinCode,
      showAvailableBanner,
      dismissBanner: ignorarSesion,
      reunirseASesion,
      volverASesion,
      ignorarSesion,
      redirigirSesion,
      passiveListenMode,
      directorAwayFromScope,
      directorDisconnected,
      isReconnecting,
      isReconnectingUiVisible,
      directorSharedViewMode,
      directorSharedListId,
      liveSessionStatus,
      sessionCodeDisplay,
      continuarSesionDirector,
      cerrarSesionDirector,
      salirDeSesion,
      markExplicitJoin,
      markDirectorSessionConnected,
      refreshDetection,
      hasActiveDirectorSession,
      requestDirectorSessionStart,
      directorConflictOpen,
      directorConflictCode: directorConflict?.code ?? null,
      closeDirectorConflict,
      continuarSesionFromConflict,
      cerrarSesionFromConflict,
      joinConflictOpen,
      joinConflictCurrentCode,
      joinConflictTargetCode,
      closeJoinConflict,
      confirmLeaveSessionAndJoin,
      redirectSessionHere,
      sessionOriginLabel: detectedOriginLabel,
      connection,
      liveIsDirector,
      liveSessionCode,
      liveIsFollower,
      liveFollowerCode,
      followerAwaitingDirector,
      checkSessionExists,
      cancelFollowerConnection,
      directorChannelJoin,
      connectedCount,
      beginDirectorSession,
      endDirectorSession,
      beginFollowerSession,
      leaveFollowerSession,
      joinWithCode,
      setFollowDirectorPreference,
      requestFollowerCurrentState,
      debugFollowerDb,
      goHomeFromFollowerOverlay,
      registerPageHandlers,
      updateBroadcastState,
      scheduleBroadcast,
      publishSharedSessionIfDirector,
      publishFullSessionStateIfDirector,
      reportPageContext,
    }),
    [
      detected,
      sessionConnected,
      bannerDismissed,
      activeJoinCode,
      showAvailableBanner,
      ignorarSesion,
      redirigirSesion,
      reunirseASesion,
      volverASesion,
      passiveListenMode,
      directorAwayFromScope,
      directorDisconnected,
      isReconnecting,
      isReconnectingUiVisible,
      directorSharedViewMode,
      directorSharedListId,
      liveSessionStatus,
      sessionCodeDisplay,
      continuarSesionDirector,
      cerrarSesionDirector,
      salirDeSesion,
      markExplicitJoin,
      markDirectorSessionConnected,
      refreshDetection,
      hasActiveDirectorSession,
      requestDirectorSessionStart,
      directorConflictOpen,
      directorConflict,
      followerRemoteNavTick,
      closeDirectorConflict,
      continuarSesionFromConflict,
      cerrarSesionFromConflict,
      joinConflictOpen,
      joinConflictCurrentCode,
      joinConflictTargetCode,
      closeJoinConflict,
      confirmLeaveSessionAndJoin,
      redirectSessionHere,
      detectedOriginLabel,
      connection,
      liveIsDirector,
      liveSessionCode,
      liveIsFollower,
      liveFollowerCode,
      followerAwaitingDirector,
      checkSessionExists,
      cancelFollowerConnection,
      directorChannelJoin,
      connectedCount,
      beginDirectorSession,
      endDirectorSession,
      beginFollowerSession,
      leaveFollowerSession,
      joinWithCode,
      setFollowDirectorPreference,
      requestFollowerCurrentState,
      debugFollowerDb,
      goHomeFromFollowerOverlay,
      registerPageHandlers,
      updateBroadcastState,
      scheduleBroadcast,
      publishSharedSessionIfDirector,
      publishFullSessionStateIfDirector,
      reportPageContext,
      directorAwayFromScope,
    ]
  );

  return (
    <SpectatorSessionContext.Provider value={value}>
      <LiveSessionChannelContext.Provider value={channelContextValue}>
        <SessionRenderErrorBoundary label="live-session">
          <LiveSessionChannelHost />
          {children}
        </SessionRenderErrorBoundary>
      </LiveSessionChannelContext.Provider>
    </SpectatorSessionContext.Provider>
  );
}

export function useSpectatorSession(): SpectatorSessionContextValue {
  const ctx = useContext(SpectatorSessionContext);
  if (!ctx) {
    throw new Error('useSpectatorSession must be used within SpectatorSessionProvider');
  }
  return ctx;
}

export function useSpectatorSessionOptional(): SpectatorSessionContextValue | null {
  return useContext(SpectatorSessionContext);
}
