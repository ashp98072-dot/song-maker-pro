import type { ViewMode } from '@/types/music';

/** Section anchor sync only in song views (singer/musician), not continuous. */
export function shouldApplyRemoteSectionAnchor(
  followDirector: boolean,
  viewMode: ViewMode | string | null | undefined
): boolean {
  if (!followDirector) return false;
  const mode = (viewMode ?? '').toLowerCase();
  return mode === 'singer' || mode === 'musician';
}
