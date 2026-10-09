
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../../api/youtube-search';

beforeEach(() => { vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Vercel YouTube search', () => {
  it('rejects invalid queries and foreign origins before calling Google', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await handler(new Request('https://worshiptranspose.com/api/youtube-search?q='))).status).toBe(400);
    expect((await handler(new Request('https://worshiptranspose.com/api/youtube-search?q=test', {
      headers: { origin: 'https://foreign.example' },
    }))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('reports missing configuration without exposing secrets', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    expect((await handler(new Request('https://worshiptranspose.com/api/youtube-search?q=test'))).status).toBe(503);
  });
  it('allows Android, returns normalized results and caches repeated searches', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{
      id: { videoId: 'jfKfPfyJRdk' }, snippet: { title: 'Canción', channelTitle: 'Artista' },
    }] })));
    vi.stubGlobal('fetch', fetchMock);
    const req = () => new Request('https://worshiptranspose.com/api/youtube-search?q=cached-song', {
      headers: { origin: 'https://localhost', 'x-forwarded-for': 'test-client' },
    });
    const response = await handler(req());
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://localhost');
    const body = await response.text();
    expect(body).toContain('jfKfPfyJRdk');
    expect(body).not.toContain('private-test-key');
    await handler(req());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not forward Google error details or the API key', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'private-test-key', errors: [{ reason: 'quotaExceeded' }] },
    }), { status: 403 })));
    const response = await handler(new Request('https://worshiptranspose.com/api/youtube-search?q=quota-test'));
    expect(response.status).toBe(429);
    expect(await response.text()).not.toContain('private-test-key');
  });
});



