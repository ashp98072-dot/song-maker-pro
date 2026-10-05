import { createContext, useContext } from 'react';
import type { SessionRecoveryState, StoredLiveSessionRole } from '@/features/director-session/utils/sessionRecovery';
import type { PageSessionContext, SessionOrigin } from '@/features/director-session/utils/sessionOrigin';
import type { SessionActiveCheckReason } from '@/features/director-session/utils/checkSessionActive';
import type { DirectorSessionConnection, SharedSessionState } from '@/features/director-session/types';
import type { PersistDirectorLiveSessionInput } from '@/features/director-session/utils/persistDirectorLiveSession';
import type { DirectorChannelJoinState, LiveSessionPageHandlers, LiveSessionBroadcastState } from '@/features/director-session/live/liveSessionTypes';
import type { useLiveSessionBroadcast } from '@/features/director-session/live/useLiveSessionBroadcast';
import type { ViewMode } from '@/types/music';
import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

export type JoinWithCodeResult = true | 'conflict' | SessionActiveCheckReason | 'busy';

export type SpectatorSessionContextValue = {
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

export const SpectatorSessionContext = createContext<SpectatorSessionContextValue | null>(null);

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
