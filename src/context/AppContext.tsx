import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppState, Song, SongList } from '@/types/music';
import { SAMPLE_SONGS } from '@/data/songs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadVisitedSongsCache, mergeVisitedSongsIntoSongs } from '@/pwa/visitedSongsCache';
import { clearAuthenticatedDirectorCache } from '@/features/director-session/utils/liveSessionAuth';

interface AppContextType extends AppState {
  isLoading: boolean;
  isAdmin: boolean;
  login: (name: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
  addSong: (song: Song) => void;
  updateSong: (id: string, updatedSong: Partial<Song>) => void;
  toggleFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
  createList: (name: string) => Promise<string | null>;
  deleteList: (listId: string) => void;
  renameList: (listId: string, newName: string) => void;
  addSongToList: (listId: string, songId: string) => void;
  removeSongFromList: (listId: string, songId: string) => void;
  setListSongs: (listId: string, songIds: string[]) => Promise<void>;
  importLibrary: (songs: Song[], favorites: string[], lists: SongList[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const STORAGE_KEY = 'worship-transpose-state';

function loadState(): Partial<AppState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const saved = loadState();
  
  const [isGuest, setIsGuest] = useState(saved.isGuest ?? false);
  const [userName, setUserName] = useState(saved.userName ?? ''); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [songs, setSongs] = useState<Song[]>(() => {
    const custom = saved.songs ?? [];
    const customMap = new Map(custom.map(s => [s.id, s]));
    
    return [...SAMPLE_SONGS, ...custom].filter((song, index, self) => 
      index === self.findIndex((t) => t.id === song.id)
    ).map(s => {
      const savedVersion = customMap.get(s.id);
      return {
        ...(savedVersion || s),
        scaleMode: (savedVersion || s).scaleMode || ('major' as const),
      };
    });
  });
  
  const [favorites, setFavorites] = useState<string[]>(saved.favorites ?? []);
  const [lists, setLists] = useState<SongList[]>(saved.lists ?? []);
  const userIdRef = useRef<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Sincronización de Listas (Corregido para usar user_lists y JSON) ---
  const fetchCloudLists = async (userId: string) => {
    try {
      const { data: pls, error } = await supabase
        .from('user_lists')
        .select('id, name, created_at, song_ids')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error || !pls) return;

      const cloudLists: SongList[] = pls.map((p) => ({
        id: p.id,
        name: p.name,
        songIds: Array.isArray(p.song_ids)
          ? (p.song_ids as unknown[]).filter((x): x is string => typeof x === 'string')
          : [],
        createdAt: new Date(p.created_at).toLocaleDateString(),
      }));

      setLists(cloudLists);
    } catch (err) {
      console.error('fetchCloudLists falló:', err);
    }
  };

  const cloudRowToSong = (us: any): Song => {
    const baseKey = us.key || 'C';
    const isMinor = typeof baseKey === 'string' && /m($|[^a])/.test(baseKey);
    return {
      id: us.song_id,
      title: us.title || 'Nueva Canción',
      artist: us.artist || 'Artista Desconocido',
      originalKey: baseKey,
      originalGender: 'male',
      scaleMode: isMinor ? 'minor' : 'major',
      lyrics: '',
      chords: us.chords || '',
      key: baseKey,
      bpm: us.bpm || undefined,
      youtubeUrl: us.youtube_url?.trim() || undefined,
      isNew: true,
    };
  };

  /** Community public_songs → shared Home catalog (does not overwrite local/cloud rows). */
  const mergePublicSongsCatalog = async () => {
    try {
      const { fetchPublicSongs } = await import('@/features/community/publicSongsApi');
      const { songDedupeKey } = await import(
        '@/features/song-import/utils/normalizeImportedSong'
      );
      const publicSongs = await fetchPublicSongs(500);
      if (!publicSongs.length) return;
      setSongs((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        const keys = new Set(prev.map((s) => songDedupeKey(s.title, s.artist)));
        const incoming = publicSongs.filter(
          (s) => !ids.has(s.id) && !keys.has(songDedupeKey(s.title, s.artist))
        );
        return incoming.length ? [...prev, ...incoming] : prev;
      });
    } catch (err) {
      console.warn('public_songs hydrate failed:', err);
    }
  };

  const fetchGlobalCloudData = async () => {
    try {
      const [{ data, error }, { data: appRows }] = await Promise.all([
        supabase.from('user_songs').select('*'),
        supabase.from('app_songs').select('*'),
      ]);
      const appMap = new Map<string, any>(
        Array.isArray(appRows) ? appRows.map((a: any) => [a.song_id, a]) : []
      );

      let cloudRows = data && !error && Array.isArray(data) ? data : [];

      // Guests / anon often hit RLS empty — public SEO RPC still has the catalog.
      if (!cloudRows.length) {
        try {
          const { fetchSongsViaSeoCatalog } = await import('@/utils/songSlug');
          const seoSongs = await fetchSongsViaSeoCatalog();
          if (seoSongs.length) {
            setSongs((prev) => {
              const existingIds = new Set(prev.map((s) => s.id));
              const incoming = seoSongs.filter((s) => !existingIds.has(s.id));
              return incoming.length ? [...incoming, ...prev] : prev;
            });
          }
        } catch (seoErr) {
          console.warn('SEO catalog hydrate failed:', seoErr);
        }
      }

      if (cloudRows.length) {
        setSongs(prev => {
          const cloudSongsMap = new Map<string, any>(cloudRows.map((us) => [us.song_id, us]));
          const updatedExisting = prev.map(originalSong => {
            const globalVersion = cloudSongsMap.get(originalSong.id);
            const adminOverride = appMap.get(originalSong.id);
            let next = originalSong;
            if (globalVersion) {
              next = {
                ...next,
                chords: globalVersion.chords || originalSong.chords,
                title: globalVersion.title || originalSong.title,
                artist: globalVersion.artist || originalSong.artist,
                key: globalVersion.key || originalSong.key,
                bpm: globalVersion.bpm || originalSong.bpm,
                youtubeUrl: globalVersion.youtube_url?.trim() || originalSong.youtubeUrl,
              };
            }
            if (adminOverride) {
              next = {
                ...next,
                originalGender: (adminOverride.original_gender as any) || next.originalGender,
                originalKey: adminOverride.original_key || next.originalKey,
                scaleMode: (adminOverride.scale_mode as any) || next.scaleMode,
              };
            }
            return next;
          });

          const existingIds = new Set(updatedExisting.map(s => s.id));
          const newSongsFromCloud: Song[] = cloudRows
            .filter((us) => !existingIds.has(us.song_id))
            .map(cloudRowToSong);

          return [...newSongsFromCloud, ...updatedExisting];
        });
      }
    } catch (err) {
      console.error("Error al sincronizar datos globales:", err);
    }
    await mergePublicSongsCatalog();
  };

  useEffect(() => {
    let cancelled = false;

    const applyIdentity = (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        const name =
          (typeof meta.full_name === 'string' && meta.full_name) ||
          (typeof meta.name === 'string' && meta.name) ||
          session.user.email?.split('@')[0] ||
          'Usuario';
        setUserName(name);
        setIsGuest(false);
        userIdRef.current = session.user.id;
        return session.user.id as string;
      }
      if (saved.isGuest) {
        setUserName('Invitado');
        setIsGuest(true);
        userIdRef.current = null;
        setIsAdmin(false);
        return null;
      }
      setUserName('');
      setIsGuest(false);
      userIdRef.current = null;
      setIsAdmin(false);
      return null;
    };

    const hydrateCloudInBackground = async (userId: string | null) => {
      try {
        await fetchGlobalCloudData();
        if (cancelled || !userId) return;
        await fetchCloudLists(userId);
        if (cancelled) return;

        try {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          if (!cancelled) {
            setIsAdmin(Array.isArray(roles) && roles.some((r: { role: string }) => r.role === 'admin'));
          }
        } catch {
          if (!cancelled) setIsAdmin(false);
        }

        try {
          const { data: favs } = await supabase
            .from('user_favorites')
            .select('song_id')
            .eq('user_id', userId);
          if (!cancelled && Array.isArray(favs)) {
            setFavorites((prev) => {
              const cloudIds = favs.map((f: { song_id: string }) => f.song_id);
              return Array.from(new Set([...cloudIds, ...prev]));
            });
          }
        } catch (err) {
          console.error('Hidratar favoritos falló:', err);
        }
      } catch (err) {
        console.error('Hydrate cloud failed:', err);
      }
    };

    const syncUser = async (session: unknown) => {
      const userId = applyIdentity(session as Parameters<typeof applyIdentity>[0]);
      // Unblock AuthManager immediately — never wait on cloud/network for first paint.
      setIsLoading(false);
      void hydrateCloudInBackground(userId);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) void syncUser(session);
    });

    // Fail-open: if getSession never resolves, still show the app.
    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('[AUTH] boot timeout — clearing isLoading');
        setIsLoading(false);
      }
    }, 6000);

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthenticatedDirectorCache();
        setUserName('');
        setIsGuest(false);
        userIdRef.current = null;
        setIsAdmin(false);
        setLists([]);
        setFavorites([]);
        setIsLoading(false);
        return;
      }
      // Avoid re-blocking the UI on TOKEN_REFRESHED / noisy events.
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        void syncUser(session);
      }
    });

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_songs' },
        (payload) => {
          const updatedSong = payload.new as Record<string, unknown>;
          if (updatedSong) {
            setSongs((prev) => {
              const songId = String(updatedSong.song_id ?? '');
              const exists = prev.some((s) => s.id === songId);
              if (!exists) {
                const newSong = cloudRowToSong(updatedSong);
                toast.success(`✨ Nueva canción: ${newSong.title}`);
                return [newSong, ...prev];
              }
              return prev.map((s) =>
                s.id === songId
                  ? {
                      ...s,
                      key: (updatedSong.key as string) || s.key,
                      chords: (updatedSong.chords as string) || s.chords,
                      title: (updatedSong.title as string) || s.title,
                      artist: (updatedSong.artist as string) || s.artist,
                      bpm: (updatedSong.bpm as number) || s.bpm,
                      youtubeUrl:
                        (typeof updatedSong.youtube_url === 'string'
                          ? updatedSong.youtube_url.trim()
                          : undefined) || s.youtubeUrl,
                    }
                  : s
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveState({ isGuest, userName, songs, favorites, lists });
    }
  }, [isGuest, userName, songs, favorites, lists, isLoading]);

  // Canciones visitadas recientes (IndexedDB) para uso offline parcial
  useEffect(() => {
    if (isLoading) return;
    loadVisitedSongsCache().then((cached) => {
      if (!cached.length) return;
      setSongs((prev) => mergeVisitedSongsIntoSongs(prev, cached));
    });
  }, [isLoading]);

  const login = (name: string) => { setUserName(name); setIsGuest(false); };
  const loginAsGuest = () => { setUserName('Invitado'); setIsGuest(true); };
  
  const logout = async () => {
    await supabase.auth.signOut();
    setUserName('');
    setIsGuest(false);
    setIsAdmin(false);
    userIdRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/login'; 
  };

  const addSong = async (song: Song) => {
    const localSong: Song = { ...song, isNew: true };
    setSongs(prev => [localSong, ...prev.filter(s => s.id !== song.id)]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase
        .from('user_songs')
        .upsert({
          song_id: song.id,
          user_id: session.user.id,
          title: song.title,
          artist: song.artist,
          key: song.key || song.originalKey,
          chords: song.chords,
          bpm: song.bpm || null,
          youtube_url: song.youtubeUrl?.trim() || null,
        }, { onConflict: 'song_id' });
    } catch (err) {
      console.error('AddSong sync falló:', err);
    }
  };

  const updateSong = async (id: string, updatedFields: Partial<Song>) => {
    let mergedSong: Song | undefined;
    setSongs(prev =>
      prev.map(song => {
        if (song.id !== id) return song;
        mergedSong = { ...song, ...updatedFields };
        return mergedSong;
      })
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mergedSong) return;
      await supabase
        .from('user_songs')
        .upsert({
          song_id: id,
          user_id: session.user.id,
          chords: mergedSong.chords,
          title: mergedSong.title,
          artist: mergedSong.artist,
          key: mergedSong.key,
          bpm: mergedSong.bpm ?? null,
          youtube_url: mergedSong.youtubeUrl?.trim() || null,
        }, { onConflict: 'song_id' });
    } catch (err) {
      console.error('UpdateSong sync falló:', err);
    }
  };

  const toggleFavorite = (songId: string) => {
    let nextIsFav = false;
    setFavorites(prev => {
      const exists = prev.includes(songId);
      nextIsFav = !exists;
      return exists ? prev.filter(id => id !== songId) : [...prev, songId];
    });

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        if (nextIsFav) {
          await supabase
            .from('user_favorites')
            .upsert({ user_id: session.user.id, song_id: songId }, { onConflict: 'user_id,song_id' });
        } else {
          await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('song_id', songId);
        }
      } catch (err) {
        console.error('Sync favoritos falló:', err);
      }
    })();
  };

  const isFavorite = (songId: string) => favorites.includes(songId);

  // --- Funciones de Listas corregidas para usar user_lists y song_ids (JSONB) ---

  const createList = async (name: string): Promise<string | null> => {
    const uid = userIdRef.current;
    if (uid) {
      const { data, error } = await supabase
        .from('user_lists')
        .insert({ user_id: uid, name, song_ids: [] })
        .select('id, created_at')
        .single();
      
      if (error || !data) {
        toast.error('Error al crear lista en la nube');
        return null;
      }
      const newList: SongList = { id: data.id, name, songIds: [], createdAt: new Date(data.created_at).toLocaleDateString() };
      setLists(prev => [...prev, newList]);
      return data.id;
    }
    const localId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setLists(prev => [...prev, { id: localId, name, songIds: [], createdAt: new Date().toLocaleDateString() }]);
    return localId;
  };

  const deleteList = async (listId: string) => {
    setLists(prev => prev.filter(l => l.id !== listId));
    if (userIdRef.current) {
      const { error } = await supabase.from('user_lists').delete().eq('id', listId);
      if (error) console.error('Error deleteList:', error);
    }
  };

  const renameList = async (listId: string, newName: string) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name: newName } : l));
    if (userIdRef.current) {
      await supabase.from('user_lists').update({ name: newName }).eq('id', listId);
    }
  };

  const addSongToList = async (listId: string, songId: string) => {
    const currentList = lists.find(l => l.id === listId);
    if (!currentList || currentList.songIds.includes(songId)) return;

    const updatedSongIds = [...currentList.songIds, songId];

    // Actualización local optimista
    setLists(prev => prev.map(l => l.id === listId ? { ...l, songIds: updatedSongIds } : l));

    if (userIdRef.current) {
      const { error } = await supabase
        .from('user_lists')
        .update({ song_ids: updatedSongIds })
        .eq('id', listId);
      
      if (error) {
        console.error('Error addSongToList:', error);
        toast.error('Error al sincronizar la lista');
      }
    }
  };

  const removeSongFromList = async (listId: string, songId: string) => {
    const currentList = lists.find(l => l.id === listId);
    if (!currentList) return;

    const updatedSongIds = currentList.songIds.filter(id => id !== songId);

    // Actualización local
    setLists(prev => prev.map(l => l.id === listId ? { ...l, songIds: updatedSongIds } : l));

    if (userIdRef.current) {
      await supabase
        .from('user_lists')
        .update({ song_ids: updatedSongIds })
        .eq('id', listId);
    }
  };

  // Set the full song list atomically (used by importer to avoid stale-closure bugs)
  const setListSongs = async (listId: string, songIds: string[]) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, songIds } : l));
    if (userIdRef.current) {
      const { error } = await supabase
        .from('user_lists')
        .update({ song_ids: songIds })
        .eq('id', listId);
      if (error) {
        console.error('setListSongs error:', error);
        toast.error(`No se pudo sincronizar la lista: ${error.message}`);
      }
    }
  };

  const importLibrary = (importedSongs: Song[], importedFavorites: string[], importedLists: SongList[]) => {
    setSongs(prev => {
      const existing = new Set(prev.map(s => s.id));
      const newSongs = importedSongs.filter(s => !existing.has(s.id));
      return [...prev, ...newSongs];
    });
    setFavorites(prev => [...new Set([...prev, ...importedFavorites])]);
    setLists(prev => {
      const existing = new Set(prev.map(l => l.id));
      const newLists = importedLists.filter(l => !existing.has(l.id));
      return [...prev, ...newLists];
    });
  };

  return (
    <AppContext.Provider value={{ 
      isGuest, userName, songs, favorites, lists, isLoading, isAdmin,
      login, loginAsGuest, logout, addSong, updateSong,
      toggleFavorite, isFavorite, createList, 
      deleteList, renameList, addSongToList, 
      removeSongFromList, setListSongs, importLibrary 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
