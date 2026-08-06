// Hook que sincroniza los ajustes por canción con la nube (user_song_settings)
// y mantiene fallback local para invitados / offline.
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserSemitones, setUserSemitones } from '@/utils/userTranspositions';
import { toast } from 'sonner';

export interface SongSettings {
  customSemitones: number;
  vocalRegister: string; // '' | VocalRegister
  genderShift: string;   // '' | 'male' | 'female'
  fontSize: number;
  isFavorite: boolean;
  ytDelayMs: number;
}

export const EMPTY_SONG_SETTINGS: SongSettings = {
  customSemitones: 0,
  vocalRegister: '',
  genderShift: '',
  fontSize: 16,
  isFavorite: false,
  ytDelayMs: 0,
};

type SongSettingsUpdate = SongSettings | ((prev: SongSettings) => SongSettings);

const FONT_KEY = 'worship-font-sizes';
const REG_KEY = 'worship-vocal-registers';
const GEN_KEY = 'worship-gender-shifts';
const YT_DELAY_KEY = 'worship-yt-delays';

function readMap(key: string): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function writeMap(key: string, map: Record<string, any>) {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
}

function getLocalDefaults(songId: string): SongSettings {
  return {
    customSemitones: getUserSemitones(songId),
    vocalRegister: readMap(REG_KEY)[songId] || '',
    genderShift: readMap(GEN_KEY)[songId] || '',
    fontSize: readMap(FONT_KEY)[songId] || 16,
    isFavorite: false,
    ytDelayMs: readMap(YT_DELAY_KEY)[songId] ?? 0,
  };
}

export function useSongSettings(songId: string | undefined) {
  const [settings, setSettingsRaw] = useState<SongSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isLoadedRef = useRef(false);
  const loadedSongIdRef = useRef<string | null>(null);
  const cloudAppliedAtRef = useRef<number>(0);
  const skipNextAutosaveRef = useRef(true);
  const fallbackAppliedRef = useRef(false);
  const canPersistRef = useRef(false);
  const [authTick, setAuthTick] = useState(0);

  // Wrapper: ignora cambios externos mientras los datos de la nube no se hayan asentado.
  // Esto evita que efectos de inicialización del consumidor pisen los valores guardados.
  const setSettings = useCallback((updater: SongSettingsUpdate) => {
    if (!isLoadedRef.current || !loadedSongIdRef.current) {
      console.log('[useSongSettings] setSettings ignorado (cloud aún no asentado)');
      return;
    }
    setSettingsRaw(prev => {
      if (!prev) return prev;
      return typeof updater === 'function' ? (updater as (p: SongSettings) => SongSettings)(prev) : updater;
    });
  }, []);

  // Re-cargar cuando cambia el estado de autenticación (login tardío al recargar)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newId = session?.user?.id || null;
      if (newId !== userIdRef.current) {
        userIdRef.current = newId;
        setAuthTick(t => t + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cargar desde nube al cambiar canción / usuario
  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    let settled = false;
    isLoadedRef.current = false;
    loadedSongIdRef.current = null;
    skipNextAutosaveRef.current = true;
    fallbackAppliedRef.current = false;
    canPersistRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoaded(false);
    setSettingsRaw(null);

    const fallbackTimer = setTimeout(() => {
      if (cancelled || settled) return;
      fallbackAppliedRef.current = true;
      cloudAppliedAtRef.current = Date.now();
      isLoadedRef.current = true;
      loadedSongIdRef.current = songId;
      setSettingsRaw(getLocalDefaults(songId));
      setIsLoaded(true);
      console.warn('[useSongSettings] timeout de carga; usando ajustes locales temporales', songId);
    }, 3000);
    
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      userIdRef.current = session?.user?.id || null;
      const local = session?.user ? EMPTY_SONG_SETTINGS : getLocalDefaults(songId);

      if (!session?.user) {
        if (!cancelled) {
          settled = true;
          clearTimeout(fallbackTimer);
          setSettingsRaw(local);
          cloudAppliedAtRef.current = Date.now();
          isLoadedRef.current = true;
          canPersistRef.current = true;
          loadedSongIdRef.current = songId;
          setIsLoaded(true);
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_song_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('song_id', songId)
        .maybeSingle();

      if (cancelled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      if (fallbackAppliedRef.current) skipNextAutosaveRef.current = true;

      if (data && !error) {
        setSettingsRaw({
          customSemitones: data.custom_semitones ?? data.semitones ?? local.customSemitones,
          vocalRegister: data.vocal_register || '',
          genderShift: data.gender_shift === 1 ? 'female' : data.gender_shift === -1 ? 'male' : '',
          fontSize: data.font_size || 16,
          isFavorite: !!data.is_favorite,
          ytDelayMs: data.yt_delay_ms ?? local.ytDelayMs,
        });
        console.log('[useSongSettings] cargado desde nube', songId, {
          custom_semitones: data.custom_semitones,
          font_size: data.font_size,
          vocal_register: data.vocal_register,
        });
      } else {
        if (error) console.warn('[useSongSettings] fetch error', error);
        setSettingsRaw(getLocalDefaults(songId));
      }
      cloudAppliedAtRef.current = Date.now();
      isLoadedRef.current = true;
      canPersistRef.current = true;
      loadedSongIdRef.current = songId;
      setIsLoaded(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [songId, authTick]);

  // Persistencia en nube + local
  const persist = useCallback(async (s: SongSettings | null, opts?: { silent?: boolean }) => {
    if (!songId || !s || !canPersistRef.current || !isLoadedRef.current || loadedSongIdRef.current !== songId) return;

    // 1. Persistencia Local (Siempre se ejecuta como fallback)
    setUserSemitones(songId, s.customSemitones);
    const fonts = readMap(FONT_KEY); fonts[songId] = s.fontSize; writeMap(FONT_KEY, fonts);
    const regs = readMap(REG_KEY); if (s.vocalRegister) regs[songId] = s.vocalRegister; else delete regs[songId]; writeMap(REG_KEY, regs);
    const gens = readMap(GEN_KEY); if (s.genderShift) gens[songId] = s.genderShift; else delete gens[songId]; writeMap(GEN_KEY, gens);
    const yts = readMap(YT_DELAY_KEY); yts[songId] = s.ytDelayMs; writeMap(YT_DELAY_KEY, yts);

    // 2. Persistencia en Nube (Solo si hay usuario)
    const userId = userIdRef.current;
    if (!userId) return;

    setIsSaving(true);
    try {
      // Mapeo de React a Base de Datos
      const { error } = await supabase
        .from('user_song_settings')
        .upsert({
          user_id: userId,
          song_id: songId,
          custom_semitones: s.customSemitones,
          semitones: s.customSemitones, // Mantenemos ambos por compatibilidad de esquemas
          vocal_register: s.vocalRegister || null,
          gender_shift: s.genderShift === 'female' ? 1 : s.genderShift === 'male' ? -1 : 0,
          font_size: s.fontSize,
          is_favorite: s.isFavorite,
          yt_delay_ms: Math.round(s.ytDelayMs), // Aseguramos que sea entero
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,song_id' });

      if (error) {
        console.error('[useSongSettings] Error guardando en Supabase:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
        });
        if (!opts?.silent) toast.error(`No se pudo sincronizar: ${error.message}`);
      } else {
        setLastSavedAt(Date.now());
        if (!opts?.silent) toast.success('Ajustes sincronizados');
      }
    } catch (err) {
      console.error('Excepción en persistencia:', err);
    } finally {
      setIsSaving(false);
    }
  }, [songId]);

  // Autosave con debounce: solo si los datos de la nube ya se asentaron, y
  // con un margen de gracia adicional para evitar guardar cambios accidentales
  // disparados durante el render inicial.
  useEffect(() => {
    // ESCUDO DE CARGA: bloqueo total hasta que isLoaded sea true Y settings != null.
    if (!isLoaded || !canPersistRef.current || !isLoadedRef.current || !songId || settings === null || loadedSongIdRef.current !== songId) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const sinceLoad = Date.now() - cloudAppliedAtRef.current;
    const saveDelayMs = Math.max(1000, 1200 - sinceLoad); // gracia tras carga inicial

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persist(settings, { silent: true });
    }, saveDelayMs);

    return () => { 
      if (debounceRef.current) clearTimeout(debounceRef.current); 
    };
  }, [settings, isLoaded, songId, persist]);

  const saveNow = useCallback(() => {
    if (!settings) return;
    persist(settings);
  }, [persist, settings]);

  return { settings, setSettings, saveNow, isSaving, lastSavedAt, isLoaded };
}
