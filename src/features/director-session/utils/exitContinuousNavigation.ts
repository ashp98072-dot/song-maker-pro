import type { NavigateFunction } from 'react-router-dom';
import { getSongPathById } from '@/utils/songSlug';

/** Route state when leaving continuous mode for normal SongView. */
export type ExitContinuousNavState = {
  listId?: string;
  listSongIds?: string[];
  currentIndex?: number;
  joinSessionCode?: string;
  fromContinuous?: boolean;
};

export function resolveExitContinuousSongId(
  primarySongId: string | null | undefined,
  fallbackSongId: string | null | undefined,
  listSongIds: string[],
  currentIndex: number
): string | null {
  if (primarySongId) return primarySongId;
  if (fallbackSongId) return fallbackSongId;
  if (
    currentIndex >= 0 &&
    currentIndex < listSongIds.length &&
    listSongIds[currentIndex]
  ) {
    return listSongIds[currentIndex];
  }
  return listSongIds[0] ?? null;
}

export function buildExitContinuousNavState(params: {
  listId: string;
  listSongIds: string[];
  targetSongId: string;
  currentIndex?: number;
  joinSessionCode?: string;
}): ExitContinuousNavState {
  const indexInList = params.listSongIds.indexOf(params.targetSongId);
  const currentIndex =
    params.currentIndex ??
    (indexInList >= 0 ? indexInList : undefined);

  return {
    listId: params.listId,
    listSongIds: params.listSongIds,
    ...(typeof currentIndex === 'number' && currentIndex >= 0
      ? { currentIndex }
      : {}),
    ...(params.joinSessionCode ? { joinSessionCode: params.joinSessionCode } : {}),
    fromContinuous: true,
  };
}

export function navigateExitToSongView(
  navigate: NavigateFunction,
  params: {
    listId: string;
    listSongIds: string[];
    targetSongId: string;
    currentIndex?: number;
    joinSessionCode?: string;
  }
): void {
  navigate(getSongPathById(params.targetSongId), {
    state: buildExitContinuousNavState(params),
  });
}
