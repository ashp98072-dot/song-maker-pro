/** Alineado con breakpoint `lg` de Tailwind (desktop ≥ 1024px). */
export const MOBILE_VIEWPORT_MAX_PX = 1023;

const QUERY = `(max-width: ${MOBILE_VIEWPORT_MAX_PX}px)`;

export interface ViewportSnapshot {
  innerWidth: number;
  innerHeight: number;
  clientWidth: number;
  visualWidth: number | null;
  mqMatches: boolean;
  standalone: boolean;
  screenShortSide: number;
  coarsePointer: boolean;
  isMobile: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedIsMobile =
  typeof window !== 'undefined' ? computeIsMobileViewport() : false;

let burstTimeouts: ReturnType<typeof setTimeout>[] = [];

function computeIsMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;

  const mq = window.matchMedia(QUERY);
  const byMq = mq.matches;
  const innerW = window.innerWidth;
  const clientW = document.documentElement.clientWidth;
  const vvW = window.visualViewport?.width;
  const byInner = innerW > 0 && innerW <= MOBILE_VIEWPORT_MAX_PX;
  const byClient = clientW > 0 && clientW <= MOBILE_VIEWPORT_MAX_PX;
  const byVisual = vvW != null && vvW > 0 && vvW <= MOBILE_VIEWPORT_MAX_PX;

  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const screenShort = Math.min(
    window.screen?.width ?? Number.MAX_SAFE_INTEGER,
    window.screen?.height ?? Number.MAX_SAFE_INTEGER
  );
  /** PWA instalada en teléfono: screen físico suele ser ≤1023 en el lado corto lógico. */
  const byStandaloneScreen =
    standalone && screenShort > 0 && screenShort <= MOBILE_VIEWPORT_MAX_PX;

  return byMq || byInner || byClient || byVisual || byStandaloneScreen;
}

export function readViewportSnapshot(): ViewportSnapshot {
  if (typeof window === 'undefined') {
    return {
      innerWidth: 0,
      innerHeight: 0,
      clientWidth: 0,
      visualWidth: null,
      mqMatches: false,
      standalone: false,
      screenShortSide: 0,
      coarsePointer: false,
      isMobile: false,
    };
  }

  const isMobile = computeIsMobileViewport();
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: document.documentElement.clientWidth,
    visualWidth: window.visualViewport?.width ?? null,
    mqMatches: window.matchMedia(QUERY).matches,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    screenShortSide: Math.min(window.screen.width, window.screen.height),
    coarsePointer: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    isMobile,
  };
}

export function readIsMobileViewport(): boolean {
  return computeIsMobileViewport();
}

export function readIsLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(orientation: landscape)').matches) return true;
  return window.innerWidth > window.innerHeight;
}

export function getCachedIsMobileViewport(): boolean {
  return cachedIsMobile;
}

export function syncMobileViewport(options?: { log?: boolean }): boolean {
  const next = computeIsMobileViewport();
  const changed = next !== cachedIsMobile;
  cachedIsMobile = next;

  if (import.meta.env.DEV && (changed || options?.log)) {
    console.log('[MobileDock] viewport snapshot', readViewportSnapshot());
  }

  listeners.forEach((l) => l());
  return next;
}

export function subscribeMobileViewport(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const BURST_DELAYS_MS = [0, 16, 50, 100, 200, 400, 800, 1200, 2000];

/** Re-evalúa viewport tras navegación / primer paint PWA (sin depender de resize manual). */
export function scheduleMobileViewportBurst(reason: string): void {
  if (typeof window === 'undefined') return;

  if (import.meta.env.DEV) {
    console.log('[MobileDock] burst sync', reason);
  }

  burstTimeouts.forEach((id) => clearTimeout(id));
  burstTimeouts = [];

  syncMobileViewport({ log: import.meta.env.DEV });

  for (const delay of BURST_DELAYS_MS) {
    const id = window.setTimeout(() => syncMobileViewport(), delay);
    burstTimeouts.push(id);
  }
}

export function subscribeViewportEvents(onSync: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  const orientationMq = window.matchMedia('(orientation: landscape)');

  mq.addEventListener('change', onSync);
  orientationMq.addEventListener('change', onSync);
  window.addEventListener('resize', onSync);
  window.addEventListener('orientationchange', onSync);
  window.addEventListener('pageshow', onSync);
  document.addEventListener('visibilitychange', onSync);

  const vv = window.visualViewport;
  vv?.addEventListener('resize', onSync);
  vv?.addEventListener('scroll', onSync);

  return () => {
    mq.removeEventListener('change', onSync);
    orientationMq.removeEventListener('change', onSync);
    window.removeEventListener('resize', onSync);
    window.removeEventListener('orientationchange', onSync);
    window.removeEventListener('pageshow', onSync);
    document.removeEventListener('visibilitychange', onSync);
    vv?.removeEventListener('resize', onSync);
    vv?.removeEventListener('scroll', onSync);
  };
}
