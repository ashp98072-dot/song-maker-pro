/**
 * SEO diagnostics — does not expose secrets.
 * GET /api/seo-status
 */

import { loadSeoCatalog } from './_seoCatalog.js';

export const config = { runtime: 'edge' };

export default async function handler() {
  const catalog = await loadSeoCatalog({ withChords: false });
  const sample = catalog.songs.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    slugHint: s.title,
  }));

  return new Response(
    JSON.stringify(
      {
        ok: catalog.songs.length > 0,
        songCount: catalog.songs.length,
        source: catalog.source,
        hasSupabaseUrl: catalog.hasUrl,
        hasServiceRole: catalog.hasServiceRole,
        hasAnonKey: catalog.hasAnonKey,
        error: catalog.error || null,
        sampleTitles: sample.map((s) => s.title),
        nextStep:
          catalog.songs.length > 0
            ? 'Submit https://worshiptranspose.com/sitemap.xml in Google Search Console'
            : catalog.hasServiceRole
              ? 'Service role is set but catalog is empty — check user_songs table'
              : 'Add SUPABASE_SERVICE_ROLE_KEY on Vercel (Production) OR run supabase migration seo_song_catalog',
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}
