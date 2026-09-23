import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { FEATURES } from '@/config/features';

vi.mock('@/features/director-session/follow-v3/publishFollowState', () => ({
  publishFollowState: vi.fn(),
}));

import { publishFollowState } from '@/features/director-session/follow-v3/publishFollowState';
import { useDirectorFollowV3 } from './useDirectorFollowV3';

const originalV3Enabled = FEATURES.USE_FOLLOW_V3;
const baseOptions = {
  followEnabled: true,
  currentSongId: 'song-1',
  sessionCode: 'ABCD',
};

describe('useDirectorFollowV3 integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    FEATURES.USE_FOLLOW_V3 = originalV3Enabled;
  });

  it('does not publish when the legacy V3 feature is disabled', () => {
    FEATURES.USE_FOLLOW_V3 = false;
    renderHook(() => useDirectorFollowV3(baseOptions));
    expect(publishFollowState).not.toHaveBeenCalled();
  });

  it('does not publish when following is disabled', () => {
    FEATURES.USE_FOLLOW_V3 = true;
    renderHook(() => useDirectorFollowV3({ ...baseOptions, followEnabled: false }));
    expect(publishFollowState).not.toHaveBeenCalled();
  });

  it('publishes song changes in sequence without repeating the same song', () => {
    FEATURES.USE_FOLLOW_V3 = true;
    const { rerender } = renderHook((options) => useDirectorFollowV3(options), {
      initialProps: baseOptions,
    });
    expect(publishFollowState).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sessionCode: 'ABCD', songId: 'song-1', seq: 1,
    }));
    rerender({ ...baseOptions });
    expect(publishFollowState).toHaveBeenCalledTimes(1);
    rerender({ ...baseOptions, currentSongId: 'song-2' });
    expect(publishFollowState).toHaveBeenCalledTimes(2);
    expect(publishFollowState).toHaveBeenNthCalledWith(2, expect.objectContaining({
      songId: 'song-2', seq: 2,
    }));
  });
});
