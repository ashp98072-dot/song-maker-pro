export type Gender = 'male' | 'female';
export type ScaleMode = 'major' | 'minor';
export type ViewMode = 'singer' | 'musician' | 'continuous';

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  singer: 'Cantante',
  musician: 'Músico',
  continuous: 'Continuo',
};

const VIEW_MODES: ViewMode[] = ['singer', 'musician', 'continuous'];

/** Migra valores legacy (`stage`) y desconocidos al modo actual. */
export function normalizeViewMode(
  raw: string | null | undefined,
  fallback: ViewMode = 'musician'
): ViewMode {
  if (raw === 'stage') return 'continuous';
  if (VIEW_MODES.includes(raw as ViewMode)) return raw as ViewMode;
  return fallback;
}

/** Cantante y Continuo (teleprompter) = solo letra; Músico = acordes + letra. */
export function showChordsForViewMode(mode: ViewMode): boolean {
  return mode === 'musician';
}

/** Anotaciones ( ) y * * solo en modo músico. */
export function showMusicianNotesForViewMode(mode: ViewMode): boolean {
  return mode === 'musician';
}

export function isContinuousTeleprompterView(mode: ViewMode): boolean {
  return mode === 'continuous';
}

/** Boost de fuente para lectura a distancia (cantante / continuo local). */
export function teleprompterFontBoost(mode: ViewMode): number {
  return mode === 'singer' || mode === 'continuous' ? 4 : 0;
}

/** Continuo solo tiene sentido con setlist de 2+ canciones. */
export function isContinuousModeAvailable(
  listId?: string | null,
  listSongIds?: string[] | null
): boolean {
  return !!(listId && listSongIds && listSongIds.length > 1);
}

/** Evita continuo remoto sin lista válida (followers / sync). */
export function resolveSharedViewMode(
  viewMode: ViewMode,
  listId?: string | null,
  listSongIds?: string[] | null
): ViewMode {
  if (viewMode !== 'continuous') return viewMode;
  return isContinuousModeAvailable(listId, listSongIds) ? 'continuous' : 'musician';
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  originalGender: Gender;
  scaleMode: ScaleMode;
  lyrics: string;
  chords: string;
  key?: string;
  bpm?: number;
  /** URL de YouTube persistida (user_songs.youtube_url) */
  youtubeUrl?: string;
  /** Community genre slug (adoracion, alabanza, …) */
  genre?: string;
  isPopular?: boolean;
  isNew?: boolean;
  createdAt?: string;
}

export interface SongList {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string;
}

export interface ShareConfig {
  songId: string;
  semitones: number;
  capo: number | null;
  tips: string;
  targetGender: string;
}

export interface AppState {
  isGuest: boolean;
  userName: string;
  songs: Song[];
  favorites: string[];
  lists: SongList[];
}

export interface SessionState {
  songId: string;
  semitones: number;
  key: string;
  bpm?: number;
  activeSection?: string;
  liveNote?: string;
  listId?: string;
  listSongIds?: string[];
  youtubeUrl?: string;
  youtubePlaying?: boolean;
  youtubeSeek?: number;
  timestamp?: number;
  seq?: number;
}
