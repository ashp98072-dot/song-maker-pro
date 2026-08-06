import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/types/music';
import { getUserSemitones } from '@/utils/userTranspositions';
import {
  buildListSlug,
  parseListSongsJson,
  songToSnapshot,
  type PublicListComment,
  type PublicListRow,
  type PublicListSongSnapshot,
} from '@/features/community/listTypes';

async function resolveOwnerName(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile?.display_name?.trim()) return profile.display_name.trim();

  const { data: auth } = await supabase.auth.getUser();
  const meta = auth.user?.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.display_name === 'string' && meta.display_name) ||
    '';
  if (fromMeta.trim()) return fromMeta.trim();
  return auth.user?.email?.split('@')[0] || 'Músico';
}

function mapListRow(row: Record<string, unknown>): PublicListRow {
  const songs = parseListSongsJson(row.songs);
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    owner_id: String(row.owner_id),
    owner_name: String(row.owner_name || ''),
    songs,
    song_count: typeof row.song_count === 'number' ? row.song_count : songs.length,
    is_active: row.is_active !== false,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  };
}

export async function fetchPublicLists(limit = 60): Promise<PublicListRow[]> {
  const { data, error } = await supabase
    .from('public_lists')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[community] fetchPublicLists', error);
    throw error;
  }
  return (data ?? []).map((row) => mapListRow(row as Record<string, unknown>));
}

export async function fetchPublicListBySlug(
  slug: string
): Promise<PublicListRow | null> {
  const { data, error } = await supabase
    .from('public_lists')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[community] fetchPublicListBySlug', error);
    throw error;
  }
  return data ? mapListRow(data as Record<string, unknown>) : null;
}

export type PublishListInput = {
  name: string;
  description?: string;
  songs: Song[];
  /** Prefer list id as slug suffix for stable republish. */
  sourceListId?: string;
};

export async function publishListAsCadena(
  input: PublishListInput
): Promise<{ ok: true; slug: string; id: string } | { ok: false; error: string }> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: 'Inicia sesión para publicar una cadena' };
  }
  if (!input.songs.length) {
    return { ok: false, error: 'La lista está vacía' };
  }

  const ownerName = await resolveOwnerName(authData.user.id);
  const snapshots: PublicListSongSnapshot[] = input.songs.map((s) =>
    songToSnapshot(s, getUserSemitones(s.id))
  );
  const slug = buildListSlug(input.name, input.sourceListId || authData.user.id);

  const payload = {
    slug,
    name: input.name.trim().slice(0, 120),
    description: input.description?.trim().slice(0, 500) || null,
    owner_id: authData.user.id,
    owner_name: ownerName,
    songs: snapshots as unknown as Json,
    song_count: snapshots.length,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  // Upsert by slug when republishing same private list id suffix.
  const { data, error } = await supabase
    .from('public_lists')
    .upsert(payload, { onConflict: 'slug' })
    .select('id, slug')
    .single();

  if (error) {
    console.error('[community] publishList', error);
    return { ok: false, error: error.message || 'No se pudo publicar la cadena' };
  }

  return { ok: true, slug: data.slug, id: data.id };
}

export async function fetchListComments(listId: string): Promise<PublicListComment[]> {
  const { data, error } = await supabase
    .from('public_list_comments')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[community] fetchListComments', error);
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    list_id: String(row.list_id),
    user_id: String(row.user_id),
    author_name: String(row.author_name || 'Músico'),
    body: String(row.body || ''),
    created_at: String(row.created_at || ''),
  }));
}

export async function postListComment(
  listId: string,
  body: string
): Promise<{ ok: true; comment: PublicListComment } | { ok: false; error: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Escribe un comentario' };
  if (trimmed.length > 1000) return { ok: false, error: 'Máximo 1000 caracteres' };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: 'Inicia sesión para comentar' };
  }

  const authorName = await resolveOwnerName(authData.user.id);
  const { data, error } = await supabase
    .from('public_list_comments')
    .insert({
      list_id: listId,
      user_id: authData.user.id,
      author_name: authorName,
      body: trimmed,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[community] postListComment', error);
    return { ok: false, error: error.message || 'No se pudo publicar el comentario' };
  }

  return {
    ok: true,
    comment: {
      id: String(data.id),
      list_id: String(data.list_id),
      user_id: String(data.user_id),
      author_name: String(data.author_name || authorName),
      body: String(data.body),
      created_at: String(data.created_at),
    },
  };
}
