import { supabase } from '@/integrations/supabase/client';
import {
  writeStoredLiveSession,
  recoveryGenderShiftForPersist,
} from '@/features/director-session/utils/sessionRecovery';
import {
  buildSessionOrigin,
  type PageSessionContext,
  type SessionOrigin,
} from '@/features/director-session/utils/sessionOrigin';
import { dispatchSessionRedirect } from '@/features/director-session/utils/sessionRedirectEvents';
import type { ViewMode } from '@/types/music';

export type RedirectDirectorSessionInput = PageSessionContext & {
  code: string;
  listName?: string;
  semitones?: number;
  currentKey?: string;
  bpm?: number | null;
  genderShift?: '' | 'male' | 'female';
  viewMode?: ViewMode;
  currentIndex?: number;
};

export async function redirectDirectorSession(
  input: RedirectDirectorSessionInput
): Promise<SessionOrigin | null> {
  const { code, songId } = input;
  if (!songId) return null;

  const origin = buildSessionOrigin(input);
  if (!origin) return null;

  const listSongIds = input.listSongIds ?? [];
  const currentIndex =
    input.currentIndex ??
    (listSongIds.length > 0 ? Math.max(0, listSongIds.indexOf(songId)) : 0);

  const { error } = await supabase
    .from('live_sessions')
    .update({
      song_id: songId,
      list_id: input.listId ?? null,
      list_song_ids: listSongIds as unknown as string[],
      current_index: currentIndex,
      view_mode: input.viewMode ?? 'musician',
      semitones: input.semitones ?? 0,
      current_key: input.currentKey ?? null,
      bpm: input.bpm ?? null,
      gender_shift: recoveryGenderShiftForPersist(input.genderShift),
      session_origin: origin as unknown as Record<string, unknown>,
    })
    .eq('code', code);

  if (error) throw error;

  writeStoredLiveSession(code, 'director', origin);

  dispatchSessionRedirect({
    code,
    origin,
    songId,
    listId: input.listId ?? null,
    listSongIds,
    currentIndex,
    viewMode: input.viewMode ?? 'musician',
  });

  return origin;
}
