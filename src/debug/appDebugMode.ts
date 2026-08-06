/** Observabilidad post-deploy: activa solo en DEV o con `?debug=1` (sin cambiar UX normal). */
export function isDebugQueryParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function isAppDebugEnabled(): boolean {
  return import.meta.env.DEV || isDebugQueryParam();
}

/** Panel flotante: solo con query param (también en DEV). */
export function isDebugPanelVisible(): boolean {
  return isDebugQueryParam();
}

export function debugLog(...args: unknown[]): void {
  if (!isAppDebugEnabled()) return;
  if (!isDebugQueryParam() && !import.meta.env.DEV) return;
  console.info('[APP_DEBUG]', ...args);
}
