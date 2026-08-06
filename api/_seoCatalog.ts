/**
 * Shared Supabase catalog loader for SEO edge routes.
 * Prefer SERVICE_ROLE; fall back to anon + optional RPC `seo_song_catalog`.
 */

export type SeoSongRow = {
  id: string;
  title: string;
  artist: string;
  chords: string;
};

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const key = serviceKey || anonKey;
  return {
    url,
    key,
    hasUrl: Boolean(url),
    hasServiceRole: Boolean(serviceKey),
    hasAnonKey: Boolean(anonKey),
    usingServiceRole: Boolean(serviceKey),
  };
}

function mapRows(data: any[] | null | undefined): SeoSongRow[] {
  const byId = new Map<string, SeoSongRow>();
  for (const row of data || []) {
    const id = String(row?.song_id ?? '');
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      id,
      title: row.title || 'Canción',
      artist: row.artist || '',
      chords: row.chords || '',
    });
  }
  return [...byId.values()];
}

async function restSelect(url: string, key: string, select: string) {
  const endpoint = `${url}/rest/v1/user_songs?select=${encodeURIComponent(select)}&order=created_at.desc&limit=5000`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: text.slice(0, 300), rows: [] as SeoSongRow[] };
  }
  try {
    return { ok: true as const, status: res.status, error: '', rows: mapRows(JSON.parse(text)) };
  } catch {
    return { ok: false as const, status: res.status, error: 'invalid json', rows: [] as SeoSongRow[] };
  }
}

async function rpcCatalog(url: string, key: string) {
  const endpoint = `${url}/rest/v1/rpc/seo_song_catalog`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_limit: 5000 }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: text.slice(0, 300), rows: [] as SeoSongRow[] };
  }
  try {
    return { ok: true as const, status: res.status, error: '', rows: mapRows(JSON.parse(text)) };
  } catch {
    return { ok: false as const, status: res.status, error: 'invalid rpc json', rows: [] as SeoSongRow[] };
  }
}

export type SeoCatalogResult = {
  songs: SeoSongRow[];
  source: 'service_role' | 'anon' | 'rpc' | 'empty';
  hasUrl: boolean;
  hasServiceRole: boolean;
  hasAnonKey: boolean;
  error?: string;
};

export async function loadSeoCatalog(opts?: { withChords?: boolean }): Promise<SeoCatalogResult> {
  const cfg = supabaseConfig();
  if (!cfg.url || !cfg.key) {
    return {
      songs: [],
      source: 'empty',
      hasUrl: cfg.hasUrl,
      hasServiceRole: cfg.hasServiceRole,
      hasAnonKey: cfg.hasAnonKey,
      error: 'missing_supabase_env',
    };
  }

  const select = opts?.withChords
    ? 'song_id,title,artist,chords,created_at'
    : 'song_id,title,artist,created_at';

  const primary = await restSelect(cfg.url, cfg.key, select);
  if (primary.ok && primary.rows.length > 0) {
    return {
      songs: primary.rows,
      source: cfg.usingServiceRole ? 'service_role' : 'anon',
      hasUrl: cfg.hasUrl,
      hasServiceRole: cfg.hasServiceRole,
      hasAnonKey: cfg.hasAnonKey,
    };
  }

  // RLS often blocks anon table SELECT — try public SEO RPC.
  const rpc = await rpcCatalog(cfg.url, cfg.key);
  if (rpc.ok && rpc.rows.length > 0) {
    return {
      songs: rpc.rows,
      source: 'rpc',
      hasUrl: cfg.hasUrl,
      hasServiceRole: cfg.hasServiceRole,
      hasAnonKey: cfg.hasAnonKey,
    };
  }

  return {
    songs: [],
    source: 'empty',
    hasUrl: cfg.hasUrl,
    hasServiceRole: cfg.hasServiceRole,
    hasAnonKey: cfg.hasAnonKey,
    error: primary.error || rpc.error || 'no_rows',
  };
}

export function slugifySongTitle(title: string | null | undefined) {
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

export function buildSongSlug(
  song: { id: string; title: string },
  allSongs: { id: string; title: string }[]
) {
  const base = slugifySongTitle(song.title);
  const same = allSongs.filter((s) => slugifySongTitle(s.title) === base);
  if (same.length > 1) return `${base}-${song.id}`;
  return base;
}
