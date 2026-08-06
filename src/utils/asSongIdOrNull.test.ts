import { describe, expect, it } from 'vitest';
import { asSongIdOrNull, looksLikeEpochMillisId } from '@/utils/asSongIdOrNull';

describe('asSongIdOrNull', () => {
  it('rejects epoch-millis list ids', () => {
    expect(looksLikeEpochMillisId('1777907438514')).toBe(true);
    expect(asSongIdOrNull('1777907438514')).toBeNull();
  });

  it('accepts normal song ids', () => {
    expect(asSongIdOrNull('espiritu-santo')).toBe('espiritu-santo');
    expect(asSongIdOrNull('abc-123')).toBe('abc-123');
  });
});
