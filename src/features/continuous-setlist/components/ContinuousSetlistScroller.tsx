import { useMemo, useCallback } from 'react';
import { ContinuousSongBlock } from '@/features/continuous-setlist/components/ContinuousSongBlock';
import { estimateSongBlockHeight } from '@/features/continuous-setlist/utils/estimateBlockHeight';
import { isIndexInWindow } from '@/features/continuous-setlist/hooks/useVirtualSongWindow';
import { readSongViewPreference } from '@/features/song-view/preferences/songViewPreference';
import type { SetlistSongEntry } from '@/features/continuous-setlist/types';
import type { ContinuousSetlistSettings } from '@/features/continuous-setlist/types';

export interface ContinuousSetlistScrollerProps {
  entries: SetlistSongEntry[];
  windowStart: number;
  windowEnd: number;
  settings: ContinuousSetlistSettings;
  activeSongId: string;
  activeSectionAnchor?: string;
  transposeRevision: number;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
  onSectionAnchorClick?: (anchorId: string) => void;
}

export function ContinuousSetlistScroller({
  entries,
  windowStart,
  windowEnd,
  settings,
  activeSongId,
  activeSectionAnchor,
  transposeRevision,
  onSectionAnchorClick,
}: ContinuousSetlistScrollerProps) {
  const preference = readSongViewPreference();
  const lyricsOnly = preference === 'lyrics-only';

  const heights = useMemo(
    () =>
      entries.map(({ song }) =>
        estimateSongBlockHeight(song.chords, {
          largeSpacing: settings.largeSpacing,
          fontSize: settings.fontSize,
          lyricsOnly,
        })
      ),
    [entries, settings.largeSpacing, settings.fontSize, lyricsOnly]
  );

  const onSectionRef = useCallback(
    (_songId: string, anchorId: string, el: HTMLDivElement | null) => {
      if (el) el.dataset.songAnchor = anchorId;
    },
    []
  );

  return (
    <div className="continuous-setlist-track max-w-4xl mx-auto px-3 sm:px-4 pb-32">
      {entries.map(({ song, index }) => {
        const inWindow = isIndexInWindow(index, windowStart, windowEnd);
        if (!inWindow) {
          return (
            <div
              key={song.id}
              data-continuous-song-id={song.id}
              data-song-id={song.id}
              data-continuous-song-index={index}
              className="continuous-song-placeholder"
              style={{ height: heights[index], minHeight: heights[index] }}
              aria-hidden
            />
          );
        }
        return (
          <ContinuousSongBlock
            key={song.id}
            song={song}
            index={index}
            total={entries.length}
            settings={settings}
            transposeRevision={transposeRevision}
            isActive={song.id === activeSongId}
            activeSectionAnchor={activeSectionAnchor}
            onSectionAnchorClick={onSectionAnchorClick}
            onSectionRef={onSectionRef}
          />
        );
      })}
    </div>
  );
}
