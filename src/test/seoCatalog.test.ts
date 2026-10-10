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
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(url.includes('community_unavailable_song_ids') ? [] : [
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
  it('filters withdrawn songs even when using service-role table reads', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true, status: 200,
      text: async () => JSON.stringify(url.includes('community_unavailable_song_ids') ? ['removed'] : [
        { song_id: 'removed', title: 'Removed' }, { song_id: 'visible', title: 'Visible' },
      ]),
    })));
    expect((await loadSeoCatalog()).songs.map(song => song.id)).toEqual(['visible']);
  });
  it('does not expose cached public content when moderation cannot be verified', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, text: async () => '{}' })));
    expect((await loadSeoCatalog()).error).toBe('moderation_unavailable');
  });
});
