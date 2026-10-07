import { describe, expect, it } from 'vitest';
import { estimateSongKey } from './estimateSongKey';
describe('harmonic key suggestion', () => {
  it('uses cadences rather than just the first chord', () => {
    expect(estimateSongKey('Am F C G7 C F G7 C')?.key).toBe('C');
  });
  it('recognizes minor harmony with a major dominant', () => {
    expect(estimateSongKey('Am Dm E7 Am Dm E7 Am')?.key).toBe('Am');
  });
  it('does not read lyric words as chords or invent a key with little evidence', () => {
    expect(estimateSongKey('A mi Dios cantaré\nC G')).toBeNull();
    expect(estimateSongKey('Letra sin acordes')).toBeNull();
  });
  it('reports alternatives for relative major/minor ambiguity', () => {
    const result = estimateSongKey('C Am F G C Am F G');
    expect(result?.alternatives).toHaveLength(2);
    expect(result?.confidence).not.toBe('alta');
  });
});
