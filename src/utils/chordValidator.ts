// Validates if a bracketed text is a valid chord or section label
const VALID_CHORD_RE = /^[A-G][#b♯♭]?(?:(?:maj|min|m|dim|aug|sus|add)\d*)*\d*(?:[#b]\d+)*(?:\/[A-G][#b♯♭]?)?$/;
const SECTION_LABELS = /^(Verso|Verse|Coro|Chorus|Puente|Bridge|Pre[- ]?Coro|Pre[- ]?Chorus|Intro|Outro|Instrumental|Interludio|Final)\s*\d*$/i;

export function isValidBracketContent(content: string): boolean {
  return VALID_CHORD_RE.test(content) || SECTION_LABELS.test(content);
}

/**
 * Returns ranges of invalid bracketed content in a text for highlighting.
 * Each range is { start, end, text } where text is the full [X] match.
 */
export function findInvalidBrackets(text: string): { start: number; end: number; text: string }[] {
  const results: { start: number; end: number; text: string }[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!isValidBracketContent(match[1])) {
      results.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }
  return results;
}
