import { describe, it, expect } from 'vitest';
import { estimateSongBlockHeight } from '@/features/continuous-setlist/utils/estimateBlockHeight';

describe('estimateSongBlockHeight', () => {
  it('crece con más líneas de acordes', () => {
    const short = estimateSongBlockHeight('C\nAm\nF\nG');
    const long = estimateSongBlockHeight(Array(40).fill('línea').join('\n'));
    expect(long).toBeGreaterThan(short);
  });

  it('aumenta con espaciado grande', () => {
    const chords = Array(20).fill('C G Am F').join('\n');
    const normal = estimateSongBlockHeight(chords, { fontSize: 18 });
    const large = estimateSongBlockHeight(chords, { largeSpacing: true, fontSize: 18 });
    expect(large).toBeGreaterThan(normal);
  });
});
