import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinuousSongBlock } from './ContinuousSongBlock';
import { DEFAULT_CONTINUOUS_SETTINGS } from '../types';
import { setUserSemitones } from '@/utils/userTranspositions';
import type { Song } from '@/types/music';

vi.mock('@/features/song-view/components/ChordSheet', () => ({
  default: ({ semitones }: { semitones: number }) => <div data-testid="semitones">{semitones}</div>,
}));

const song: Song = {
  id: 'song-1', title: 'Song', artist: 'Artist', originalKey: 'C',
  originalGender: 'male', scaleMode: 'major', lyrics: '', chords: 'C G',
};
const props = {
  song, index: 0, total: 1, settings: DEFAULT_CONTINUOUS_SETTINGS,
  transposeRevision: 0, isActive: true, onSectionRef: vi.fn(),
};

describe('continuous song transposition', () => {
  beforeEach(() => localStorage.clear());

  it('reflects changed stored transposition when the parent increments its revision', () => {
    const { rerender } = render(<ContinuousSongBlock {...props} />);
    expect(screen.getByTestId('semitones')).toHaveTextContent('0');
    setUserSemitones(song.id, 2);
    rerender(<ContinuousSongBlock {...props} transposeRevision={1} />);
    expect(screen.getByTestId('semitones')).toHaveTextContent('2');
    setUserSemitones(song.id, 0);
    rerender(<ContinuousSongBlock {...props} transposeRevision={2} />);
    expect(screen.getByTestId('semitones')).toHaveTextContent('0');
  });
});
