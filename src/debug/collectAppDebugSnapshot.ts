import { validateClientEnv, getYouTubeApiKeyFromEnv } from '@/config/env';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import {
  getConfiguredSearchProvider,
  getProviderDisplayName,
  isMockSearchForced,
} from '@/features/youtube-search/api/getSearchProvider';
import { getRenderDiagStage, isRenderDiagMode } from '@/renderDiag';
import { getYtDiagStage } from '@/features/youtube-search/ytDiagnostic';
import {
  isAppDebugEnabled,
  isDebugPanelVisible,
  isDebugQueryParam,
} from '@/debug/appDebugMode';
import type { AppDebugSnapshot, AppDebugNetworkProbeResult } from '@/debug/types';

const MOBILE_MQ = '(max-width: 1023px)';

function readMobileStatus() {
  const w = typeof window !== 'undefined' ? window : null;
  const mqMobile = w?.matchMedia(MOBILE_MQ).matches ?? false;
  const mqLandscape = w?.matchMedia('(orientation: landscape)').matches ?? false;
  let safeAreaBottom: string | null = null;
  if (w && typeof getComputedStyle !== 'undefined') {
    safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue(
      'padding-bottom'
    );
    const probe = document.createElement('div');
    probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    safeAreaBottom = getComputedStyle(probe).paddingBottom || null;
    document.body.removeChild(probe);
  }
  return {
    isMobileViewport: mqMobile,
    isLandscape: mqLandscape,
    viewportWidth: w?.innerWidth ?? 0,
    viewportHeight: w?.innerHeight ?? 0,
    safeAreaBottom,
    touchCapable: w ? 'ontouchstart' in w || navigator.maxTouchPoints > 0 : false,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

async function readPwaStatus() {
  const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const base = {
    serviceWorkerSupported: swSupported,
    registered: false,
    scope: null as string | null,
    activeScriptUrl: null as string | null,
    waitingWorker: false,
    installingWorker: false,
    updateAvailable: false,
    controllerState: null as string | null,
    displayMode: 'browser',
    standalone: false,
    onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    cacheNames: [] as string[],
  };

  if (!swSupported || typeof window === 'undefined') return base;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const displayMode = window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone'
      : window.matchMedia('(display-mode: fullscreen)').matches
        ? 'fullscreen'
        : 'browser';

    let cacheNames: string[] = [];
    if ('caches' in window) {
      cacheNames = await caches.keys();
    }

    return {
      ...base,
      registered: !!reg,
      scope: reg?.scope ?? null,
      activeScriptUrl: reg?.active?.scriptURL ?? null,
      waitingWorker: !!reg?.waiting,
      installingWorker: !!reg?.installing,
      updateAvailable: !!reg?.waiting,
      controllerState: navigator.serviceWorker.controller?.state ?? null,
      displayMode,
      standalone: displayMode === 'standalone',
      cacheNames,
    };
  } catch {
    return base;
  }
}

async function readSupabaseStatus() {
  if (!isSupabaseConfigured) {
    return {
      configured: false,
      sessionActive: null,
      userId: null,
      error: 'not_configured',
    };
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        configured: true,
        sessionActive: false,
        userId: null,
        error: error.message,
      };
    }
    return {
      configured: true,
      sessionActive: !!data.session,
      userId: data.session?.user?.id ?? null,
      error: null,
    };
  } catch (e) {
    return {
      configured: true,
      sessionActive: false,
      userId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function collectAppDebugSnapshot(
  route?: Pick<AppDebugSnapshot['route'], 'pathname' | 'search' | 'hash'>
): Promise<AppDebugSnapshot> {
  const envValidation = validateClientEnv();
  const provider = getConfiguredSearchProvider();
  const renderStage = getRenderDiagStage();
  const ytStage = getYtDiagStage();

  const [pwa, supabaseStatus] = await Promise.all([readPwaStatus(), readSupabaseStatus()]);

  const pathname =
    route?.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const search =
    route?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const hash = route?.hash ?? (typeof window !== 'undefined' ? window.location.hash : '');

  return {
    collectedAt: new Date().toISOString(),
    debugActive: isAppDebugEnabled(),
    panelVisible: isDebugPanelVisible(),
    buildMode: import.meta.env.PROD ? 'production' : 'development',
    env: {
      ready: envValidation.ready,
      blockers: envValidation.blockers,
      warnings: envValidation.warnings,
      mode: import.meta.env.MODE,
      hasYoutubeKey: !!getYouTubeApiKeyFromEnv(),
    },
    supabase: supabaseStatus,
    pwa,
    youtube: {
      provider,
      providerLabel: getProviderDisplayName(provider),
      mockForced: isMockSearchForced(),
    },
    route: { pathname, search, hash },
    mobile: readMobileStatus(),
    diagnostics: {
      renderDiagStage: renderStage,
      ytDiagStage: ytStage,
      renderDiagMode: isRenderDiagMode(),
      ytDiagRestricted: ytStage < 99,
    },
    resilience: {
      envGateBeforeMount: true,
      chunkGlobalReload: true,
      chunkErrorBoundary: true,
      lazyRouteBoundaries: ['/cancion/:id', '/setlist/:id/live'],
      offlineCapable: pwa.registered,
    },
  };
}

/** Pruebas manuales desde consola (`await __APP_DEBUG__.runNetworkProbes()`). No alteran producción. */
export async function runAppDebugNetworkProbes(): Promise<AppDebugNetworkProbeResult[]> {
  const results: AppDebugNetworkProbeResult[] = [];

  results.push({
    name: 'navigator.onLine',
    ok: typeof navigator !== 'undefined' ? navigator.onLine : true,
    detail: `onLine=${String(typeof navigator !== 'undefined' ? navigator.onLine : true)}`,
  });

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.getSession();
      results.push({
        name: 'supabase.auth.getSession',
        ok: !error,
        detail: error ? error.message : 'ok',
      });
    } catch (e) {
      results.push({
        name: 'supabase.auth.getSession',
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    results.push({
      name: 'supabase',
      ok: false,
      detail: 'stub — env no configurado (EnvironmentErrorScreen en bootstrap)',
    });
  }

  const provider = getConfiguredSearchProvider();
  results.push({
    name: 'youtube.provider',
    ok: provider !== 'mock' || import.meta.env.DEV,
    detail: getProviderDisplayName(provider),
  });

  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      results.push({
        name: 'workbox.caches',
        ok: true,
        detail: keys.length ? keys.join(', ') : '(ninguna aún)',
      });
    } catch (e) {
      results.push({
        name: 'workbox.caches',
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  results.push({
    name: 'chunk.reloadGuard',
    ok: true,
    detail: 'listeners en main.tsx — ChunkLoadError → reload',
  });

  if (isDebugQueryParam()) {
    results.push({
      name: 'debug.panel',
      ok: true,
      detail: '?debug=1 activo',
    });
  }

  return results;
}
