import { Song, SongList } from '@/types/music';

interface BackupData {
  version: 1;
  exportedAt: string;
  songs: Song[];
  favorites: string[];
  lists: SongList[];
}

export function exportLibrary(songs: Song[], favorites: string[], lists: SongList[]) {
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    favorites,
    lists,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worship-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.version || !Array.isArray(data.songs)) {
          throw new Error('Formato de archivo inválido');
        }
        resolve(data as BackupData);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsText(file);
  });
}
