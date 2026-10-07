import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ range: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ order: () => ({ range: mocks.range }) }) }) } }));
import { fetchAllPublicSongs } from './publicSongsApi';

const row = (id: number) => ({ song_id: String(id), title: 'Song', artist: 'Artist', original_key: 'C', chords: 'C', scale_mode: 'major' });
describe('complete public catalog', () => {
  beforeEach(() => mocks.range.mockReset());
  it('loads beyond 500 songs with non-overlapping pages', async () => {
    mocks.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => row(i)), error: null })
      .mockResolvedValueOnce({ data: [row(500)], error: null });
    const result = await fetchAllPublicSongs();
    expect(result).toHaveLength(501);
    expect(mocks.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  });
  it('rejects incomplete snapshots so callers retain the previous offline catalog', async () => {
    mocks.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => row(i)), error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(fetchAllPublicSongs()).rejects.toThrow('offline');
  });
});
