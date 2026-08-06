// American (C D E F G A B) to Latin (Do Re Mi Fa Sol La Si) conversion

const AMERICAN_TO_LATIN: Record<string, string> = {
  'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si',
};

const LATIN_TO_AMERICAN: Record<string, string> = {};
Object.entries(AMERICAN_TO_LATIN).forEach(([k, v]) => { LATIN_TO_AMERICAN[v] = k; });

export function americanToLatin(chord: string): string {
  // Handle slash chords
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return americanToLatin(main) + '/' + americanToLatin(bass);
  }
  const match = chord.match(/^([A-G])([#b♯♭]?)(.*)/);
  if (!match) return chord;
  const [, root, accidental, suffix] = match;
  const latin = AMERICAN_TO_LATIN[root];
  if (!latin) return chord;
  return latin + accidental + suffix;
}

export function convertLineToLatin(line: string): string {
  // Replace all chord tokens in a line
  const chordRegex = /\b([A-G][#b♯♭]?(?:m(?:aj)?7?|dim|aug|sus[24]|add9|7|6|9|11|13|maj7|maj9)?(?:\/[A-G][#b♯♭]?)?)\b/g;
  return line.replace(chordRegex, (match) => americanToLatin(match));
}

export function convertKeyToLatin(key: string): string {
  const isMinor = key.endsWith('m') && !key.endsWith('dim');
  const root = isMinor ? key.slice(0, -1) : key;
  const match = root.match(/^([A-G])([#b♯♭]?)$/);
  if (!match) return key;
  const latin = AMERICAN_TO_LATIN[match[1]];
  if (!latin) return key;
  return latin + match[2] + (isMinor ? 'm' : '');
}
