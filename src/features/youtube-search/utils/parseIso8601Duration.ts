import { formatVideoDuration } from '@/features/youtube-search/utils/formatDuration';

/** Convierte duración ISO 8601 de YouTube (PT4M13S) a segundos. */
export function parseIso8601Duration(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso.trim());
  if (!match) return 0;
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

export function formatIso8601Duration(iso: string): string {
  const seconds = parseIso8601Duration(iso);
  return seconds > 0 ? formatVideoDuration(seconds) : '';
}
