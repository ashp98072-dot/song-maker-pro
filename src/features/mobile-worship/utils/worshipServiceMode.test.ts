import { describe, it, expect } from 'vitest';
import { planWorshipServiceMode } from '@/features/mobile-worship/utils/worshipServiceMode';

describe('planWorshipServiceMode', () => {
  it('blocks followers', () => {
    const plan = planWorshipServiceMode('follower');
    expect(plan.kind).toBe('blocked');
  });

  it('creates when idle and hides when already director', () => {
    expect(planWorshipServiceMode('idle')).toEqual({ kind: 'start', needsCreate: true });
    expect(planWorshipServiceMode(null)).toEqual({ kind: 'start', needsCreate: true });
    expect(planWorshipServiceMode('director')).toEqual({ kind: 'start', needsCreate: false });
  });
});
