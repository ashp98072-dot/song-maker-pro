import { sessionProviderLog } from '@/features/director-session/utils/sessionProviderLog';
import { realtimeLog } from '@/features/director-session/utils/realtimeLog';

let directorPublisherActive = false;

/** Set by SessionProvider when global director session is active. */
export function setDirectorPublisherActive(active: boolean): void {
  directorPublisherActive = active;
  if (active) {
    sessionProviderLog('session alive', { role: 'director' });
  }
}

export function isDirectorPublisherActive(): boolean {
  return directorPublisherActive;
}

/** Blocks follower / page code from publishing live session state. */
export function assertDirectorPublisher(action: string): boolean {
  if (directorPublisherActive) return true;
  realtimeLog('publish blocked (not director)', { action });
  sessionProviderLog('publish blocked (not director)', { action });
  return false;
}
