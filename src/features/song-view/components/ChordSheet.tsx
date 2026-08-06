import { createElement, Fragment, memo, useMemo } from 'react';
import { buildSectionDescriptors, normalizeSectionKind } from '@/utils/chordSections';
import { transposeText, isChordLine, isSectionLabel } from '@/utils/transpose';
import { isMusicianNoteOnlyLine } from '@/utils/lyricTokens';
import ChordLine from './ChordLine';
import LyricLine from './LyricLine';

type SheetRow =
  | { kind: 'section'; index: number; sectionKey: string; label: string }
  | { kind: 'chord'; index: number; text: string }
  | { kind: 'lyric'; index: number; text: string };

export interface ChordSheetProps {
  chords: string;
  semitones: number;
  useFlats: boolean;
  showChords: boolean;
  /** Músico: show (note) / *note*; Cantante/Continuo: hidden with no gaps */
  showMusicianNotes?: boolean;
  useAmerican: boolean;
  activeSectionAnchor?: string;
  onSectionClick: (anchorId: string, sectionKey: string) => void;
  onSectionRef: (anchorId: string, sectionKey: string, el: HTMLDivElement | null) => void;
  lineFontSize?: number;
}

function ChordSheetComponent({
  chords,
  semitones,
  useFlats,
  showChords,
  showMusicianNotes = showChords,
  useAmerican,
  activeSectionAnchor = '',
  onSectionClick,
  onSectionRef,
  lineFontSize,
}: ChordSheetProps) {
  const sectionDescriptors = useMemo(() => buildSectionDescriptors(chords), [chords]);

  const rows = useMemo((): SheetRow[] => {
    const lines = chords.split('\n');
    const out: SheetRow[] = [];
    let sectionOrdinal = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isSectionLabel(line)) {
        const label = line.trim();
        const anchorId =
          sectionDescriptors[sectionOrdinal]?.anchorId ??
          `${normalizeSectionKind(label)}-${sectionOrdinal + 1}`;
        sectionOrdinal += 1;
        out.push({
          kind: 'section',
          index: i,
          sectionKey: anchorId,
          label: line,
        });
        continue;
      }
      if (isChordLine(line)) {
        if (!showChords) continue;
        const text =
          semitones !== 0 ? transposeText(line, semitones, useFlats) : line;
        out.push({ kind: 'chord', index: i, text });
        continue;
      }
      if (!showMusicianNotes && isMusicianNoteOnlyLine(line)) {
        continue;
      }
      out.push({ kind: 'lyric', index: i, text: line });
    }
    return out;
  }, [chords, semitones, useFlats, showChords, showMusicianNotes, sectionDescriptors]);

  const sectionFontStyle = lineFontSize ? { fontSize: lineFontSize } : undefined;

  return (
    <Fragment>
      {rows.map((row) => {
        if (row.kind === 'section') {
          const anchorId = row.sectionKey;
          const isActive = activeSectionAnchor === anchorId;
          return createElement(
            'div',
            {
              key: row.index,
              ref: (el: HTMLDivElement | null) => onSectionRef(anchorId, row.label.trim(), el),
              'data-song-anchor': anchorId,
              onClick: () => onSectionClick(anchorId, row.label.trim()),
              className: `section-label mt-6 mb-2 font-bold underline cursor-pointer transition-colors ${isActive ? 'text-amber-400' : 'text-gold'}`,
              style: sectionFontStyle,
            },
            row.label
          );
        }
        if (row.kind === 'chord') {
          return (
            <ChordLine
              key={row.index}
              line={row.text}
              useAmerican={useAmerican}
            />
          );
        }
        return (
          <LyricLine
            key={row.index}
            line={row.text}
            showMusicianNotes={showMusicianNotes}
            lineFontSize={lineFontSize}
          />
        );
      })}
    </Fragment>
  );
}

export default memo(ChordSheetComponent);
