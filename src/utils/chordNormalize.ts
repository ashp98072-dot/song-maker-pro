/** Normalizes chord symbols for diagram lookup (not for transpose). */

const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'A#': 'A#',
  'C#': 'C#',
  'D#': 'D#',
  'F#': 'F#',
  'G#': 'G#',
};

export function parseChordSymbol(chord: string): { root: string; suffix: string; bass?: string } | null {
  const trimmed = chord.trim();
  if (!trimmed) return null;
  const slash = trimmed.indexOf('/');
  const main = slash >= 0 ? trimmed.slice(0, slash) : trimmed;
  const bass = slash >= 0 ? trimmed.slice(slash + 1) : undefined;
  const m = main.match(/^([A-G][#b♯♭]?)(.*)$/i);
  if (!m) return null;
  let root = m[1].replace('♯', '#').replace('♭', 'b');
  if (root.length === 2) {
    root = ENHARMONIC[root[0].toUpperCase() + root[1]] ?? root[0].toUpperCase() + root[1];
  } else {
    root = root.toUpperCase();
  }
  let suffix = m[2] || '';
  if (suffix === 'min') suffix = 'm';
  if (suffix === 'ø') suffix = 'm7b5';
  if (suffix === '+' || suffix === 'aug') suffix = suffix === '+' ? 'aug' : suffix;
  return { root, suffix, bass };
}

/** Progressive simplification keys for diagram fallback. */
export function chordLookupCandidates(chord: string): string[] {
  const parsed = parseChordSymbol(chord);
  if (!parsed) return [chord];
  const { root, suffix, bass } = parsed;
  const base = root + suffix;
  const candidates: string[] = [base];
  if (bass) candidates.push(`${base}/${bass}`);

  const s = suffix;
  const fallbacks: string[] = [];
  if (/maj9|maj11|maj13/.test(s)) fallbacks.push(root + s.replace(/maj\d+/, 'maj7'));
  if (/m9|m11|m13/.test(s)) fallbacks.push(root + s.replace(/m\d+/, 'm7'));
  if (/\d{2}$/.test(s) && !/^m7b5/.test(s)) fallbacks.push(root + s.replace(/\d+$/, '7'));
  if (/add\d+/.test(s)) fallbacks.push(root + s.replace(/add\d+/, ''));
  if (/sus[24]/.test(s)) fallbacks.push(root + s.replace(/sus[24]/, ''));
  if (/aug|\+/.test(s)) fallbacks.push(root);
  if (/dim7/.test(s)) fallbacks.push(root + 'dim');
  if (/m7b5|ø/.test(s)) fallbacks.push(root + 'm7b5', root + 'dim');
  if (/alt/.test(s)) fallbacks.push(root + '7');
  if (/7[#b]?\d+/.test(s)) fallbacks.push(root + '7');
  if (/^m(?!aj)/.test(s)) fallbacks.push(root + 'm');
  if (s === '' || s === 'maj') fallbacks.push(root);

  for (const f of fallbacks) {
    if (!candidates.includes(f)) candidates.push(f);
  }
  return candidates;
}

/** Shared chord token regex for line splitting / transpose. */
export const CHORD_TOKEN_PATTERN =
  '[A-G][#b♯♭]?(?:(?:maj|min|m|dim|aug|sus|add|alt|ø)\\d*)*\\d*(?:[#b]\\d+)*(?:\\([^)]+\\))?(?:\\/[A-G][#b♯♭]?)?';

export const CHORD_TOKEN_RE = new RegExp(`(${CHORD_TOKEN_PATTERN})`, 'g');
export const CHORD_TOKEN_TEST = new RegExp(`^${CHORD_TOKEN_PATTERN}$`);
