type RealtimeLogOptions = { always?: boolean };

/** Production-visible Realtime diagnostics (browser console on Vercel). */
export function realtimeLog(
  message: string,
  detail?: unknown,
  options?: RealtimeLogOptions
): void {
  const force = options?.always ?? true;
  if (!import.meta.env.DEV && !force) return;
  if (detail !== undefined) {
    console.log(`[Realtime] ${message}`, detail);
  } else {
    console.log(`[Realtime] ${message}`);
  }
}

export function realtimeError(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.error(`[Realtime] ${message}`, detail);
  } else {
    console.error(`[Realtime] ${message}`);
  }
}
