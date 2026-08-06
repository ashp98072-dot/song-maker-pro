const STORAGE_KEY = 'worship-manual-exit-continuous';

type ManualExitPayload = {
  listId: string | null;
  at: number;
};

export function markManualExitContinuous(listId?: string | null): void {
  try {
    const payload: ManualExitPayload = {
      listId: listId ?? null,
      at: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearManualExitContinuous(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Bloquea auto-navegación a setlist live tras salida manual del director. */
export function hasManualExitContinuous(listId?: string | null): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as ManualExitPayload;
    if (listId && parsed.listId && parsed.listId !== listId) return false;
    return true;
  } catch {
    return false;
  }
}

export function shouldSkipContinuousRecovery(
  listId: string | null | undefined,
  viewMode: string | undefined
): boolean {
  if (viewMode !== 'continuous') return false;
  return hasManualExitContinuous(listId ?? null);
}
