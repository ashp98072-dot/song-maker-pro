import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSeoCatalog } from '../../api/_seoCatalog';

describe('SEO catalog response validation', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('ignores invalid rows and normalizes text fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([
        null, false, { title: 'Missing ID' },
        { song_id: 'song-1', title: 123, artist: {}, chords: [] },
        { song_id: 'song-2', title: 'Song', artist: 'Artist', chords: 'C G' },
        { song_id: 'song-2', title: 'Duplicate' },
      ]),
    })));
    const result = await loadSeoCatalog({ withChords: true });
    expect(result.songs).toEqual([
      { id: 'song-1', title: 'Canción', artist: '', chords: '' },
      { id: 'song-2', title: 'Song', artist: 'Artist', chords: 'C G' },
    ]);
  });

  it('returns an empty catalog for non-array responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, text: async () => JSON.stringify({ unexpected: true }),
    })));
    expect((await loadSeoCatalog()).songs).toEqual([]);
  });
});
