import { unregisterDirectorBroadcastChannel } from '@/features/director-session/realtime/sharedSessionSync';
import { clearContinuousListSyncStorage } from '@/features/continuous-setlist/utils/continuousListSyncCache';
import { clearManualExitContinuous } from '@/features/director-session/utils/continuousExitGuard';
import { clearLiveSessionPersistence } from '@/features/director-session/utils/liveSessionPersistence';
import { clearSessionRecoveryStorage } from '@/features/director-session/utils/sessionRecovery';
import { dispatchSessionHardClear } from '@/features/director-session/utils/sessionHardClearEvents';
import { clearSpectatorSessionOptOut } from '@/features/director-session/utils/spectatorSessionOptOut';
import { clearPendingJoin } from '@/features/director-session/utils/pendingJoinStorage';
import { sessionRecoveryLog } from '@/features/director-session/utils/sessionRecoveryLog';

/**
 * Limpieza total de caché local de sesión en vivo.
 * Llamar al cerrar sesión o cuando live_sessions confirma is_active = false.
 */
export function clearAllLiveSessionLocalState(sessionCode?: string): void {
  clearLiveSessionPersistence();
  clearSessionRecoveryStorage();
  clearContinuousListSyncStorage();
  clearSpectatorSessionOptOut();
  clearManualExitContinuous();
  clearPendingJoin();

  if (sessionCode) {
    unregisterDirectorBroadcastChannel(sessionCode);
  }

  try {
    sessionStorage.removeItem('follower_sync_error');
  } catch {
    /* ignore */
  }

  sessionRecoveryLog('hard cleanup local session state', { sessionCode });
  dispatchSessionHardClear(sessionCode);
}
