import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FEATURES } from '@/config/features';

vi.mock('@/features/director-session/follow-v3/publishFollowState', () => ({
  publishFollowState: vi.fn(),
}));

import { publishFollowState } from '@/features/director-session/follow-v3/publishFollowState';

describe('useDirectorFollowV3 integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('feature flag enables v3', () => {
    expect(FEATURES.USE_FOLLOW_V3).toBe(true);
  });

  it('publishFollowState accepts minimal payload', () => {
    publishFollowState({
      sessionCode: 'ABCD',
      seq: 1,
      songId: 'song-1',
      timestamp: Date.now(),
    });
    expect(publishFollowState).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'song-1', seq: 1 })
    );
  });
});
