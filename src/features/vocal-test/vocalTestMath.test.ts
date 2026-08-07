import { describe, expect, it } from 'vitest';
import {
  canClassifyRange,
  isVocalRegister,
  matchClosestRegister,
  normalizeRange,
  parseSingerVocalProfile,
} from '@/features/vocal-test/vocalTestMath';

describe('vocalTestMath', () => {
  it('normalizes inverted ranges', () => {
    expect(normalizeRange(70, 50)).toEqual({ low: 50, high: 70 });
  });

  it('requires a minimum span to classify', () => {
    expect(canClassifyRange(60, 62)).toBe(false);
    expect(canClassifyRange(60, 66)).toBe(true);
  });

  it('maps typical soprano and bass ranges', () => {
    expect(matchClosestRegister(60, 81).id).toBe('soprano');
    expect(matchClosestRegister(41, 62).id).toBe('bajo');
    expect(matchClosestRegister(48, 69).id).toBe('tenor');
  });

  it('validates register ids', () => {
    expect(isVocalRegister('soprano')).toBe(true);
    expect(isVocalRegister('alto')).toBe(false);
  });

  it('parses stored profiles and rejects corrupt data', () => {
    expect(
      parseSingerVocalProfile({
        lowMidi: 48,
        highMidi: 69,
        register: 'tenor',
        method: 'keyboard',
        updatedAt: 1,
      })?.register
    ).toBe('tenor');

    expect(
      parseSingerVocalProfile({
        lowMidi: 60,
        highMidi: 61,
        register: 'soprano',
        method: 'keyboard',
        updatedAt: 1,
      })
    ).toBeNull();

    expect(parseSingerVocalProfile({ lowMidi: 48, highMidi: 69, register: 'nope' })).toBeNull();
  });
});
