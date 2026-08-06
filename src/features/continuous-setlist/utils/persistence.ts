import type { ContinuousSetlistPersisted, ContinuousSetlistSettings } from '@/features/continuous-setlist/types';
import { DEFAULT_CONTINUOUS_SETTINGS } from '@/features/continuous-setlist/types';

const STORAGE_KEY = 'worship-continuous-setlist';

export function loadContinuousPersisted(listId: string): ContinuousSetlistPersisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContinuousSetlistPersisted;
    if (parsed.listId !== listId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveContinuousPersisted(data: ContinuousSetlistPersisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }));
  } catch {
    /* quota */
  }
}

export function mergeContinuousSettings(
  partial?: Partial<ContinuousSetlistSettings>
): ContinuousSetlistSettings {
  return { ...DEFAULT_CONTINUOUS_SETTINGS, ...partial };
}
