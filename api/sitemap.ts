/**
 * Dynamic sitemap.xml — Vercel Edge Function.
 * Env: SUPABASE_URL or VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred) or anon key.
 */

export const config = { runtime: 'edge' };

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

async function loadCatalog() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';
  if (!url || !key) return [];

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/user_songs?select=song_id,title,updated_at&order=updated_at.desc&limit=5000`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    console.warn('[api/sitemap] supabase error', res.status, await res.text());
    return [];
  }
  const data = await res.json();
  const byId = new Map();
  for (const row of data || []) {
    if (!row?.song_id || byId.has(row.song_id)) continue;
    byId.set(row.song_id, { id: row.song_id, title: row.title || 'Canción' });
  }
  return [...byId.values()];
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler() {
  const catalog = await loadCatalog();
  const staticPaths = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/comunidad`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/favoritos`, changefreq: 'monthly', priority: '0.4' },
  ];
  const songPaths = catalog.map((song) => ({
    loc: `${SITE_URL}/cancion/${buildSongSlug(song, catalog)}`,
    changefreq: 'weekly',
    priority: '0.9',
  }));
  const urls = [...staticPaths, ...songPaths];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
