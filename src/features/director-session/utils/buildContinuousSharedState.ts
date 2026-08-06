import type { ViewMode } from '@/types/music';
import type { SharedSessionState } from '@/features/director-session/types';
import type { LocalGenderShift } from '@/features/director-session/utils/genderShift';
import { toSharedGenderShift } from '@/features/director-session/utils/genderShift';

export interface BuildContinuousSharedStateInput {
  sessionId: string;
  currentSongId: string | null;
  currentIndex: number;
  listId: string;
  listSongIds: string[];
  customSemitones: number;
  genderShift: LocalGenderShift;
  viewMode?: ViewMode;
  sharedSectionAnchor?: string | null;
}

export function buildContinuousSharedState(
  input: BuildContinuousSharedStateInput
): SharedSessionState {
  return {
    sessionId: input.sessionId,
    currentSongId: input.currentSongId,
    currentIndex: input.currentIndex,
    listId: input.listId,
    listSongIds: input.listSongIds,
    customSemitones: input.customSemitones,
    genderShift: toSharedGenderShift(input.genderShift),
    viewMode: input.viewMode ?? 'continuous',
    ...(input.sharedSectionAnchor ? { sharedSectionAnchor: input.sharedSectionAnchor } : {}),
    updatedAt: new Date().toISOString(),
  };
}
