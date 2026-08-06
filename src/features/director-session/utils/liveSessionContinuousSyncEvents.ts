/** Force ContinuousSetlistPage to apply remote currentIndex (V3 + legacy). */
export const LIVE_SESSION_FORCE_CONTINUOUS_INDEX_EVENT =
  'live-session-force-continuous-index' as const;

export type ForceContinuousIndexDetail = {
  currentIndex: number;
  currentSongId: string | null;
  listId: string | null;
  sessionCode?: string | null;
  viewMode?: string;
  source?: string;
};

export function dispatchForceContinuousIndex(detail: ForceContinuousIndexDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ForceContinuousIndexDetail>(LIVE_SESSION_FORCE_CONTINUOUS_INDEX_EVENT, {
      detail,
    })
  );
}
