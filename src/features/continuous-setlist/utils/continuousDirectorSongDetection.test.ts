import { describe, expect, it } from 'vitest';
import {
  createDirectorSongDetectionState,
  DIRECTOR_SONG_STABLE_MS,
  processDirectorSongDetection,
} from '@/features/continuous-setlist/utils/continuousDirectorSongDetection';

describe('processDirectorSongDetection', () => {
  it('does not publish until candidate is stable', () => {
    const t0 = 1000;
    let state = createDirectorSongDetectionState(null);
    const first = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      state,
      t0
    );
    expect(first.stableIndex).toBeNull();
    state = first.state;

    const second = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      state,
      t0 + DIRECTOR_SONG_STABLE_MS - 1
    );
    expect(second.stableIndex).toBeNull();
  });

  it('publishes when stable window elapses and index changed', () => {
    const t0 = 2000;
    let state = createDirectorSongDetectionState(1);
    state = processDirectorSongDetection(
      { candidateIndex: 3, candidateSongId: 'song-3', totalSongs: 5 },
      state,
      t0
    ).state;
    const stable = processDirectorSongDetection(
      { candidateIndex: 3, candidateSongId: 'song-3', totalSongs: 5 },
      state,
      t0 + DIRECTOR_SONG_STABLE_MS + 50
    );
    expect(stable.stableIndex).toBe(3);
    expect(stable.stableSongId).toBe('song-3');
  });

  it('does not same-as-published before first real publish when initialIndex matches', () => {
    const t0 = 5000;
    const first = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      createDirectorSongDetectionState(2),
      t0
    );
    expect(first.ignoreReason).not.toBe('same-as-published');
    expect(first.state.hasPublishedOnce).toBe(false);
  });

  it('ignores same index as last published after a real publish', () => {
    const t0 = 6000;
    let state = createDirectorSongDetectionState(2);
    state = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      state,
      t0
    ).state;
    state = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      state,
      t0 + DIRECTOR_SONG_STABLE_MS + 50
    ).state;
    expect(state.hasPublishedOnce).toBe(true);

    const result = processDirectorSongDetection(
      { candidateIndex: 2, candidateSongId: 'song-2', totalSongs: 5 },
      state,
      t0 + 1000
    );
    expect(result.stableIndex).toBeNull();
    expect(result.ignoreReason).toBe('same-as-published');
  });
});
