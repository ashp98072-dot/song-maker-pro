import { isChordOnlyLine, isLikelyChord } from '@/utils/smartPaste';

const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pitches: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Chord-only evidence; this estimates harmony, not the melody or a verified key. */
export function estimateSongKey(text: string) {
  const tokens = text.split(/\r?\n/).filter(isChordOnlyLine)
    .flatMap(line => line.trim().split(/\s+/)).filter(isLikelyChord);
  const chords = tokens.flatMap(token => {
    const match = token.match(/^([A-G])([#b♯♭]?)(.*)$/);
    if (!match || /dim|aug|sus/.test(match[3])) return [];
    const root = (pitches[match[1]] + (/[#♯]/.test(match[2]) ? 1 : /[b♭]/.test(match[2]) ? -1 : 0) + 12) % 12;
    return [{ root, minor: /^m(?!aj)/.test(match[3]), dominant: /^7/.test(match[3]) }];
  });
  if (chords.length < 3 || new Set(chords.map(c => `${c.root}:${c.minor}`)).size < 3) return null;
  const ranked = names.flatMap((name, root) => ['major', 'minor'].map(mode => {
    const minor = mode === 'minor';
    const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const qualities = minor ? [true, true, false, true, true, false, false] : [false, true, true, false, false, true, true];
    let score = 0;
    let fit = 0;
    for (const [i, chord] of chords.entries()) {
      const interval = (chord.root - root + 12) % 12;
      const degree = scale.indexOf(interval);
      const matches = degree >= 0 && chord.minor === qualities[degree];
      const harmonicDominant = minor && interval === 7 && !chord.minor;
      score += matches || harmonicDominant ? 2 : -3;
      if (matches || harmonicDominant) fit++;
      if (interval === 0 && chord.minor === minor) score += 1 + (i === chords.length - 1 ? 3 : 0);
      const next = chords[i + 1];
      if (interval === 7 && !chord.minor && next?.root === root && next.minor === minor) score += chord.dominant ? 5 : 3;
    }
    return { key: name + (minor ? 'm' : ''), score, fit: fit / chords.length };
  })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const gap = (best.score - ranked[1].score) / chords.length;
  const confidence = best.fit < 0.7 || gap < 0.25 ? 'baja' : best.fit >= 0.9 && gap >= 0.8 && chords.length >= 8 ? 'alta' : 'media';
  return { key: best.key, confidence, alternatives: ranked.slice(1, 3).map(item => item.key) };
}
