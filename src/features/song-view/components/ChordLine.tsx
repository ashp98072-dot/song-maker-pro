import { createElement, memo, useMemo } from 'react';
import ChordPopover from '@/components/ChordPopover';
import { convertLineToLatin } from '@/utils/notation';

import { CHORD_TOKEN_RE, CHORD_TOKEN_TEST } from '@/utils/chordNormalize';

const CHORD_RE = CHORD_TOKEN_RE;
const CHORD_RE_TEST = CHORD_TOKEN_TEST;

const MONO_LINE_STYLE = {
  fontFamily: "'Courier New', Courier, monospace",
  whiteSpace: 'pre' as const,
};

export interface ChordLineProps {
  line: string;
  useAmerican: boolean;
}

function ChordLineComponent({ line, useAmerican }: ChordLineProps) {
  const elements = useMemo(() => {
    const tokens = line.split(CHORD_RE);
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      if (CHORD_RE_TEST.test(token)) {
        const displayChord = useAmerican ? token : convertLineToLatin(token);
        nodes.push(
          <ChordPopover key={`c-${i}`} chord={token}>
            <span className="hover:underline hover:decoration-gold cursor-pointer text-gold font-bold">{displayChord}</span>
          </ChordPopover>
        );
      } else {
        nodes.push(<span key={`t-${i}`}>{token}</span>);
      }
    }
    return nodes;
  }, [line, useAmerican]);

  return createElement(
    'div',
    { className: 'chord-highlight', style: MONO_LINE_STYLE },
    elements
  );
}

export default memo(ChordLineComponent);
