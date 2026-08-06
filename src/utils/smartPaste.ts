// Smart chord detection utility
// Detects chords in pasted text and formats them for the transposer

const CHORD_PATTERN = /^[A-G][#b♯♭]?(?:m(?:aj)?7?|dim|aug|sus[24]|add9|7|6|9|11|13|maj7|maj9)?(?:\/[A-G][#b♯♭]?)?$/;

// Common chord regex for inline detection
const INLINE_CHORD_REGEX = /(?<![a-zA-ZáéíóúüñÁÉÍÓÚÜÑ])([A-G][#b]?(?:m(?:aj)?7?|dim|aug|sus[24]|add9|7|6|9|11|13|maj7|maj9)?(?:\/[A-G][#b]?)?)(?![a-zA-ZáéíóúüñÁÉÍÓÚÜÑ])/g;

export function isLikelyChord(word: string): boolean {
  return CHORD_PATTERN.test(word.trim());
}

export function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('[')) return false;
  const words = trimmed.split(/\s+/);
  const chordCount = words.filter(w => isLikelyChord(w)).length;
  return chordCount > 0 && chordCount / words.length >= 0.5;
}

/**
 * Smart paste processor: Takes raw pasted text (like from Ultimate Guitar or LaCuerda)
 * and formats it into the app's chord+lyrics format.
 * 
 * It detects:
 * - Lines that are mostly chords → keeps them as chord lines
 * - Section labels like [Verse], [Chorus], (Verso), etc → formats as [Section]
 * - Lyrics lines → keeps as-is
 */
export function processSmartPaste(rawText: string): { chords: string; detectedKey: string | null } {
  const lines = rawText.split('\n');
  const processed: string[] = [];
  let detectedKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty lines
    if (!trimmed) {
      processed.push('');
      continue;
    }

    // Detect section labels: [Verse 1], [Chorus], (Intro), Verso 1:, CORO, etc.
    const sectionMatch = trimmed.match(/^\[(.+)\]$/) 
      || trimmed.match(/^\((.+)\)$/)
      || trimmed.match(/^(Verso|Verse|Coro|Chorus|Puente|Bridge|Pre[- ]?Coro|Pre[- ]?Chorus|Intro|Outro|Instrumental|Interludio|Final)\s*\d*\s*:?\s*$/i);
    
    if (sectionMatch) {
      const label = sectionMatch[1] || trimmed.replace(/:$/, '');
      processed.push(`[${label}]`);
      continue;
    }

    // Check if it's a chord line
    if (isChordOnlyLine(trimmed)) {
      // Detect key from first chord
      if (!detectedKey) {
        const firstChord = trimmed.split(/\s+/).find(w => isLikelyChord(w));
        if (firstChord) {
          const match = firstChord.match(/^([A-G][#b]?)(.*)$/);
          if (match) {
            detectedKey = /m(?!aj)/.test(firstChord)
              ? match[1] + 'm' 
              : match[1];
          }
        }
      }
      // Keep chord line with spacing preserved
      processed.push(line);
      continue;
    }

    // Regular lyrics line - keep as is
    processed.push(line);
  }

  return {
    chords: processed.join('\n'),
    detectedKey,
  };
}

/**
 * Processes text where chords are embedded inline with lyrics
 * e.g., "Preciosa [G]sangre de [D]Jesús"
 * Converts to standard format with chords on their own line above lyrics
 */
export function processInlineChords(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }
    if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.includes(' ')) {
      result.push(trimmed);
      continue;
    }

    // Check for inline chord patterns like [Am] or (Am)
    const inlinePattern = /[\[\(]([A-G][#b]?(?:m(?:aj)?7?|dim|aug|sus[24]|add9|7|6|9|11|13|maj7|maj9)?(?:\/[A-G][#b]?)?)[\]\)]/g;
    const matches = [...trimmed.matchAll(inlinePattern)];
    
    if (matches.length > 0) {
      // Build chord line and lyrics line
      let chordLine = '';
      let lyricsLine = '';
      let lastEnd = 0;

      for (const match of matches) {
        const beforeText = trimmed.substring(lastEnd, match.index);
        lyricsLine += beforeText;
        // Pad chord line to align
        while (chordLine.length < lyricsLine.length) chordLine += ' ';
        chordLine += match[1];
        lastEnd = match.index! + match[0].length;
      }
      lyricsLine += trimmed.substring(lastEnd);

      if (chordLine.trim()) result.push(chordLine);
      if (lyricsLine.trim()) result.push(lyricsLine);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}
