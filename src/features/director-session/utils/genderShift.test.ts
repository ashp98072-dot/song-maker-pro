import { describe, expect, it } from 'vitest';
import { fromSharedGenderShift, toSharedGenderShift } from '@/features/director-session/utils/genderShift';

describe('genderShift mappers', () => {
  it('maps local empty to original and back', () => {
    expect(toSharedGenderShift('')).toBe('original');
    expect(fromSharedGenderShift('original')).toBe('');
  });

  it('preserves male and female', () => {
    expect(toSharedGenderShift('male')).toBe('male');
    expect(fromSharedGenderShift('female')).toBe('female');
  });
});
