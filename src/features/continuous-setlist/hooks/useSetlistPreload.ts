import { useEffect } from 'react';
import type { Song } from '@/types/music';
import { getUserSemitones } from '@/utils/userTranspositions';
import { extractYouTubeVideoId } from '@/features/youtube-search/utils/youtubeUrl';

/** Precarga siguiente(s) canciones: transposición local + thumbnail YouTube. */
export function useSetlistPreload(songs: Song[], currentIndex: number) {
  useEffect(() => {
    const upcoming = songs.slice(currentIndex + 1, currentIndex + 3);
    for (const song of upcoming) {
      getUserSemitones(song.id);
      const yt = song.youtubeUrl?.trim();
      if (yt) {
        const id = extractYouTubeVideoId(yt);
        if (id) {
          const img = new Image();
          img.decoding = 'async';
          img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
        }
      }
    }
  }, [songs, currentIndex]);
}
