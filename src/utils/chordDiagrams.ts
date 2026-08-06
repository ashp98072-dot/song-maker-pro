// Guitar chord diagrams - fret positions [E A D G B e], -1 = muted, 0 = open
import { chordLookupCandidates, parseChordSymbol } from '@/utils/chordNormalize';

export interface ChordDiagram {
  name: string;
  guitar: { frets: number[]; barFret?: number; startFret?: number };
  piano: string[];
  matchType: 'exact' | 'normalized' | 'fallback' | 'generated';
}

const GUITAR_CHORDS: Record<string, { frets: number[]; barFret?: number; startFret?: number }> = {
  'C':    { frets: [-1, 3, 2, 0, 1, 0] },
  'Cm':   { frets: [-1, 3, 1, 0, 1, -1], startFret: 3 },
  'C6':   { frets: [-1, 3, 2, 2, 1, 0] },
  'C7':   { frets: [-1, 3, 2, 3, 1, 0] },
  'C9':   { frets: [-1, 3, 2, 3, 3, 3], startFret: 3 },
  'Cmaj7':{ frets: [-1, 3, 2, 0, 0, 0] },
  'Cmaj9':{ frets: [-1, 3, 2, 2, 3, 0] },
  'Cdim': { frets: [-1, 3, 4, 2, 4, 2] },
  'Cdim7':{ frets: [-1, 3, 4, 2, 4, 2] },
  'Caug': { frets: [-1, 3, 2, 1, 1, 0] },
  'Csus2':{ frets: [-1, 3, 3, 0, 1, 3] },
  'Csus4':{ frets: [-1, 3, 3, 0, 1, 1] },
  'Cadd9':{ frets: [-1, 3, 2, 0, 3, 0] },
  'D':    { frets: [-1, -1, 0, 2, 3, 2] },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1] },
  'D6':   { frets: [-1, -1, 0, 2, 0, 2] },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2] },
  'D9':   { frets: [-1, -1, 0, 2, 1, 0] },
  'Dmaj7':{ frets: [-1, -1, 0, 2, 2, 2] },
  'Dmaj9':{ frets: [-1, -1, 0, 2, 2, 0] },
  'Ddim': { frets: [-1, -1, 0, 1, 3, 1] },
  'Dsus2':{ frets: [-1, -1, 0, 2, 3, 0] },
  'Dsus4':{ frets: [-1, -1, 0, 2, 3, 3] },
  'Dadd9':{ frets: [-1, -1, 0, 2, 3, 0] },
  'D/F#': { frets: [2, -1, 0, 2, 3, 2] },
  'E':    { frets: [0, 2, 2, 1, 0, 0] },
  'Em':   { frets: [0, 2, 2, 0, 0, 0] },
  'E7':   { frets: [0, 2, 0, 1, 0, 0] },
  'E9':   { frets: [0, 2, 0, 1, 0, 2] },
  'Emaj7':{ frets: [0, 2, 1, 1, 0, 0] },
  'Edim': { frets: [0, 1, 2, 0, -1, -1] },
  'Esus4':{ frets: [0, 2, 2, 2, 0, 0] },
  'F':    { frets: [1, 1, 2, 3, 3, 1], barFret: 1 },
  'Fm':   { frets: [1, 1, 1, 3, 3, 1], barFret: 1 },
  'F7':   { frets: [1, 1, 2, 1, 3, 1], barFret: 1 },
  'Fmaj7':{ frets: [-1, -1, 3, 2, 1, 0] },
  'Fdim': { frets: [1, 2, 3, 1, -1, -1] },
  'G':    { frets: [3, 2, 0, 0, 0, 3] },
  'Gm':   { frets: [3, 1, 0, 0, 3, 3], startFret: 3 },
  'G7':   { frets: [3, 2, 0, 0, 0, 1] },
  'G9':   { frets: [3, 2, 0, 2, 0, 1] },
  'Gmaj7':{ frets: [3, 2, 0, 0, 0, 2] },
  'G/B':  { frets: [-1, 2, 0, 0, 0, 3] },
  'Gdim': { frets: [3, 4, 5, 3, -1, -1], startFret: 3 },
  'Gsus4':{ frets: [3, 2, 0, 0, 1, 3] },
  'A':    { frets: [-1, 0, 2, 2, 2, 0] },
  'Am':   { frets: [-1, 0, 2, 2, 1, 0] },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0] },
  'A9':   { frets: [-1, 0, 2, 4, 2, 3] },
  'Amaj7':{ frets: [-1, 0, 2, 1, 2, 0] },
  'Amaj9':{ frets: [-1, 0, 2, 4, 2, 0] },
  'Adim': { frets: [-1, 0, 1, 2, 1, -1] },
  'Aaug': { frets: [-1, 0, 3, 2, 2, 1] },
  'Asus2':{ frets: [-1, 0, 2, 2, 0, 0] },
  'Asus4':{ frets: [-1, 0, 2, 2, 3, 0] },
  'Aadd9':{ frets: [-1, 0, 2, 4, 2, 0] },
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0] },
  'Am9':  { frets: [-1, 0, 2, 4, 3, 0] },
  'Am11': { frets: [-1, 0, 2, 4, 3, 3] },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], barFret: 2 },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2], barFret: 2 },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2] },
  'Bdim': { frets: [-1, 2, 3, 4, 3, -1] },
  'Bdim7':{ frets: [-1, 2, 3, 1, 3, 1] },
  'Bm7':  { frets: [-1, 2, 0, 2, 3, 2] },
  'Bm7b5':{ frets: [-1, 2, 3, 4, 3, -1] },
  'Bsus2':{ frets: [-1, 2, 4, 4, 2, 2], barFret: 2 },
  'C#m':  { frets: [-1, 4, 6, 6, 5, 4], barFret: 4, startFret: 4 },
  'C#m7': { frets: [-1, 4, 6, 4, 5, 4], barFret: 4, startFret: 4 },
  'C#m7b5':{ frets: [-1, 4, 5, 4, 5, 4], startFret: 4 },
  'C#m11':{ frets: [-1, 4, 6, 4, 5, 4], barFret: 4, startFret: 4 },
  'Db':   { frets: [-1, 4, 3, 1, 2, 1], startFret: 1 },
  'Eb':   { frets: [-1, -1, 1, 3, 4, 3], startFret: 1 },
  'Ebm':  { frets: [-1, -1, 1, 3, 4, 2], startFret: 1 },
  'Ebmaj9':{ frets: [-1, -1, 1, 3, 3, 1], startFret: 1 },
  'F#':   { frets: [2, 4, 4, 3, 2, 2], barFret: 2, startFret: 2 },
  'F#m':  { frets: [2, 4, 4, 2, 2, 2], barFret: 2, startFret: 2 },
  'F#m7': { frets: [2, 4, 2, 2, 2, 2], barFret: 2, startFret: 2 },
  'F#m11':{ frets: [2, 4, 2, 2, 0, 2], barFret: 2, startFret: 2 },
  'F#7':  { frets: [2, 4, 2, 3, 2, 2], barFret: 2, startFret: 2 },
  'F#7#9':{ frets: [2, 4, 2, 3, 4, 2], barFret: 2, startFret: 2 },
  'G#m':  { frets: [4, 6, 6, 4, 4, 4], barFret: 4, startFret: 4 },
  'Ab':   { frets: [4, 6, 6, 5, 4, 4], barFret: 4, startFret: 4 },
  'Abmaj9':{ frets: [4, 6, 5, 5, 4, 4], barFret: 4, startFret: 4 },
  'Bb':   { frets: [-1, 1, 3, 3, 3, 1], barFret: 1 },
  'Bbm':  { frets: [-1, 1, 3, 3, 2, 1], barFret: 1 },
  'Bb7':  { frets: [-1, 1, 3, 1, 3, 1], barFret: 1 },
  'Bbmaj13':{ frets: [-1, 1, 3, 2, 3, 1], barFret: 1 },
  'Bb/D': { frets: [-1, 1, 3, 3, 3, 1], barFret: 1 },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1] },
  'Em7':  { frets: [0, 2, 2, 0, 3, 0] },
  'Fm7':  { frets: [1, 1, 1, 1, 1, 1], barFret: 1 },
  'Gm7':  { frets: [3, 5, 3, 3, 3, 3], barFret: 3, startFret: 3 },
  'Cm7':  { frets: [-1, 3, 5, 3, 4, 3], startFret: 3 },
  'E7#9': { frets: [0, 2, 0, 1, 3, 0] },
  'Gmaj7/B':{ frets: [-1, 2, 0, 0, 0, 2] },
};

const PIANO_KEYS: Record<string, string[]> = {
  'C':  ['C', 'E', 'G'],
  'Cm': ['C', 'Eb', 'G'],
  'C7': ['C', 'E', 'G', 'Bb'],
  'C9': ['C', 'E', 'G', 'Bb', 'D'],
  'Cmaj7':['C', 'E', 'G', 'B'],
  'Cmaj9':['C', 'E', 'G', 'B', 'D'],
  'Cdim':['C', 'Eb', 'Gb'],
  'Caug':['C', 'E', 'G#'],
  'Csus2':['C', 'D', 'G'],
  'Csus4':['C', 'F', 'G'],
  'Cm7':['C', 'Eb', 'G', 'Bb'],
  'D':  ['D', 'F#', 'A'],
  'Dm': ['D', 'F', 'A'],
  'D7': ['D', 'F#', 'A', 'C'],
  'Dmaj7':['D', 'F#', 'A', 'C#'],
  'Dmaj9':['D', 'F#', 'A', 'C#', 'E'],
  'Dm7':['D', 'F', 'A', 'C'],
  'E':  ['E', 'G#', 'B'],
  'Em': ['E', 'G', 'B'],
  'E7': ['E', 'G#', 'B', 'D'],
  'E9': ['E', 'G#', 'B', 'D', 'F#'],
  'E7#9':['E', 'G#', 'B', 'D', 'G'],
  'Emaj7':['E', 'G#', 'B', 'D#'],
  'Em7':['E', 'G', 'B', 'D'],
  'F':  ['F', 'A', 'C'],
  'Fm': ['F', 'Ab', 'C'],
  'F7': ['F', 'A', 'C', 'Eb'],
  'Fmaj7':['F', 'A', 'C', 'E'],
  'Fm7':['F', 'Ab', 'C', 'Eb'],
  'F#': ['F#', 'A#', 'C#'],
  'F#7':['F#', 'A#', 'C#', 'E'],
  'F#m7':['F#', 'A', 'C#', 'E'],
  'F#m11':['F#', 'A', 'C#', 'E', 'B'],
  'G':  ['G', 'B', 'D'],
  'Gm': ['G', 'Bb', 'D'],
  'G7': ['G', 'B', 'D', 'F'],
  'G9': ['G', 'B', 'D', 'F', 'A'],
  'Gmaj7':['G', 'B', 'D', 'F#'],
  'Gm7':['G', 'Bb', 'D', 'F'],
  'A':  ['A', 'C#', 'E'],
  'Am': ['A', 'C', 'E'],
  'A7': ['A', 'C#', 'E', 'G'],
  'Amaj7':['A', 'C#', 'E', 'G#'],
  'Amaj9':['A', 'C#', 'E', 'G#', 'B'],
  'Am7':['A', 'C', 'E', 'G'],
  'Am9':['A', 'C', 'E', 'G', 'B'],
  'B':  ['B', 'D#', 'F#'],
  'Bm': ['B', 'D', 'F#'],
  'B7': ['B', 'D#', 'F#', 'A'],
  'Bdim':['B', 'D', 'F'],
  'Bdim7':['B', 'D', 'F', 'Ab'],
  'Bm7':['B', 'D', 'F#', 'A'],
  'Bm7b5':['B', 'D', 'F', 'A'],
  'C#m':['C#', 'E', 'G#'],
  'C#m7b5':['C#', 'E', 'G', 'B'],
  'Db': ['Db', 'F', 'Ab'],
  'Eb': ['Eb', 'G', 'Bb'],
  'Ebm':['Eb', 'Gb', 'Bb'],
  'Ebmaj9':['Eb', 'G', 'Bb', 'D', 'F'],
  'F#m':['F#', 'A', 'C#'],
  'Ab': ['Ab', 'C', 'Eb'],
  'Abmaj9':['Ab', 'C', 'Eb', 'G', 'Bb'],
  'Bb': ['Bb', 'D', 'F'],
  'Bb7':['Bb', 'D', 'F', 'Ab'],
  'Bbm':['Bb', 'Db', 'F'],
};

function lookupGuitar(key: string) {
  return GUITAR_CHORDS[key];
}

function lookupPiano(key: string) {
  return PIANO_KEYS[key];
}

/** Generate a simple root-position piano voicing when no chart exists. */
function generatePianoVoicing(chord: string): string[] {
  const p = parseChordSymbol(chord);
  if (!p) return [];
  const { root, suffix } = p;
  const notes = [root];
  const s = suffix.toLowerCase();
  if (s.includes('m') && !s.includes('maj')) notes.push(shiftNote(root, 3));
  else notes.push(shiftNote(root, 4));
  if (s.includes('7') || s.includes('9') || s.includes('11') || s.includes('13')) {
    notes.push(shiftNote(root, s.includes('m') && !s.includes('maj') ? 10 : 11));
  }
  if (s.includes('maj7')) notes.push(shiftNote(root, 11));
  return [...new Set(notes)];
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function shiftNote(root: string, semitones: number): string {
  const idx = SHARP.indexOf(root.replace('b', '#'));
  if (idx < 0) return root;
  return SHARP[(idx + semitones) % 12];
}

export type ChordDiagramResult = ChordDiagram & { approximate?: boolean };

export function getChordDiagram(chord: string): ChordDiagramResult | null {
  const candidates = chordLookupCandidates(chord);
  let matchType: ChordDiagram['matchType'] = 'exact';

  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];
    const guitarData = lookupGuitar(key);
    const pianoData = lookupPiano(key);
    if (guitarData || pianoData) {
      if (i === 0) matchType = 'exact';
      else if (i === 1) matchType = 'normalized';
      else matchType = 'fallback';
      return {
        name: chord,
        guitar: guitarData || { frets: [-1, -1, -1, -1, -1, -1] },
        piano: pianoData || generatePianoVoicing(key),
        matchType,
        approximate: i > 0,
      };
    }
  }

  const generated = generatePianoVoicing(chord);
  if (generated.length > 0) {
    return {
      name: chord,
      guitar: { frets: [-1, -1, -1, -1, -1, -1] },
      piano: generated,
      matchType: 'generated',
      approximate: true,
    };
  }

  return null;
}

export function getGuitarSvg(frets: number[], barFret?: number, startFret: number = 0): string {
  return JSON.stringify({ frets, barFret, startFret });
}
