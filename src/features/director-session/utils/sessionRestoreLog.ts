export function sessionRestoreLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SESSION_RESTORE] ${message}`, detail);
  } else {
    console.log(`[SESSION_RESTORE] ${message}`);
  }
}
