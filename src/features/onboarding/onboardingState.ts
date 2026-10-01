export const ONBOARDING_KEY = 'usage_tutorial_v1';
export const TUTORIAL_EVENT = 'open-usage-tutorial';
export type TutorialProgress = { step: number; status: 'active' | 'completed' | 'skipped' };
export const initialProgress: TutorialProgress = { step: 0, status: 'active' };

export function readTutorialProgress(value: unknown): TutorialProgress | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.step) || Number(record.step) < 0 || Number(record.step) > 3 ||
    !['active', 'completed', 'skipped'].includes(String(record.status))) return null;
  return { step: Number(record.step), status: record.status as TutorialProgress['status'] };
}

export function tutorialForUser(user: { user_metadata: Record<string, unknown>; created_at: string }, now = Date.now()) {
  const saved = readTutorialProgress(user.user_metadata[ONBOARDING_KEY]);
  if (saved) return saved;
  // New OAuth accounts have no signup metadata; existing accounts can start from Profile.
  const age = now - Date.parse(user.created_at);
  return age >= 0 && age < 10 * 60 * 1000 ? initialProgress : null;
}
