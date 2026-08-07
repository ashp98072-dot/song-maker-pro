import { useCallback, useSyncExternalStore } from 'react';
import {
  parseSingerVocalProfile,
  type SingerVocalProfile,
} from '@/features/vocal-test/vocalTestMath';
import type { VocalRegister } from '@/utils/vocalRange';

export const SINGER_VOCAL_PROFILE_KEY = 'wt_singer_vocal_profile_v1';
const PROFILE_EVENT = 'wt-singer-vocal-profile';

let cachedRaw: string | null | undefined;
let cachedProfile: SingerVocalProfile | null = null;

function invalidateCache() {
  cachedRaw = undefined;
  cachedProfile = null;
}

function readProfile(): SingerVocalProfile | null {
  try {
    const raw = localStorage.getItem(SINGER_VOCAL_PROFILE_KEY);
    if (raw === cachedRaw) return cachedProfile;
    cachedRaw = raw;
    cachedProfile = raw ? parseSingerVocalProfile(JSON.parse(raw)) : null;
    return cachedProfile;
  } catch {
    invalidateCache();
    return null;
  }
}

function writeProfile(profile: SingerVocalProfile | null): void {
  try {
    if (!profile) localStorage.removeItem(SINGER_VOCAL_PROFILE_KEY);
    else localStorage.setItem(SINGER_VOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
  invalidateCache();
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SINGER_VOCAL_PROFILE_KEY || e.key === null) {
      invalidateCache();
      onStoreChange();
    }
  };
  const onLocal = () => onStoreChange();
  window.addEventListener(PROFILE_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(PROFILE_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}

function getServerSnapshot(): SingerVocalProfile | null {
  return null;
}

export function useSingerVocalProfile() {
  const profile = useSyncExternalStore(subscribe, readProfile, getServerSnapshot);

  const saveProfile = useCallback((next: SingerVocalProfile) => {
    const parsed = parseSingerVocalProfile(next);
    if (!parsed) return;
    writeProfile(parsed);
  }, []);

  const clearProfile = useCallback(() => {
    writeProfile(null);
  }, []);

  const preferredRegister: VocalRegister | null = profile?.register ?? null;

  return { profile, preferredRegister, saveProfile, clearProfile };
}
