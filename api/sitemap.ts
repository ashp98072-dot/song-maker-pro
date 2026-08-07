/**
 * Dynamic sitemap.xml — Vercel Edge Function.
 */

import { buildSongSlug, loadSeoCatalog } from './_seoCatalog.js';

export const config = { runtime: 'edge' };

const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://worshiptranspose.com').replace(
  /\/$/,
  ''
);

function escapeXml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler() {
  const catalog = await loadSeoCatalog({ withChords: false });
  const songs = catalog.songs;

  const staticPaths = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/comunidad`, changefreq: 'weekly', priority: '0.8' },
  ];
  const songPaths = songs.map((song) => ({
    loc: `${SITE_URL}/cancion/${buildSongSlug(song, songs)}`,
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
      'X-Seo-Song-Count': String(songs.length),
      'X-Seo-Source': catalog.source,
      ...(catalog.hasServiceRole ? {} : { 'X-Seo-Hint': 'set SUPABASE_SERVICE_ROLE_KEY or apply seo_song_catalog RPC' }),
    },
  });
}
