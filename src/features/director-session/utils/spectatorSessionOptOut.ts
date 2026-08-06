const SPECTATOR_OPT_OUT_KEY = 'worship-spectator-opt-out';

/** Usuario salió explícitamente; no detectar ni reconectar hasta unirse de nuevo. */
export function markSpectatorSessionOptOut(): void {
  try {
    sessionStorage.setItem(SPECTATOR_OPT_OUT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearSpectatorSessionOptOut(): void {
  try {
    sessionStorage.removeItem(SPECTATOR_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSpectatorSessionOptOut(): boolean {
  try {
    return sessionStorage.getItem(SPECTATOR_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}
