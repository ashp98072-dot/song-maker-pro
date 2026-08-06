import { describe, expect, it, beforeEach } from 'vitest';
import { readFollowDirector, writeFollowDirector } from '@/features/director-session/utils/followDirector';

describe('followDirector localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('defaults to true when unset', () => {
    expect(readFollowDirector()).toBe(true);
  });

  it('persists false and true', () => {
    writeFollowDirector(false);
    expect(readFollowDirector()).toBe(false);
    writeFollowDirector(true);
    expect(readFollowDirector()).toBe(true);
  });
});
