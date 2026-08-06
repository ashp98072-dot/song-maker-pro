import type { SongList } from '@/types/music';

/** IDs de setlist para sync: broadcast primero, luego lista local del follower si existe. */
export function resolveRemoteListSongIds(
  state: { listId?: string | null; listSongIds?: string[] | null },
  lists: SongList[]
): string[] {
  if (state.listSongIds?.length) {
    return state.listSongIds.filter((id) => typeof id === 'string' && id.length > 0);
  }
  if (state.listId) {
    const fromApp = lists.find((l) => l.id === state.listId)?.songIds;
    if (fromApp?.length) return fromApp;
  }
  return [];
}
