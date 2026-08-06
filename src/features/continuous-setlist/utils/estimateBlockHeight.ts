import { isChordLine } from '@/utils/transpose';

/** Altura estimada para espaciadores virtuales (evita saltos de scroll). */
export function estimateSongBlockHeight(
  chords: string,
  options?: { largeSpacing?: boolean; fontSize?: number; lyricsOnly?: boolean }
): number {
  const allLines = chords.split('\n');
  const lines = options?.lyricsOnly
    ? Math.max(6, allLines.filter((line) => !isChordLine(line)).length)
    : Math.max(6, allLines.length);
  const fontSize = options?.fontSize ?? 18;
  const lineHeight = options?.largeSpacing ? fontSize * 2.1 : fontSize * 1.55;
  const header = options?.largeSpacing ? 96 : 72;
  const separator = 40;
  return header + lines * lineHeight + separator;
}
