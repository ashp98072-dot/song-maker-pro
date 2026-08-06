import { useMemo, useState, useCallback } from 'react';
import ChordSheet from '@/features/song-view/components/ChordSheet';
import { useTransposeEngine } from '@/features/transpose/hooks/useTransposeEngine';
import { getUserSemitones } from '@/utils/userTranspositions';
import { readSongViewPreference } from '@/features/song-view/preferences/songViewPreference';
import type { Song } from '@/types/music';
import type { ContinuousSetlistSettings } from '@/features/continuous-setlist/types';

export interface ContinuousSongBlockProps {
  song: Song;
  index: number;
  total: number;
  settings: ContinuousSetlistSettings;
  transposeRevision: number;
  isActive: boolean;
  activeSectionAnchor?: string;
  onSectionAnchorClick?: (anchorId: string) => void;
  onSectionRef: (songId: string, anchorId: string, el: HTMLDivElement | null) => void;
}

export function ContinuousSongBlock({
  song,
  index,
  total,
  settings,
  transposeRevision,
  isActive,
  activeSectionAnchor = '',
  onSectionAnchorClick,
  onSectionRef,
}: ContinuousSongBlockProps) {
  const lyricsOnly = readSongViewPreference() === 'lyrics-only';
  const showChords = !lyricsOnly;
  const showMusicianNotes = !lyricsOnly;

  const customSemitones = useMemo(
    () => getUserSemitones(song.id),
    [song.id, transposeRevision]
  );
  const [localSectionAnchor, setLocalSectionAnchor] = useState('');
  const [useAmerican] = useState(true);

  const highlightedAnchor = activeSectionAnchor || localSectionAnchor;

  const { effectiveSemitones, displayKey, displayOriginalKey, useFlats } = useTransposeEngine({
    song,
    vocalRegister: '',
    genderShift: '',
    customSemitones,
    modeSwapped: false,
    useAmerican,
  });

  const handleSectionRef = useCallback(
    (anchorId: string, _sectionKey: string, el: HTMLDivElement | null) => {
      onSectionRef(song.id, anchorId, el);
    },
    [song.id, onSectionRef]
  );

  const handleSectionClick = useCallback(
    (anchorId: string, _sectionKey: string) => {
      setLocalSectionAnchor(anchorId);
      onSectionAnchorClick?.(anchorId);
    },
    [onSectionAnchorClick]
  );

  const useStageSheet = settings.ultraContrast || settings.stageMode;
  const sheetClass = useStageSheet
    ? 'stage-sheet bg-card text-card-foreground border border-border rounded-xl'
    : 'glass-card border-border';

  return (
    <article
      data-continuous-song-id={song.id}
      data-song-id={song.id}
      data-continuous-song-index={index}
      className={`continuous-song-block ${isActive ? 'is-active' : ''} ${
        settings.largeSpacing ? 'continuous-spacing-large' : ''
      }`}
    >
      <header
        className={`continuous-song-header ${settings.stickyTitles ? 'sticky z-20' : ''} ${
          useStageSheet
            ? 'bg-stage-card/95 border border-stage backdrop-blur-md'
            : 'bg-background/90 border-border backdrop-blur-md'
        } border-b px-4 py-3 -mx-1`}
        style={{ top: settings.stickyTitles ? 0 : undefined }}
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          {index + 1} / {total}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground truncate">
          {song.title}
        </h2>
        <p className="text-sm text-muted-foreground truncate">
          {song.artist} · {displayKey || displayOriginalKey}
        </p>
      </header>

      <div
        className={`mt-4 p-4 sm:p-6 rounded-xl border leading-relaxed overflow-x-auto overflow-y-visible chord-sheet-scroll ${sheetClass}`}
        style={{
          fontSize: settings.fontSize,
          fontFamily: "'Courier New', Courier, monospace",
          whiteSpace: 'pre',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ChordSheet
          chords={song.chords}
          semitones={effectiveSemitones}
          useFlats={useFlats}
          showChords={showChords}
          showMusicianNotes={showMusicianNotes}
          useAmerican={useAmerican}
          activeSectionAnchor={highlightedAnchor}
          onSectionClick={handleSectionClick}
          onSectionRef={handleSectionRef}
          lineFontSize={settings.fontSize}
        />
      </div>
    </article>
  );
}
