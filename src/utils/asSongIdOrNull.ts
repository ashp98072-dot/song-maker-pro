/** Local list ids historically used Date.now() (12–14 digit millis). Songs often use the same shape. */
export function looksLikeEpochMillisId(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{12,14}$/.test(value.trim());
}

/**
 * Prefer real song ids.
 * Epoch-millis values are only rejected when they match `listId` (list masquerading as song).
 * Standalone Date.now() song ids must remain valid.
 */
export function asSongIdOrNull(
  value: string | null | undefined,
  listId?: string | null
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (listId && trimmed === listId.trim()) return null;
  return trimmed;
}
