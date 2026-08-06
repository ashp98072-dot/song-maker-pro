/** Local list ids historically used Date.now() (12–14 digit millis). */
export function looksLikeEpochMillisId(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{12,14}$/.test(value.trim());
}

/** Prefer real song ids; reject epoch-millis list ids masquerading as songs. */
export function asSongIdOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || looksLikeEpochMillisId(trimmed)) return null;
  return trimmed;
}
