import { useState, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getCachedIsMobileViewport,
  readIsLandscape,
  scheduleMobileViewportBurst,
  subscribeMobileViewport,
  subscribeViewportEvents,
  syncMobileViewport,
} from '@/features/mobile-stage/hooks/mobileViewportSync';

export { MOBILE_VIEWPORT_MAX_PX, readIsMobileViewport, readViewportSnapshot } from '@/features/mobile-stage/hooks/mobileViewportSync';

/**
 * Viewport móvil compartido (store + burst sync) — evita desync entre SongViewPage y WorshipFloatingDock.
 */
export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => getCachedIsMobileViewport());

  const applyCached = useCallback(() => {
    setIsMobile(getCachedIsMobileViewport());
  }, []);

  useLayoutEffect(() => {
    syncMobileViewport({ log: import.meta.env.DEV });
    applyCached();

    const unsubStore = subscribeMobileViewport(applyCached);
    const unsubEvents = subscribeViewportEvents(() => syncMobileViewport());

    scheduleMobileViewportBurst('useIsMobileViewport-mount');

    return () => {
      unsubStore();
      unsubEvents();
    };
  }, [applyCached]);

  return isMobile;
}

/** Dispara burst al entrar en rutas de canción (PWA post-nav). */
export function useSongRouteViewportBurst() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (!location.pathname.startsWith('/cancion/')) return;
    scheduleMobileViewportBurst(`route:${location.pathname}`);
  }, [location.pathname]);
}

export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(() => readIsLandscape());

  useLayoutEffect(() => {
    const sync = () => setIsLandscape(readIsLandscape());
    sync();
    const unsub = subscribeViewportEvents(sync);
    const raf = requestAnimationFrame(sync);
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, []);

  return isLandscape;
}
