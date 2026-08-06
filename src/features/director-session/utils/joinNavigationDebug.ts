export type JoinDebugChannel =
  | 'JOIN_NAV'
  | 'JOIN_STATE'
  | 'JOIN_ROUTE'
  | 'JOIN_BLOCKED'
  | 'JOIN_REDIRECT';

export function getJoinPathname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

export function joinDebugLog(
  channel: JoinDebugChannel,
  message: string,
  detail?: Record<string, unknown>
): void {
  const payload = {
    pathname: getJoinPathname(),
    ...detail,
  };
  if (Object.keys(payload).length > 1 || payload.pathname) {
    console.log(`[${channel}] ${message}`, payload);
  } else {
    console.log(`[${channel}] ${message}`);
  }
}
