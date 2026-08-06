import { publishSharedSessionEnd } from '@/features/director-session/realtime/sharedSessionSync';
import { dispatchDirectorSessionTerminate } from '@/features/director-session/utils/directorSessionEvents';
import { deactivateLiveSessionRow } from '@/features/director-session/utils/liveSessionActive';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { dispatchSpectatorSessionLeave } from '@/features/director-session/utils/spectatorSessionEvents';

/** Cierra sesión de director: broadcast end, BD inactiva, limpieza local total. */
export async function terminateDirectorSession(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();

  publishSharedSessionEnd(normalized);
  dispatchDirectorSessionTerminate(normalized);

  await deactivateLiveSessionRow(normalized);

  clearAllLiveSessionLocalState(normalized);
  dispatchSpectatorSessionLeave();
}
