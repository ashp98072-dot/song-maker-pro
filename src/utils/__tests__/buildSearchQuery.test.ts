import { describe, it, expect } from 'vitest';
import { buildYouTubeSearchQuery } from '@/features/youtube-search/utils/buildSearchQuery';

describe('buildYouTubeSearchQuery', () => {
  it('prioriza official, live, worship y excluye karaoke', () => {
    const q = buildYouTubeSearchQuery('Océanos', 'Hillsong');
    expect(q).toContain('Océanos Hillsong');
    expect(q).toContain('official');
    expect(q).toContain('live');
    expect(q).toContain('worship');
    expect(q).toContain('español');
    expect(q).toContain('-karaoke');
    expect(q).toContain('-tutorial');
  });

  it('funciona sin artista', () => {
    const q = buildYouTubeSearchQuery('Amazing Grace');
    expect(q.startsWith('Amazing Grace')).toBe(true);
    expect(q).toContain('-cover');
  });
});
