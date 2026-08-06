import { normalizeSessionCode } from '@/features/director-session/types';

/** Absolute join URL for share / QR (follower deep link). */
export function buildLiveJoinUrl(code: string, origin?: string): string {
  const normalized = normalizeSessionCode(code);
  const base =
    (origin ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      'https://worshiptranspose.com'
    ).replace(/\/$/, '');
  return `${base}/unirse/${encodeURIComponent(normalized)}`;
}

export function parseJoinCodeFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/unirse\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  const code = normalizeSessionCode(decodeURIComponent(m[1]));
  return code.length >= 4 ? code : null;
}

export function parseJoinCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const raw = params.get('join') || params.get('codigo') || params.get('code');
  if (!raw) return null;
  const code = normalizeSessionCode(raw);
  return code.length >= 4 ? code : null;
}

/** QR image URL (no extra npm dep). */
export function liveJoinQrImageUrl(joinUrl: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(joinUrl)}`;
}
