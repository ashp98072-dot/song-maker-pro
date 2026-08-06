import { createElement, memo, useMemo } from 'react';
import { parseLyricLine, stripMusicianNotesFromLine, type LyricToken } from '@/utils/lyricTokens';
import MusicianNote from './MusicianNote';

const MONO_LINE_STYLE = {
  fontFamily: "'Courier New', Courier, monospace",
  whiteSpace: 'pre' as const,
};

export interface LyricLineProps {
  line: string;
  showMusicianNotes: boolean;
  lineFontSize?: number;
}

function renderTokens(tokens: LyricToken[], blockNote: boolean) {
  return tokens.map((token, i) => {
    if (token.type === 'musician_note') {
      return (
        <MusicianNote
          key={`n-${i}`}
          text={token.text}
          variant={blockNote ? 'block' : 'inline'}
        />
      );
    }
    return <span key={`l-${i}`}>{token.text}</span>;
  });
}

function LyricLineComponent({ line, showMusicianNotes, lineFontSize }: LyricLineProps) {
  const content = useMemo(() => {
    if (!showMusicianNotes) {
      return stripMusicianNotesFromLine(line);
    }
    const tokens = parseLyricLine(line);
    const onlyNotes = tokens.every((t) => t.type === 'musician_note');
    const blockNote = onlyNotes && tokens.length === 1;
    return renderTokens(tokens, blockNote);
  }, [line, showMusicianNotes]);

  const style = lineFontSize
    ? { ...MONO_LINE_STYLE, fontSize: lineFontSize }
    : MONO_LINE_STYLE;

  return createElement('div', { className: 'lyric-line', style }, content);
}

export default memo(LyricLineComponent);
