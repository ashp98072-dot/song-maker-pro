import { describe, expect, it } from 'vitest';
import {
  enrichRecoveryForNavigation,
  liveSessionRowHasNavigableDirectorState,
  recoveryHasNavigableDirectorState,
} from '@/features/director-session/utils/sessionRecovery';
import type { Database } from '@/integrations/supabase/types';
import type { SessionRecoveryState } from '@/features/director-session/utils/sessionRecovery';

type Row = Database['public']['Tables']['live_sessions']['Row'];

function row(partial: Partial<Row>): Row {
  return {
    bpm: null,
    code: 'ABC',
    created_at: '',
    current_index: 0,
    current_key: null,
    director_id: 'd1',
    follow_director: true,
    gender_shift: null,
    is_active: true,
    list_id: null,
    list_song_ids: [],
    semitones: 0,
    session_origin: null,
    shared_section_anchor: null,
    song_id: null,
    updated_at: '',
    view_mode: null,
    ...partial,
  };
}

describe('liveSessionRowHasNavigableDirectorState', () => {
  it('returns false when row has no song, list, or view_mode', () => {
    expect(liveSessionRowHasNavigableDirectorState(row({}))).toBe(false);
  });

  it('returns true when song_id is set', () => {
    expect(liveSessionRowHasNavigableDirectorState(row({ song_id: 's1' }))).toBe(true);
  });

  it('returns true when only list_song_ids is set', () => {
    expect(
      liveSessionRowHasNavigableDirectorState(row({ list_song_ids: ['a', 'b'] as unknown as Row['list_song_ids'] }))
    ).toBe(true);
  });
});

describe('enrichRecoveryForNavigation', () => {
  it('derives songId from listSongIds and currentIndex', () => {
    const enriched = enrichRecoveryForNavigation({
      code: 'ABC',
      directorId: 'd1',
      songId: null,
      listSongIds: ['s1', 's2'],
      listId: 'l1',
      semitones: 0,
      bpm: null,
      currentKey: null,
      viewMode: 'musician',
      genderShift: 'original',
      currentIndex: 1,
      sharedSectionAnchor: null,
      followDirector: true,
      isActive: true,
      sessionOrigin: null,
    });
    expect(enriched.songId).toBe('s2');
  });
});

describe('recoveryHasNavigableDirectorState', () => {
  const base: SessionRecoveryState = {
    code: 'ABC',
    directorId: 'd1',
    songId: null,
    listSongIds: [],
    listId: null,
    semitones: 0,
    bpm: null,
    currentKey: null,
    viewMode: 'musician',
    genderShift: 'original',
    currentIndex: 0,
    sharedSectionAnchor: null,
    followDirector: true,
    isActive: true,
    sessionOrigin: null,
  };

  it('returns true for continuous with listId', () => {
    expect(
      recoveryHasNavigableDirectorState({ ...base, viewMode: 'continuous', listId: 'l1' })
    ).toBe(true);
  });
});
