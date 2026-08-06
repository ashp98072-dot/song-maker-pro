import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Loader2,
  ListMusic,
  UserPlus,
  UserMinus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ensureOwnProfile,
  fetchProfile,
  followUser,
  isFollowing,
  unfollowUser,
  updateOwnProfile,
  uploadAvatar,
  type PublicProfile,
} from '@/features/profile/profileApi';
import { fetchPublicLists, type PublicListRow } from '@/features/community';

export default function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { userName, login, isGuest } = useApp();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [cadenas, setCadenas] = useState<PublicListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const targetId = routeUserId || viewerId;
  const isOwn = !!(viewerId && targetId && viewerId === targetId);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    const id = routeUserId || (await supabase.auth.getUser()).data.user?.id;
    if (!id) {
      setLoading(false);
      setProfile(null);
      return;
    }
    setLoading(true);
    try {
      if (!routeUserId) {
        await ensureOwnProfile(userName);
      }
      const [p, lists, fol] = await Promise.all([
        fetchProfile(id),
        fetchPublicLists(80).then((all) => all.filter((l) => l.owner_id === id)),
        isFollowing(id),
      ]);
      setProfile(p);
      setCadenas(lists);
      setFollowing(fol);
      if (p) setDisplayName(p.displayName);
    } catch {
      toast.error('No se pudo cargar el perfil');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [routeUserId, userName]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!isOwn || saving) return;
    setSaving(true);
    try {
      const result = await updateOwnProfile({
        displayName,
        avatarUrl: profile?.avatarUrl,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      login(displayName.trim());
      setEditing(false);
      toast.success('Perfil actualizado');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file || !isOwn) return;
    setUploading(true);
    try {
      const uploaded = await uploadAvatar(file);
      if (!uploaded.ok) {
        toast.error(uploaded.error);
        return;
      }
      const saved = await updateOwnProfile({
        displayName: displayName || profile?.displayName || userName,
        avatarUrl: uploaded.url,
      });
      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }
      toast.success('Foto actualizada');
      await load();
    } finally {
      setUploading(false);
    }
  };

  const toggleFollow = async () => {
    if (!targetId || isOwn || followBusy) return;
    if (!viewerId) {
      toast.error('Inicia sesión para seguir');
      navigate('/login');
      return;
    }
    setFollowBusy(true);
    try {
      const result = following
        ? await unfollowUser(targetId)
        : await followUser(targetId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setFollowing(!following);
      setProfile((p) =>
        p
          ? {
              ...p,
              followersCount: Math.max(
                0,
                p.followersCount + (following ? -1 : 1)
              ),
            }
          : p
      );
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-20 flex justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando perfil…
      </div>
    );
  }

  if (!targetId || !profile) {
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          {isGuest || !viewerId
            ? 'Inicia sesión para ver y editar tu perfil.'
            : 'Perfil no encontrado.'}
        </p>
        <Link to={viewerId ? '/comunidad' : '/login'} className="text-gold hover:underline">
          {viewerId ? 'Ir a Comunidad' : 'Iniciar sesión'}
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-3xl animate-in fade-in">
      {routeUserId && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      )}

      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-secondary overflow-hidden ring-2 ring-gold/30 flex items-center justify-center text-3xl font-bold text-foreground">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 rounded-full gold-gradient text-primary-foreground shadow-md disabled:opacity-50"
                  title="Subir foto"
                  aria-label="Subir foto de perfil"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
                />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0 w-full">
            {editing && isOwn ? (
              <div className="space-y-3">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nombre para mostrar"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    disabled={saving || !displayName.trim()}
                    className="px-4 py-2 rounded-xl gold-gradient text-primary-foreground text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(profile.displayName);
                    }}
                    className="px-4 py-2 rounded-xl border border-border text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold font-display text-foreground truncate">
                  {profile.displayName}
                </h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-4 h-4 text-gold" />
                    {profile.followersCount} seguidores
                  </span>
                  <span>{profile.followingCount} siguiendo</span>
                  <span className="inline-flex items-center gap-1">
                    <ListMusic className="w-4 h-4 text-gold" />
                    {profile.cadenasCount} cadenas
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 rounded-xl border border-border text-sm font-bold hover:bg-secondary"
                    >
                      Editar perfil
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggleFollow()}
                      disabled={followBusy}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 ${
                        following
                          ? 'border border-border hover:bg-secondary'
                          : 'gold-gradient text-primary-foreground'
                      }`}
                    >
                      {followBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : following ? (
                        <UserMinus className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {following ? 'Dejar de seguir' : 'Seguir'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold font-display text-foreground mb-4">
        Cadenas públicas
      </h2>
      {cadenas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwn
            ? 'Aún no has publicado cadenas. Hazlo desde Mis Listas.'
            : 'Este músico aún no tiene cadenas públicas.'}
        </p>
      ) : (
        <div className="space-y-3">
          {cadenas.map((c) => (
            <Link
              key={c.id}
              to={`/comunidad/cadena/${c.slug}`}
              className="glass-card p-4 block hover:bg-surface-hover transition-colors"
            >
              <p className="font-semibold text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {c.song_count} canciones
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
