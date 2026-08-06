import { describe, expect, it } from 'vitest';
import { asSongIdOrNull, looksLikeEpochMillisId } from '@/utils/asSongIdOrNull';

describe('asSongIdOrNull', () => {
  it('rejects epoch-millis only when it matches listId', () => {
    expect(looksLikeEpochMillisId('1777907438514')).toBe(true);
    expect(asSongIdOrNull('1777907438514', '1777907438514')).toBeNull();
    expect(asSongIdOrNull('1777907438514')).toBe('1777907438514');
    expect(asSongIdOrNull('1777907438514', 'other-list')).toBe('1777907438514');
  });

  it('keeps normal song ids', () => {
    expect(asSongIdOrNull('espiritu-santo')).toBe('espiritu-santo');
    expect(asSongIdOrNull('abc-123')).toBe('abc-123');
  });
});
