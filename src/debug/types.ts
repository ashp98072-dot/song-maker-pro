import type { YouTubeSearchProvider } from '@/features/youtube-search/types';

export interface AppDebugEnvStatus {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  mode: string;
  hasYoutubeKey: boolean;
}

export interface AppDebugSupabaseStatus {
  configured: boolean;
  sessionActive: boolean | null;
  userId: string | null;
  error: string | null;
}

export interface AppDebugPwaStatus {
  serviceWorkerSupported: boolean;
  registered: boolean;
  scope: string | null;
  activeScriptUrl: string | null;
  waitingWorker: boolean;
  installingWorker: boolean;
  updateAvailable: boolean;
  controllerState: string | null;
  displayMode: string;
  standalone: boolean;
  onLine: boolean;
  cacheNames: string[];
}

export interface AppDebugYoutubeStatus {
  provider: YouTubeSearchProvider;
  providerLabel: string;
  mockForced: boolean;
}

export interface AppDebugRouteStatus {
  pathname: string;
  search: string;
  hash: string;
}

export interface AppDebugMobileStatus {
  isMobileViewport: boolean;
  isLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
  safeAreaBottom: string | null;
  touchCapable: boolean;
  userAgent: string;
}

export interface AppDebugDiagnosticsStatus {
  renderDiagStage: number;
  ytDiagStage: number;
  renderDiagMode: boolean;
  ytDiagRestricted: boolean;
}

export interface AppDebugResilienceStatus {
  envGateBeforeMount: boolean;
  chunkGlobalReload: boolean;
  chunkErrorBoundary: boolean;
  lazyRouteBoundaries: string[];
  offlineCapable: boolean;
}

export interface AppDebugSnapshot {
  collectedAt: string;
  debugActive: boolean;
  panelVisible: boolean;
  buildMode: 'development' | 'production';
  env: AppDebugEnvStatus;
  supabase: AppDebugSupabaseStatus;
  pwa: AppDebugPwaStatus;
  youtube: AppDebugYoutubeStatus;
  route: AppDebugRouteStatus;
  mobile: AppDebugMobileStatus;
  diagnostics: AppDebugDiagnosticsStatus;
  resilience: AppDebugResilienceStatus;
}

export interface AppDebugNetworkProbeResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface AppDebugAPI {
  readonly version: 1;
  readonly active: boolean;
  getSnapshot(): AppDebugSnapshot | null;
  refresh(): Promise<AppDebugSnapshot>;
  log(): void;
  listSmokeRoutes(): typeof import('@/debug/smokeRoutes').SMOKE_TEST_ROUTES;
  runNetworkProbes(): Promise<AppDebugNetworkProbeResult[]>;
}
