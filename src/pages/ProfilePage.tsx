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
  Database,
  Library,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ensureOwnProfile,
  fetchFollowerIds,
  fetchFollowingIdsForUser,
  fetchProfile,
  fetchProfilesByIds,
  followUser,
  isFollowing,
  unfollowUser,
  updateOwnProfile,
  uploadAvatar,
  type ProfileLite,
  type PublicProfile,
} from '@/features/profile/profileApi';
import { ProfileAvatar } from '@/features/profile/ProfileAvatar';
import { fetchPublicLists, type PublicListRow } from '@/features/community';

export default function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { userName, login, isGuest } = useApp();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [cadenas, setCadenas] = useState<PublicListRow[]>([]);
  const [followers, setFollowers] = useState<ProfileLite[]>([]);
  const [followingPeople, setFollowingPeople] = useState<ProfileLite[]>([]);
  const [peopleTab, setPeopleTab] = useState<'cadenas' | 'followers' | 'following'>('cadenas');
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
      const [p, lists, fol, followerIds, followingIds] = await Promise.all([
        fetchProfile(id),
        fetchPublicLists(80).then((all) => all.filter((l) => l.owner_id === id)),
        isFollowing(id),
        fetchFollowerIds(id),
        fetchFollowingIdsForUser(id),
      ]);
      const [followerProfiles, followingProfiles] = await Promise.all([
        fetchProfilesByIds(followerIds),
        fetchProfilesByIds(followingIds),
      ]);
      setProfile(p);
      setCadenas(lists);
      setFollowing(fol);
      setFollowers(followerProfiles);
      setFollowingPeople(followingProfiles);
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
      const wasFollowing = following;
      const result = wasFollowing
        ? await unfollowUser(targetId)
        : await followUser(targetId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setFollowing(!wasFollowing);
      setProfile((p) =>
        p
          ? {
              ...p,
              followersCount: Math.max(0, p.followersCount + (wasFollowing ? -1 : 1)),
            }
          : p
      );
      if (viewerId) {
        if (wasFollowing) {
          setFollowers((prev) => prev.filter((f) => f.userId !== viewerId));
        } else {
          const me = (await fetchProfilesByIds([viewerId]))[0];
          if (me) {
            setFollowers((prev) =>
              prev.some((f) => f.userId === me.userId) ? prev : [me, ...prev]
            );
          }
        }
      }
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
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl animate-in fade-in">
      {routeUserId && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      )}

      <div className="glass-card p-4 sm:p-6 mb-5 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
          <div className="relative shrink-0 self-center sm:self-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary overflow-hidden ring-2 ring-gold/30 flex items-center justify-center text-2xl sm:text-3xl font-bold text-foreground">
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
                  <button
                    type="button"
                    onClick={() => setPeopleTab('followers')}
                    className="inline-flex items-center gap-1 hover:text-gold"
                  >
                    <Users className="w-4 h-4 text-gold" />
                    {profile.followersCount} seguidores
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeopleTab('following')}
                    className="hover:text-gold"
                  >
                    {profile.followingCount} siguiendo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeopleTab('cadenas')}
                    className="inline-flex items-center gap-1 hover:text-gold"
                  >
                    <ListMusic className="w-4 h-4 text-gold" />
                    {profile.cadenasCount} cadenas
                  </button>
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

      <div className="sticky top-[var(--app-chrome-top,3.5rem)] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 bg-background/95 backdrop-blur-sm mb-4 border-b border-border">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'cadenas' as const, label: 'Cadenas' },
              { id: 'followers' as const, label: 'Seguidores' },
              { id: 'following' as const, label: 'Siguiendo' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeopleTab(tab.id)}
              className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                peopleTab === tab.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {peopleTab === 'cadenas' &&
        (cadenas.length === 0 ? (
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
        ))}

      {peopleTab === 'followers' &&
        (followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay seguidores.</p>
        ) : (
          <div className="space-y-2">
            {followers.map((p) => (
              <Link
                key={p.userId}
                to={`/perfil/${p.userId}`}
                className="glass-card p-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
              >
                <ProfileAvatar profile={p} size="sm" linkToProfile={false} />
                <span className="font-medium text-foreground">{p.displayName}</span>
              </Link>
            ))}
          </div>
        ))}

      {peopleTab === 'following' &&
        (followingPeople.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no sigue a nadie.</p>
        ) : (
          <div className="space-y-2">
            {followingPeople.map((p) => (
              <Link
                key={p.userId}
                to={`/perfil/${p.userId}`}
                className="glass-card p-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
              >
                <ProfileAvatar profile={p} size="sm" linkToProfile={false} />
                <span className="font-medium text-foreground">{p.displayName}</span>
              </Link>
            ))}
          </div>
        ))}

      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Herramientas
        </p>
        <div className="space-y-2">
          <Link
            to="/acordes"
            className="glass-card p-3 sm:p-4 flex items-center gap-3 hover:bg-surface-hover transition-colors"
          >
            <div className="p-2 rounded-lg bg-secondary text-gold shrink-0">
              <Library className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Herramientas musicales</p>
              <p className="text-xs text-muted-foreground">
                Acordes, afinador y test de registro vocal
              </p>
            </div>
          </Link>
          {isOwn && (
            <Link
              to="/backup"
              className="glass-card p-3 sm:p-4 flex items-center gap-3 hover:bg-surface-hover transition-colors"
            >
              <div className="p-2 rounded-lg bg-secondary text-gold shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Backup y restauración</p>
                <p className="text-xs text-muted-foreground">
                  Exporta o importa tu biblioteca (JSON / ChordPro)
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
