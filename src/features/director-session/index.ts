export type {
  DirectorSessionConnection,
  SharedSessionGenderShift,
  SharedSessionState,
} from '@/features/director-session/types';
export {
  SHARED_SESSION_BROADCAST_EVENT,
  SHARED_SESSION_END_EVENT,
  REQUEST_CURRENT_STATE_EVENT,
  normalizeSessionCode,
  worshipSessionChannelName,
} from '@/features/director-session/types';
export {
  attachRequestCurrentStateListener,
  attachSharedSessionListeners,
  clearSharedSessionState,
  publishFullSessionState,
  publishSharedSessionEnd,
  publishSharedSessionState,
  registerDirectorBroadcastChannel,
  sendRequestCurrentState,
  subscribeToSharedSessionState,
  unregisterDirectorBroadcastChannel,
} from '@/features/director-session/realtime/sharedSessionSync';
export { buildSharedSessionFromBroadcast } from '@/features/director-session/realtime/buildFullSessionState';
export { fromSharedGenderShift, toSharedGenderShift } from '@/features/director-session/utils/genderShift';
export type { LocalGenderShift } from '@/features/director-session/utils/genderShift';
export { buildContinuousSharedState } from '@/features/director-session/utils/buildContinuousSharedState';
export {
  readFollowDirector,
  writeFollowDirector,
  clearFollowDirectorStorage,
  followPrefLog,
  followBlockedLog,
  followRestoreLog,
  followRestoredLog,
} from '@/features/director-session/utils/followDirector';
export {
  followDirectorLog,
  isPassiveSpectatorMode,
} from '@/features/director-session/utils/followDirectorLog';
export { sessionSyncLog } from '@/features/director-session/utils/sessionSyncLog';
export { directorSessionLog } from '@/features/director-session/utils/directorSessionLog';
export { continuousSyncLog, logContinuousPublish } from '@/features/director-session/utils/continuousSyncLog';
export {
  clearSessionRecoveryStorage,
  isContinuousRecoveryReady,
  localGenderFromRecovery,
  mapLiveSessionRow,
  readStoredLiveSession,
  recoveryGenderShiftForPersist,
  resolveLiveSessionForReconnect,
  resolveLiveSessionForReconnectWithRetry,
  enrichRecoveryForNavigation,
  writeStoredLiveSession,
  LIVE_SESSION_STORAGE_KEY,
} from '@/features/director-session/utils/sessionRecovery';
export { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
export {
  checkSessionExists,
  querySessionActive,
  sessionJoinBlockedMessage,
} from '@/features/director-session/utils/checkSessionActive';
export {
  SESSION_HARD_CLEAR_EVENT,
  dispatchSessionHardClear,
} from '@/features/director-session/utils/sessionHardClearEvents';
export type {
  SessionRecoveryMeta,
  SessionRecoveryState,
  StoredLiveSessionRole,
} from '@/features/director-session/utils/sessionRecovery';
export { sessionRecoveryLog } from '@/features/director-session/utils/sessionRecoveryLog';
export type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';
export {
  isJoinBlockedByStatus,
  LIVE_SESSION_RECOVERY_BANNER_STATUS,
} from '@/features/director-session/utils/liveSessionStatus';
export { logSessionStatusTransition } from '@/features/director-session/utils/sessionStatusLog';
export { sessionGuardLog, sessionUiLog } from '@/features/director-session/utils/sessionUiLog';
export {
  SpectatorSessionProvider,
  SpectatorSessionProvider as SessionProvider,
  useSpectatorSession,
  useSpectatorSessionOptional,
} from '@/features/director-session/context/SpectatorSessionContext';
export { sessionProviderLog } from '@/features/director-session/utils/sessionProviderLog';
export { SpectatorSessionBanner } from '@/features/director-session/components/SpectatorSessionBanner';
export { ActiveSessionBanner } from '@/features/director-session/components/ActiveSessionBanner';
export { DirectorSessionConflictDialog } from '@/features/director-session/components/DirectorSessionConflictDialog';
export { JoinSessionConflictDialog } from '@/features/director-session/components/JoinSessionConflictDialog';
export {
  markManualExitContinuous,
  clearManualExitContinuous,
  hasManualExitContinuous,
  shouldSkipContinuousRecovery,
} from '@/features/director-session/utils/continuousExitGuard';
export {
  buildExitContinuousNavState,
  navigateExitToSongView,
  resolveExitContinuousSongId,
  type ExitContinuousNavState,
} from '@/features/director-session/utils/exitContinuousNavigation';
export {
  buildSessionOrigin,
  inferSessionOriginFromRecovery,
  isPageInSessionScope,
  sessionOriginLabel,
  type SessionOrigin,
  type PageSessionContext,
} from '@/features/director-session/utils/sessionOrigin';
export { redirectDirectorSession } from '@/features/director-session/utils/redirectDirectorSession';
export { useSessionOriginMismatch } from '@/features/director-session/hooks/useSessionOriginMismatch';
export { SessionOriginMismatchDialog } from '@/features/director-session/components/SessionOriginMismatchDialog';
export { fetchActiveDirectorSession } from '@/features/director-session/utils/detectActiveDirectorSession';
export { terminateDirectorSession } from '@/features/director-session/utils/terminateDirectorSession';
export {
  dispatchDirectorSessionTerminate,
  DIRECTOR_SESSION_TERMINATE_EVENT,
} from '@/features/director-session/utils/directorSessionEvents';
export { detectAvailableSpectatorSession } from '@/features/director-session/utils/detectAvailableLiveSession';
export {
  dispatchSpectatorSessionLeave,
  SPECTATOR_SESSION_LEAVE_EVENT,
} from '@/features/director-session/utils/spectatorSessionEvents';
export {
  markSpectatorSessionOptOut,
  clearSpectatorSessionOptOut,
  hasSpectatorSessionOptOut,
} from '@/features/director-session/utils/spectatorSessionOptOut';
