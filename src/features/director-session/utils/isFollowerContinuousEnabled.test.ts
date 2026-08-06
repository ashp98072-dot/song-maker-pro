import { describe, expect, it } from 'vitest';
import { FEATURES } from '@/config/features';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';

describe('isFollowerContinuousEnabled', () => {
  it('returns true for follower when continuous follow is enabled', () => {
    expect(FEATURES.FOLLOW_CONTINUOUS_MODE).toBe(true);
    expect(isFollowerContinuousEnabled(true)).toBe(true);
  });

  it('returns true when not following director', () => {
    expect(isFollowerContinuousEnabled(false)).toBe(true);
  });
});
