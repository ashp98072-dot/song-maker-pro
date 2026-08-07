import { useCallback, useEffect, useState } from 'react';
import type { SingerVocalProfile } from '@/features/vocal-test/vocalTestMath';
import type { VocalRegister } from '@/utils/vocalRange';

const STORAGE_KEY = 'wt_singer_vocal_profile_v1';

function readProfile(): SingerVocalProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SingerVocalProfile;
    if (
      typeof data?.lowMidi !== 'number' ||
      typeof data?.highMidi !== 'number' ||
      !data.register
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeProfile(profile: SingerVocalProfile | null): void {
  try {
    if (!profile) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
}

export function useSingerVocalProfile() {
  const [profile, setProfileState] = useState<SingerVocalProfile | null>(() =>
    typeof window !== 'undefined' ? readProfile() : null
  );

  useEffect(() => {
    setProfileState(readProfile());
  }, []);

  const saveProfile = useCallback((next: SingerVocalProfile) => {
    writeProfile(next);
    setProfileState(next);
  }, []);

  const clearProfile = useCallback(() => {
    writeProfile(null);
    setProfileState(null);
  }, []);

  const preferredRegister: VocalRegister | null = profile?.register ?? null;

  return { profile, preferredRegister, saveProfile, clearProfile };
}
