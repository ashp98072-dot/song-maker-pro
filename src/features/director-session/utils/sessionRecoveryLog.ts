export function sessionRecoveryLog(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (detail !== undefined) {
    console.log(`[SessionRecovery] ${message}`, detail);
  } else {
    console.log(`[SessionRecovery] ${message}`);
  }
}
