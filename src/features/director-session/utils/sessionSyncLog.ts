type SessionSyncLogOptions = { always?: boolean };

/** Spectator / shared-session sync logs (DEV by default; `always` for realtime investigation). */
export function sessionSyncLog(
  message: string,
  detail?: unknown,
  options?: SessionSyncLogOptions
): void {
  if (!import.meta.env.DEV && !options?.always) return;
  if (detail !== undefined) {
    console.log(`[SessionSync] ${message}`, detail);
  } else {
    console.log(`[SessionSync] ${message}`);
  }
}
