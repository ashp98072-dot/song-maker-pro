import type { ViewMode } from '@/types/music';

export type NavAttemptSource = 'broadcast' | 'fallback' | 'db' | 'rpc' | 'dev-request';

export function logNavAttempt(
  source: NavAttemptSource,
  detail: {
    view_mode?: ViewMode | string | null;
    list_id?: string | null;
    current_index?: number | null;
    list_song_ids?: string[];
    song_id?: string | null;
    extra?: Record<string, unknown>;
  }
): void {
  console.log('[NAV_ATTEMPT]', {
    source,
    view_mode: detail.view_mode ?? null,
    list_id: detail.list_id ?? null,
    current_index: detail.current_index ?? null,
    list_song_ids: detail.list_song_ids ?? [],
    song_id: detail.song_id ?? null,
    ...detail.extra,
  });
}
