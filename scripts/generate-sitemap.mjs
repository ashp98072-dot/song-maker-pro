import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'public', 'sitemap.xml');

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://worshiptranspose.com').replace(
  /\/$/,
  ''
);

function slugifySongTitle(title) {
  return (title ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'cancion';
}

function buildSongSlug(song, allSongs) {
  const base = slugifySongTitle(song.title);
  const same = allSongs.filter((s) => slugifySongTitle(s.title) === base);
  if (same.length > 1) return `${base}-${song.id}`;
  return base;
}

/** Optional JSON: [{ "id": "...", "title": "..." }, ...] */
let catalog = [];
const songsJson = process.env.SITEMAP_SONGS_JSON;
if (songsJson) {
  try {
    catalog = JSON.parse(songsJson);
  } catch {
    console.warn('[sitemap] SITEMAP_SONGS_JSON invalid JSON — skipping song URLs');
  }
}

if (!catalog.length && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('user_songs')
      .select('song_id, title')
      .order('updated_at', { ascending: false })
      .limit(5000);
    if (error) {
      console.warn('[sitemap] Supabase fetch failed:', error.message);
    } else if (data?.length) {
      const byId = new Map();
      for (const row of data) {
        if (!byId.has(row.song_id)) {
          byId.set(row.song_id, { id: row.song_id, title: row.title || 'Canción' });
        }
      }
      catalog = [...byId.values()];
      console.log(`[sitemap] loaded ${catalog.length} songs from Supabase`);
    }
  } catch (err) {
    console.warn('[sitemap] Supabase client unavailable:', err?.message ?? err);
  }
}

const staticPaths = [
  { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${siteUrl}/comunidad`, changefreq: 'weekly', priority: '0.7' },
];

const songPaths = catalog.map((song) => ({
  loc: `${siteUrl}/cancion/${buildSongSlug(song, catalog)}`,
  changefreq: 'monthly',
  priority: '0.8',
}));

const urls = [...staticPaths, ...songPaths];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, xml, 'utf8');
console.log(`[sitemap] wrote ${urls.length} URLs → public/sitemap.xml`);
