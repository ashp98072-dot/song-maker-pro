import type { NavigateFunction } from 'react-router-dom';
import type { SimpleLiveState } from '@/features/simple-live-sync/types';
import { getSongPathById } from '@/utils/songSlug';

/** After follower joins, open the director song or continuous setlist. */
export function navigateAfterSimpleLiveJoin(
  navigate: NavigateFunction,
  state: SimpleLiveState,
  catalog: { id: string; title: string }[] = []
): boolean {
  if (state.viewMode === 'continuous' && state.listId) {
    navigate(`/setlist/${state.listId}/live`, {
      state: {
        listId: state.listId,
        listSongIds: state.listSongIds,
        joinSessionCode: state.sessionCode,
        initialSongId: state.songId ?? undefined,
        initialIndex: state.currentIndex,
        currentIndex: state.currentIndex,
      },
    });
    return true;
  }

  if (!state.songId) return false;
  navigate(getSongPathById(state.songId, catalog));
  return true;
}
