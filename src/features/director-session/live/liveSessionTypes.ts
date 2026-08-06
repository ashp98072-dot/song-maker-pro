import type { MutableRefObject } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SessionState, ViewMode } from '@/types/music';
import type { DirectorSessionConnection, SharedSessionState } from '@/features/director-session/types';
import type { FollowV3RemoteState } from '@/features/director-session/follow-v3/types';
import type { SessionOrigin } from '@/features/director-session/utils/sessionOrigin';
import type {
  SessionRecoveryMeta,
  SessionRecoveryState,
} from '@/features/director-session/utils/sessionRecovery';

export type DirectorChannelJoinState = 'idle' | 'joining' | 'joined' | 'error';

export type LiveSessionBroadcastState = {
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
  viewMode?: ViewMode;
  genderShift?: '' | 'male' | 'female';
  currentIndex?: number;
  sharedSectionAnchor?: string;
  followDirector?: boolean;
};

export type LiveSessionPageHandlers = {
  onSessionUpdate?: (state: SessionState) => void;
  onSharedSessionUpdate?: (state: SharedSessionState) => void;
  onSharedSessionEnded?: () => void;
  onSessionRecovered?: (state: SessionRecoveryState, meta: SessionRecoveryMeta) => void;
  onDirectorSessionEstablished?: (code: string) => void;
  onDirectorSessionStartFailed?: () => void;
  /** Director pressed “Redirigir sesión” — page should publish navigation to followers. */
  onManualRedirect?: () => void;
  /** Director: push shared-session snapshot (e.g. new follower joined presence). */
  onRequestSharedSessionPublish?: () => void;
  notifyOnSessionEnd?: boolean;
};

export type LiveSessionChannelContextValue = {
  liveIsDirector: boolean;
  liveSessionCode: string;
  liveIsFollower: boolean;
  liveFollowerCode: string;
  connection: DirectorSessionConnection | null;
  directorChannelJoin: DirectorChannelJoinState;
  connectedCount: number;
  sessionOriginRef: MutableRefObject<SessionOrigin | null>;
  newSessionRef: MutableRefObject<boolean>;
  isHydratingRef: MutableRefObject<boolean>;
  broadcastStateRef: MutableRefObject<LiveSessionBroadcastState>;
  pageHandlersRef: MutableRefObject<LiveSessionPageHandlers>;
  directorChannelRef: MutableRefObject<RealtimeChannel | null>;
  followerChannelRef: MutableRefObject<RealtimeChannel | null>;
  lastRemoteStateRef: MutableRefObject<import('@/features/director-session/types').SharedSessionState | null>;
  followV3HandlerRef: MutableRefObject<((state: FollowV3RemoteState) => void) | null>;
  setConnection: (c: DirectorSessionConnection | null) => void;
  setDirectorChannelJoin: (s: DirectorChannelJoinState) => void;
  setConnectedCount: (n: number) => void;
  setLiveIsDirector: (v: boolean) => void;
  setLiveSessionCode: (code: string) => void;
  setLiveIsFollower: (v: boolean) => void;
  setLiveFollowerCode: (code: string) => void;
  scheduleBroadcast: (opts?: {
    immediate?: boolean;
    overrides?: Partial<LiveSessionBroadcastState>;
  }) => void;
  failDirectorStart: (message: string, reason?: string) => void;
  setDirectorDisconnected: (v: boolean) => void;
  setIsReconnecting: (v: boolean, reason?: string) => void;
  /** SUBSCRIBED / healthy channel — clear reconnect UI, go active. */
  markRealtimeSubscriptionStable?: (role: 'director' | 'follower', code: string) => void;
  /** Log channel status + optionally request reconnect (cooldown-gated). */
  handleRealtimeChannelStatus?: (
    role: 'director' | 'follower',
    code: string,
    status: string,
    errMessage?: string
  ) => void;
  onDirectorHeartbeat: () => void;
  /** Routes shared-session broadcast to page handlers or provider fallback. */
  dispatchSharedSessionUpdate: (state: SharedSessionState) => void;
  /** Follower channel SUBSCRIBED — load live_sessions and navigate if needed. */
  onFollowerRealtimeJoined: (code: string) => void;
  /** Realtime SUBSCRIBED (antes de connection / navigation). */
  onRealtimeSubscribed?: (role: 'director' | 'follower', code: string) => void;
  /** Director broadcast session-ended — follower cleanup + navigate home. */
  completeFollowerSessionEndedByDirector: () => void;
  /** Increment reconnect sequence (blocks duplicate replay on same sequence). */
  bumpReconnectSequence: (reason: string) => void;
  /** SUBSCRIBED handshake / request_current_state — full shared-session publish. */
  publishFullSessionStateIfDirector: (sessionCode: string, opts?: { force?: boolean; reason?: string }) => void;
  /** Follower: force continuous index sync from remote snapshot (first broadcast, etc.). */
  syncForceContinuousIndexFromRemoteRef: MutableRefObject<
    ((remote: SharedSessionState, source: string) => void) | null
  >;
  /** Follower channel closed / errored — verify session and cleanup. */
  onFollowerChannelLost?: (code: string, status: string) => void;
};
