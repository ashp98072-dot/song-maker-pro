import { describe, expect, it } from 'vitest';
import {
  isContinuousRecoveryReady,
  mapLiveSessionRow,
} from '@/features/director-session/utils/sessionRecovery';

const baseRow = {
  code: 'ABC123',
  director_id: '00000000-0000-4000-8000-000000000001',
  song_id: 'song-1',
  list_song_ids: ['song-1', 'song-2'],
  semitones: 2,
  bpm: 120,
  current_key: 'G',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  view_mode: 'continuous',
  gender_shift: 'male',
  current_index: 1,
  list_id: 'list-uuid',
  shared_section_anchor: 'chorus-1',
  follow_director: true,
  session_origin: null,
} as const;

describe('mapLiveSessionRow', () => {
  it('maps postgres row to recovery state', () => {
    const state = mapLiveSessionRow(baseRow);
    expect(state.code).toBe('ABC123');
    expect(state.viewMode).toBe('continuous');
    expect(state.currentIndex).toBe(1);
    expect(state.listSongIds).toEqual(['song-1', 'song-2']);
    expect(state.sharedSectionAnchor).toBe('chorus-1');
    expect(state.genderShift).toBe('male');
    expect(state.sessionOrigin).toBeNull();
  });

  it('normalizes legacy stage view mode', () => {
    const state = mapLiveSessionRow({ ...baseRow, view_mode: 'stage' });
    expect(state.viewMode).toBe('continuous');
  });
});

describe('isContinuousRecoveryReady', () => {
  it('is true for continuous with list and 2+ songs', () => {
    const state = mapLiveSessionRow(baseRow);
    expect(isContinuousRecoveryReady(state)).toBe(true);
  });

  it('is false for musician mode', () => {
    const state = mapLiveSessionRow({ ...baseRow, view_mode: 'musician' });
    expect(isContinuousRecoveryReady(state)).toBe(false);
  });
});
