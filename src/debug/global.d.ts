import type { AppDebugAPI } from '@/debug/types';

declare global {
  interface Window {
    /** Smoke / deploy diagnostics — solo si DEV o `?debug=1`. */
    __APP_DEBUG__?: AppDebugAPI;
  }
}

export {};
