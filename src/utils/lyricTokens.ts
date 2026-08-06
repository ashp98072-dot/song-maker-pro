/**
 * Parses lyric lines for inline musician-only annotations: (note) and *note*.
 * Chord lines and [Section] labels are handled elsewhere.
 */

export type LyricToken =
  | { type: 'lyric'; text: string }
  | { type: 'chord'; chord: string }
  | { type: 'musician_note'; text: string };

const CHORD_IN_PARENS =
  /^[A-G][#b♯♭]?(?:(?:maj|min|m|dim|aug|sus|add|ø)\d*)*\d*(?:[#b]\d+)*(?:\/[A-G][#b♯♭]?)?$/i;

const SECTION_IN_PARENS =
  /^(?:verso|verse|coro|chorus|puente|bridge|pre[- ]?coro|pre[- ]?chorus|intro|outro|instrumental|interludio|final)(?:\s*\d+)?$/i;

type MatchKind = 'asterisk' | 'paren';

type RawMatch = { start: number; end: number; text: string; kind: MatchKind };

function isChordLikeParen(inner: string): boolean {
  const t = inner.trim();
  if (!t) return true;
  if (CHORD_IN_PARENS.test(t)) return true;
  return false;
}

function isSectionParenLine(line: string): boolean {
  const m = line.trim().match(/^\(([^)]+)\)$/);
  if (!m) return false;
  return SECTION_IN_PARENS.test(m[1].trim());
}

function findNextMatch(line: string, from: number): RawMatch | null {
  let best: RawMatch | null = null;

  const starRe = /\*([^*\n]+)\*/g;
  starRe.lastIndex = from;
  const star = starRe.exec(line);
  if (star && star.index !== undefined) {
    best = { start: star.index, end: star.index + star[0].length, text: star[1].trim(), kind: 'asterisk' };
  }

  const parenRe = /\(([^)\n]+)\)/g;
  parenRe.lastIndex = from;
  const par = parenRe.exec(line);
  if (par && par.index !== undefined) {
    const inner = par[1].trim();
    if (!isChordLikeParen(inner)) {
      const candidate: RawMatch = {
        start: par.index,
        end: par.index + par[0].length,
        text: inner,
        kind: 'paren',
      };
      if (!best || candidate.start < best.start) best = candidate;
    }
  }

  return best;
}

/** Tokenize a single lyric line (not chord / section rows). */
export function parseLyricLine(line: string): LyricToken[] {
  const trimmed = line.trim();

  const wholeStar = trimmed.match(/^\*([^*]+)\*$/);
  if (wholeStar && wholeStar[1].trim()) {
    return [{ type: 'musician_note', text: wholeStar[1].trim() }];
  }

  const wholeParen = trimmed.match(/^\(([^)]+)\)$/);
  if (wholeParen) {
    const inner = wholeParen[1].trim();
    if (inner && !isChordLikeParen(inner) && !SECTION_IN_PARENS.test(inner)) {
      return [{ type: 'musician_note', text: inner }];
    }
  }

  const tokens: LyricToken[] = [];
  let pos = 0;
  while (pos < line.length) {
    const match = findNextMatch(line, pos);
    if (!match) {
      const rest = line.slice(pos);
      if (rest) tokens.push({ type: 'lyric', text: rest });
      break;
    }
    if (match.start > pos) {
      tokens.push({ type: 'lyric', text: line.slice(pos, match.start) });
    }
    if (match.text) {
      tokens.push({ type: 'musician_note', text: match.text });
    }
    pos = match.end;
  }

  if (tokens.length === 0) {
    return [{ type: 'lyric', text: line }];
  }
  return tokens;
}

/** True when the line is only musician annotations (hide entirely in singer mode). */
export function isMusicianNoteOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isSectionParenLine(line)) return false;
  const tokens = parseLyricLine(line);
  return tokens.every((t) => t.type === 'musician_note');
}

/** Remove musician notes for cantante / PDF / teleprompter. */
export function stripMusicianNotesFromLine(line: string): string {
  if (isMusicianNoteOnlyLine(line)) return '';
  const tokens = parseLyricLine(line);
  const out = tokens
    .filter((t): t is { type: 'lyric'; text: string } => t.type === 'lyric')
    .map((t) => t.text)
    .join('');
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/^\s+|\s+$/g, '');
}

export function musicianNoteIcon(text: string): string {
  const t = text.toLowerCase();
  if (/pad|piano|keys|synth/.test(t)) return '🎹';
  if (/bater|drum|perc/.test(t)) return '🥁';
  if (/repet|↺|x\s*\d|\dx|coro|chorus|repeat/.test(t)) return '↺';
  if (/stop|silenc|cut/.test(t)) return '⏹';
  if (/capo/.test(t)) return '🎸';
  if (/ritmo|reggae|groove|swing|feel/.test(t)) return '🎵';
  return '🎵';
}
