export function sessionEndedLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SESSION_ENDED] ${message}`, detail);
  } else {
    console.log(`[SESSION_ENDED] ${message}`);
  }
}
