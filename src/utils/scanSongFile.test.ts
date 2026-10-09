import { describe, expect, it } from 'vitest';
import { pdfTextToLines } from './scanSongFile';

const item = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 6, height: 12 });

describe('PDF chord sheet text layout', () => {
  it('preserves the chord row and its horizontal position above lyrics', () => {
    expect(pdfTextToLines([item('Texto de ejemplo', 10, 20), item('B', 46, 40), item('F#', 100, 40)]))
      .toBe('      B        F#\nTexto de ejemplo');
  });
  it('orders split text fragments on one baseline', () => {
    expect(pdfTextToLines([item('final', 70, 20), item('Inicio', 10, 21)]))
      .toBe('Inicio    final');
  });
  it('handles pages without selectable text', () => {
    expect(pdfTextToLines([])).toBe('');
  });
});
