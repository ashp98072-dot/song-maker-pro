import { describe, it, expect } from 'vitest';
import { resolveTeleprompterLivePill } from '@/features/mobile-worship/utils/teleprompterLivePill';

describe('resolveTeleprompterLivePill', () => {
  it('hides when idle', () => {
    expect(resolveTeleprompterLivePill({ role: 'idle', connected: true })).toBeNull();
  });

  it('shows director live / follower states', () => {
    expect(resolveTeleprompterLivePill({ role: 'director', connected: true })?.label).toBe('EN VIVO');
    expect(
      resolveTeleprompterLivePill({ role: 'follower', connected: true, followDirector: true })?.label
    ).toBe('SIGUIENDO');
    expect(
      resolveTeleprompterLivePill({ role: 'follower', connected: true, followDirector: false })?.label
    ).toBe('PAUSA');
  });

  it('shows offline and reconnecting', () => {
    expect(resolveTeleprompterLivePill({ role: 'follower', connected: false })?.label).toBe('OFFLINE');
    expect(
      resolveTeleprompterLivePill({ role: 'follower', connected: false, connecting: true })?.label
    ).toBe('…');
  });
});
