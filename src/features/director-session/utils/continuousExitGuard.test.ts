import { describe, it, expect, beforeEach } from 'vitest';
import {
  markManualExitContinuous,
  clearManualExitContinuous,
  hasManualExitContinuous,
  shouldSkipContinuousRecovery,
} from '@/features/director-session/utils/continuousExitGuard';

describe('continuousExitGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('tracks manual exit per list', () => {
    markManualExitContinuous('list-a');
    expect(hasManualExitContinuous('list-a')).toBe(true);
    expect(hasManualExitContinuous('list-b')).toBe(false);
    clearManualExitContinuous();
    expect(hasManualExitContinuous('list-a')).toBe(false);
  });

  it('shouldSkipContinuousRecovery when manual exit', () => {
    markManualExitContinuous('list-a');
    expect(shouldSkipContinuousRecovery('list-a', 'continuous')).toBe(true);
    expect(shouldSkipContinuousRecovery('list-a', 'musician')).toBe(false);
  });
});
