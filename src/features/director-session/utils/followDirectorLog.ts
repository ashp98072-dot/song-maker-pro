export function followDirectorLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[FollowDirector] ${message}`, detail);
  } else {
    console.log(`[FollowDirector] ${message}`);
  }
}

/** Sesión conectada pero sin sync de navegación/viewMode. */
export function isPassiveSpectatorMode(followDirector: boolean): boolean {
  return !followDirector;
}
