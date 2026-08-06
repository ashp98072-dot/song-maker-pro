/** Post-join navigation diagnostics (visible in production). */
export function joinSessionLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[JOIN] ${message}`, detail);
  } else {
    console.log(`[JOIN] ${message}`);
  }
}
