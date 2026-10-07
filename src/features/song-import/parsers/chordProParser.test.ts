import { describe, expect, it } from 'vitest';
import { parseChordProDocument } from './chordProParser';

describe('ChordPro import rendering format', () => {
  it('places inline chords above the lyrics at their text columns', () => {
    const song = parseChordProDocument('{title: Ejemplo}\n[C]Una [Am]prueba');
    expect(song?.chords).toBe('C   Am\nUna prueba');
  });
  it('converts adjacent instrumental chords into a chord line rather than a heading', () => {
    expect(parseChordProDocument('[C][G][Am]')?.chords).toBe('C G Am');
  });
  it('preserves section comments and removes closing directives and chord definitions', () => {
    const song = parseChordProDocument('{comment: Verso}\n{define: C frets 0 3 2 0 1 0}\n[C]Ejemplo\n{start_of_chorus}\n[G]Final\n{end_of_chorus}');
    expect(song?.chords).toBe('[Verso]\nC\nEjemplo\n[chorus]\nG\nFinal');
  });
  it('keeps existing chord-above-lyrics text and accepts a cho filename', () => {
    const song = parseChordProDocument('C    G\nTexto de ejemplo', 'Ejemplo.cho');
    expect(song?.title).toBe('Ejemplo');
    expect(song?.chords).toBe('C    G\nTexto de ejemplo');
  });
});

it('keeps a missing key unknown and preserves an explicit key', () => {
  expect(parseChordProDocument('C G Am F')?.originalKey).toBe('');
  expect(parseChordProDocument('{key: Dm}\nDm Gm A7')?.originalKey).toBe('Dm');
});
