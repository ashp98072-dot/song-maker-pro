import { supabase } from '@/integrations/supabase/client';

export type PublicProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  followersCount: number;
  followingCount: number;
  cadenasCount: number;
};

export async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[profile] fetch', error);
    throw error;
  }

  const [{ count: followersCount }, { count: followingCount }, { count: cadenasCount }] =
    await Promise.all([
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
      supabase
        .from('public_lists')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('is_active', true),
    ]);

  const displayName =
    profile?.display_name?.trim() ||
    'Músico';

  return {
    userId,
    displayName: profile ? displayName : 'Músico',
    avatarUrl: profile?.avatar_url ?? null,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    cadenasCount: cadenasCount ?? 0,
  };
}

export async function ensureOwnProfile(displayName?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const name =
    displayName?.trim() ||
    (typeof auth.user.user_metadata?.full_name === 'string'
      ? auth.user.user_metadata.full_name
      : null) ||
    auth.user.email?.split('@')[0] ||
    'Músico';

  await supabase.from('profiles').upsert(
    {
      user_id: auth.user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function updateOwnProfile(input: {
  displayName: string;
  avatarUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: 'Inicia sesión para editar tu perfil' };
  }

  const displayName = input.displayName.trim().slice(0, 60);
  if (!displayName) return { ok: false, error: 'El nombre no puede estar vacío' };

  const payload: {
    user_id: string;
    display_name: string;
    updated_at: string;
    avatar_url?: string | null;
  } = {
    user_id: auth.user.id,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };
  if (input.avatarUrl !== undefined) {
    payload.avatar_url = input.avatarUrl;
  }

  const { error } = await supabase.from('profiles').upsert(payload, {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('[profile] update', error);
    return { ok: false, error: error.message || 'No se pudo guardar el perfil' };
  }

  await supabase.auth.updateUser({
    data: { display_name: displayName, full_name: displayName },
  });

  emitProfileUpdated();
  return { ok: true };
}

export async function uploadAvatar(file: File): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: 'Inicia sesión para subir foto' };
  }

  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'El archivo debe ser una imagen' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'Máximo 2 MB' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${auth.user.id}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error('[profile] upload', uploadError);
    return { ok: false, error: uploadError.message || 'No se pudo subir la foto' };
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  return { ok: true, url };
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', auth.user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();
  return !!data;
}

export async function followUser(
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: 'Inicia sesión para seguir' };
  }
  if (auth.user.id === targetUserId) {
    return { ok: false, error: 'No puedes seguirte a ti mismo' };
  }

  const { error } = await supabase.from('user_follows').insert({
    follower_id: auth.user.id,
    following_id: targetUserId,
  });

  if (error) {
    if (error.code === '23505') return { ok: true };
    return { ok: false, error: error.message || 'No se pudo seguir' };
  }
  return { ok: true };
}

export async function unfollowUser(
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: 'Inicia sesión' };
  }

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', auth.user.id)
    .eq('following_id', targetUserId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo dejar de seguir' };
  }
  return { ok: true };
}

export const PROFILE_UPDATED_EVENT = 'wt-profile-updated';

export function emitProfileUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
  }
}

export async function fetchFollowingIds(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', auth.user.id);
  if (error) {
    console.error('[profile] following ids', error);
    return [];
  }
  return (data ?? []).map((r) => String(r.following_id));
}

export async function fetchOwnAvatarUrl(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  return data?.avatar_url ?? null;
}
