type SessionProviderLogOptions = { always?: boolean };

/** App-level live session / channel lifecycle logs. */
export function sessionProviderLog(
  message: string,
  detail?: unknown,
  options?: SessionProviderLogOptions
): void {
  if (!import.meta.env.DEV && !options?.always) return;
  if (detail !== undefined) {
    console.log(`[SessionProvider] ${message}`, detail);
  } else {
    console.log(`[SessionProvider] ${message}`);
  }
}
