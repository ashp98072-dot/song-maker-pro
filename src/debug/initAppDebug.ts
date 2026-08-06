import { isAppDebugEnabled, debugLog, isDebugQueryParam } from '@/debug/appDebugMode';
import {
  collectAppDebugSnapshot,
  runAppDebugNetworkProbes,
} from '@/debug/collectAppDebugSnapshot';
import { SMOKE_TEST_ROUTES } from '@/debug/smokeRoutes';
import type { AppDebugAPI, AppDebugSnapshot } from '@/debug/types';

let latestSnapshot: AppDebugSnapshot | null = null;

export function getLatestAppDebugSnapshot(): AppDebugSnapshot | null {
  return latestSnapshot;
}

export async function refreshAppDebugSnapshot(
  route?: AppDebugSnapshot['route']
): Promise<AppDebugSnapshot> {
  if (!isAppDebugEnabled()) {
    throw new Error('[APP_DEBUG] no activo — usa DEV o ?debug=1');
  }
  latestSnapshot = await collectAppDebugSnapshot(route);
  if (typeof window !== 'undefined') {
    window.__APP_DEBUG__ = buildAppDebugApi();
  }
  if (isDebugQueryParam()) {
    debugLog('snapshot', latestSnapshot);
  }
  return latestSnapshot;
}

function buildAppDebugApi(): AppDebugAPI {
  return {
    version: 1,
    active: isAppDebugEnabled(),
    getSnapshot: () => latestSnapshot,
    refresh: () => refreshAppDebugSnapshot(),
    log: () => {
      if (!latestSnapshot) {
        console.info('[APP_DEBUG] sin snapshot — ejecuta refresh()');
        return;
      }
      console.info('[APP_DEBUG] snapshot', latestSnapshot);
    },
    listSmokeRoutes: () => SMOKE_TEST_ROUTES,
    runNetworkProbes: () => runAppDebugNetworkProbes(),
  };
}

export function attachAppDebugGlobals(): () => void {
  if (!isAppDebugEnabled() || typeof window === 'undefined') {
    return () => {};
  }

  window.__APP_DEBUG__ = buildAppDebugApi();
  void refreshAppDebugSnapshot();

  return () => {
    delete window.__APP_DEBUG__;
    latestSnapshot = null;
  };
}
