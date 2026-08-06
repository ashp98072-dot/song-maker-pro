import type { Song } from '@/types/music';

export interface ContinuousSetlistSettings {
  largeSpacing: boolean;
  ultraContrast: boolean;
  stickyTitles: boolean;
  hideChrome: boolean;
  stageMode: boolean;
  fontSize: number;
}

export interface ContinuousSetlistPersisted {
  listId: string;
  lastSongId: string;
  scrollY: number;
  settings: Partial<ContinuousSetlistSettings>;
  updatedAt: number;
}

export interface ScrollVisibilityState {
  currentSongIndex: number;
  currentSongId: string;
  currentSection: string;
}

export interface SetlistSongEntry {
  song: Song;
  index: number;
}

export const DEFAULT_CONTINUOUS_SETTINGS: ContinuousSetlistSettings = {
  largeSpacing: false,
  ultraContrast: false,
  stickyTitles: true,
  hideChrome: false,
  stageMode: false,
  fontSize: 18,
};
