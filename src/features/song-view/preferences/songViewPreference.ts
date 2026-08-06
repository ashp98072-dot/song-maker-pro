import { useCallback, useEffect, useRef, useState } from 'react';

export type SongViewPreference = 'musician' | 'lyrics-only';

const STORAGE_KEY = 'song_view_preference';
const DEFAULT_PREFERENCE: SongViewPreference = 'musician';

function isSongViewPreference(value: string | null): value is SongViewPreference {
  return value === 'musician' || value === 'lyrics-only';
}

function readStoredPreference(): SongViewPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isSongViewPreference(raw)) return raw;
  } catch {
    /* ignore quota / private mode */
  }
  return DEFAULT_PREFERENCE;
}

/** Lectura silenciosa para render local (sin log). */
export function readSongViewPreference(): SongViewPreference {
  return readStoredPreference();
}

export function songViewPrefLog(detail: {
  mode: SongViewPreference;
  source: 'localStorage' | 'toggle';
}): void {
  console.log('[SONG_VIEW_PREF]', detail);
}

export function songViewRenderLog(detail: {
  source?: 'song-view' | 'continuous';
  preference: SongViewPreference;
  fullscreen: boolean;
  songId: string;
}): void {
  console.log('[SONG_VIEW_RENDER]', detail);
}

export function getSongViewPreference(): SongViewPreference {
  const mode = readStoredPreference();
  songViewPrefLog({ mode, source: 'localStorage' });
  return mode;
}

export function setSongViewPreference(mode: SongViewPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  songViewPrefLog({ mode, source: 'toggle' });
}

export function useSongViewPreference(): readonly [
  SongViewPreference,
  (mode: SongViewPreference) => void,
] {
  const [preference, setPreferenceState] = useState<SongViewPreference>(readStoredPreference);
  const loggedMountRef = useRef(false);

  useEffect(() => {
    if (loggedMountRef.current) return;
    loggedMountRef.current = true;
    songViewPrefLog({ mode: preference, source: 'localStorage' });
  }, [preference]);

  const setPreference = useCallback((mode: SongViewPreference) => {
    setSongViewPreference(mode);
    setPreferenceState(mode);
  }, []);

  return [preference, setPreference] as const;
}
