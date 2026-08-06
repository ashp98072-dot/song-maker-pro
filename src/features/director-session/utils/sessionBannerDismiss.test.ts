import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearDismissedSessionBanner,
  isSessionBannerDismissedForCode,
  readDismissedSessionBannerCode,
  writeDismissedSessionBanner,
} from '@/features/director-session/utils/sessionBannerDismiss';

describe('sessionBannerDismiss', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists dismiss per session code', () => {
    writeDismissedSessionBanner('abc123');
    expect(readDismissedSessionBannerCode()).toBe('ABC123');
    expect(isSessionBannerDismissedForCode('ABC123')).toBe(true);
    expect(isSessionBannerDismissedForCode('XYZ999')).toBe(false);
  });

  it('clears on session end', () => {
    writeDismissedSessionBanner('ABC123');
    clearDismissedSessionBanner();
    expect(readDismissedSessionBannerCode()).toBeNull();
  });
});
