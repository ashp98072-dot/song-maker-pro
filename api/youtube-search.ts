export const config = { runtime: 'edge' };

interface Video {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
  };
}

// Warm-instance limits supplement Google's project quota; they are not global limits.
const requests = new Map<string, { count: number; expires: number }>();
const cache = new Map<string, { results: unknown[]; expires: number }>();

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const allowed = !origin || origin === new URL(req.url).origin ||
    ['https://worshiptranspose.com', 'https://localhost', 'http://localhost:8080'].includes(origin);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (allowed && origin) headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (!allowed) return reply({ error: 'Origen no permitido.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return reply({ error: 'Método no permitido.' }, 405);
  const query = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!query || query.length > 180) return reply({ error: 'Escribe una búsqueda de hasta 180 caracteres.' }, 400);
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return reply({ error: 'La búsqueda de YouTube aún no está configurada en el servidor.' }, 503);
  const now = Date.now();
  for (const [id, entry] of requests) if (entry.expires <= now) requests.delete(id);
  for (const [id, entry] of cache) if (entry.expires <= now) cache.delete(id);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const budget = requests.get(ip) ?? { count: 0, expires: now + 60_000 };
  if (budget.count >= 10) return reply({ error: 'Demasiadas búsquedas. Espera un minuto.' }, 429);
  if (requests.size >= 2000 && !requests.has(ip)) return reply({ error: 'Servicio ocupado. Reintenta más tarde.' }, 429);
  budget.count++;
  requests.set(ip, budget);
  const cached = cache.get(query.toLowerCase());
  if (cached) return reply({ results: cached.results, provider: 'youtube-api' });
  try {
    const params = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '12',
      q: query, key, safeSearch: 'moderate', videoEmbeddable: 'true', relevanceLanguage: 'es' });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const quota = body.error?.errors?.some((e: { reason?: string }) =>
        ['quotaExceeded', 'dailyLimitExceeded'].includes(e.reason ?? ''));
      return reply({ error: quota ? 'Se alcanzó el límite de búsquedas de YouTube. Prueba más tarde.' :
        'YouTube no permitió la búsqueda. Revisa la configuración de la clave en el servidor.' }, quota ? 429 : 502);
    }
    const data = await response.json() as { items?: Video[] };
    const results = (data.items ?? []).filter(v => /^[\w-]{11}$/.test(v.id?.videoId ?? '')).map(v => ({
      id: v.id!.videoId!, title: v.snippet?.title ?? 'Sin título',
      channelTitle: v.snippet?.channelTitle ?? '', publishedAt: v.snippet?.publishedAt,
      thumbnail: v.snippet?.thumbnails?.medium?.url ?? '', duration: '',
      url: `https://www.youtube.com/watch?v=${v.id!.videoId!}`,
    }));
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(query.toLowerCase(), { results, expires: now + 300_000 });
    return reply({ results, provider: 'youtube-api' });
  } catch {
    return reply({ error: 'No se pudo conectar con YouTube. Reintenta más tarde.' }, 502);
  }
}
