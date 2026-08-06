import { supabase } from '@/integrations/supabase/client';
import { continuousSyncLog } from '@/features/director-session/utils/continuousSyncLog';

export function parseLiveSessionListSongIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export type LiveSessionListPayload = {
  listId: string | null;
  listSongIds: string[];
};

/** Lee list_id + list_song_ids persistidos por el director (reconexión / join tardío). */
export async function fetchLiveSessionList(
  sessionCode: string
): Promise<LiveSessionListPayload | null> {
  if (!sessionCode || sessionCode.length < 4) return null;

  const { data, error } = await supabase
    .from('live_sessions')
    .select('list_id, list_song_ids, is_active')
    .eq('code', sessionCode)
    .maybeSingle();

  if (error) {
    continuousSyncLog('live_sessions fetch error', { sessionCode, error: error.message });
    return null;
  }
  if (!data?.is_active) {
    continuousSyncLog('live_sessions inactive or missing', { sessionCode });
    return null;
  }

  const listSongIds = parseLiveSessionListSongIds(data.list_song_ids);
  continuousSyncLog('live_sessions list payload', {
    sessionCode,
    listId: data.list_id,
    count: listSongIds.length,
  });

  return {
    listId: data.list_id,
    listSongIds,
  };
}
