type DirectorSessionLogOptions = { always?: boolean };

/** Director session lifecycle logs (DEV by default; `always` for realtime investigation). */
export function directorSessionLog(
  message: string,
  detail?: unknown,
  options?: DirectorSessionLogOptions
): void {
  if (!import.meta.env.DEV && !options?.always) return;
  if (detail !== undefined) {
    console.log(`[DirectorSession] ${message}`, detail);
  } else {
    console.log(`[DirectorSession] ${message}`);
  }
}
