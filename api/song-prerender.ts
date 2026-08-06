/**
 * Crawler-friendly HTML for /cancion/:slug (bots only via vercel rewrite).
 * Humans still get the SPA.
 */

export const config = { runtime: 'edge' };

const SITE_NAME = 'Worship Transpose';
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://worshiptranspose.com').replace(
  /\/$/,
  ''
);

function slugifySongTitle(title) {
  return (
    (title ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'cancion'
  );
}

function buildSongSlug(song, allSongs) {
  const base = slugifySongTitle(song.title);
  const same = allSongs.filter((s) => slugifySongTitle(s.title) === base);
  if (same.length > 1) return `${base}-${song.id}`;
  return base;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chordsToLyricsPreview(chords, maxLen = 2500) {
  const lines = (chords || '')
    .split('\n')
    .map((line) =>
      line
        .replace(/\b[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G](#|b)?)?\b/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean);
  const text = lines.join('\n').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

function buildTitle(title, artist) {
  const t = title.trim() || 'Canción';
  const a = artist?.trim();
  return a
    ? `${t} - Letra y acordes | ${a} | ${SITE_NAME}`
    : `${t} - Letra y acordes | ${SITE_NAME}`;
}

function buildDescription(title, artist) {
  const t = title.trim() || 'Canción';
  const a = artist?.trim();
  return a
    ? `Letra y acordes de «${t}» de ${a}. Transpone el tono, ensaya y comparte en vivo con ${SITE_NAME}.`
    : `Letra y acordes de «${t}». Transpone el tono, ensaya y comparte en vivo con ${SITE_NAME}.`;
}

async function loadSongs() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';
  if (!url || !key) return [];

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/user_songs?select=song_id,title,artist,chords,updated_at&order=updated_at.desc&limit=5000`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const byId = new Map();
  for (const row of data || []) {
    if (!row?.song_id || byId.has(row.song_id)) continue;
    byId.set(row.song_id, {
      id: row.song_id,
      title: row.title || 'Canción',
      artist: row.artist || '',
      chords: row.chords || '',
    });
  }
  return [...byId.values()];
}

function findSong(catalog, slug) {
  if (!slug) return null;
  if (/^\d+$/.test(slug)) {
    return catalog.find((s) => s.id === slug) || null;
  }
  return catalog.find((s) => buildSongSlug(s, catalog) === slug) || null;
}

function renderHtml(song, slug) {
  const title = song.title || 'Canción';
  const artist = song.artist || '';
  const pageTitle = buildTitle(title, artist);
  const description = buildDescription(title, artist);
  const path = `/cancion/${slug || buildSongSlug(song, [song])}`;
  const url = `${SITE_URL}${path}`;
  const lyrics = chordsToLyricsPreview(song.chords);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicComposition',
    name: title,
    ...(artist
      ? {
          composer: { '@type': 'Person', name: artist },
          lyricist: { '@type': 'Person', name: artist },
        }
      : {}),
    inLanguage: 'es',
    url,
    lyrics: {
      '@type': 'CreativeWork',
      text: lyrics,
      inLanguage: 'es',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:image" content="${SITE_URL}/favicon.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#111}
    a{color:#b45309} pre{white-space:pre-wrap;background:#f6f6f6;padding:1rem;border-radius:8px}
  </style>
</head>
<body>
  <header>
    <p><a href="${SITE_URL}/">${escapeHtml(SITE_NAME)}</a></p>
    <h1>${escapeHtml(title)}</h1>
    ${artist ? `<p><strong>${escapeHtml(artist)}</strong></p>` : ''}
    <p>${escapeHtml(description)}</p>
  </header>
  <main>
    <h2>Letra y acordes</h2>
    <pre>${escapeHtml(lyrics || song.chords || 'Contenido disponible en la app.')}</pre>
    <p><a href="${escapeHtml(url)}">Abrir en ${escapeHtml(SITE_NAME)} (transponer / ensayo)</a></p>
  </main>
</body>
</html>`;
}

export default async function handler(req) {
  const incoming = new URL(req.url);
  const slug = (incoming.searchParams.get('slug') || '').trim();
  const catalog = await loadSongs();
  const song = findSong(catalog, slug);

  if (!song) {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Canción no encontrada | ${SITE_NAME}</title><meta name="robots" content="noindex"/></head><body><h1>Canción no encontrada</h1><p><a href="${SITE_URL}/">Volver a ${SITE_NAME}</a></p></body></html>`;
    return new Response(html, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const canonicalSlug = buildSongSlug(song, catalog);
  const html = renderHtml(song, canonicalSlug);
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'index,follow',
    },
  });
}
