import { describe, it, expect } from 'vitest';
import {
  buildLiveJoinUrl,
  parseJoinCodeFromPath,
  parseJoinCodeFromSearch,
} from '@/features/simple-live-sync/liveJoinUrl';

describe('liveJoinUrl', () => {
  it('builds /unirse URL', () => {
    expect(buildLiveJoinUrl('ab12', 'https://worshiptranspose.com')).toBe(
      'https://worshiptranspose.com/unirse/AB12'
    );
  });

  it('parses path and query', () => {
    expect(parseJoinCodeFromPath('/unirse/a1b2')).toBe('A1B2');
    expect(parseJoinCodeFromPath('/cancion/x')).toBeNull();
    expect(parseJoinCodeFromSearch('?join=xy99')).toBe('XY99');
    expect(parseJoinCodeFromSearch('?codigo=zz11')).toBe('ZZ11');
  });
});
