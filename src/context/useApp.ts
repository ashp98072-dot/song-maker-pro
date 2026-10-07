import { createContext, useContext } from 'react';
import type { AppState, Song, SongList } from '@/types/music';

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
  importLibrary: (songs: Song[], favorites: string[], lists: SongList[], replaceExisting?: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
