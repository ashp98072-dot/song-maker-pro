/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Clave anónima pública (preferida) */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Alias legacy — mismo valor que VITE_SUPABASE_ANON_KEY */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_YOUTUBE_API_KEY?: string;
  readonly VITE_YOUTUBE_SEARCH_MODE?: 'piped' | 'mock';
  readonly VITE_PIPED_API_BASE?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  /** Ver src/features/youtube-search/ytDiagnostic.ts */
  readonly VITE_YT_DIAG_STAGE?: string;
  /** Ver src/renderDiag.ts — aislamiento árbol React */
  readonly VITE_RENDER_DIAG_STAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Tipos para el módulo virtual inyectado por vite-plugin-pwa (ver vite.config.ts). */
declare module "virtual:pwa-register" {
  import type { RegisterSWOptions } from "vite-plugin-pwa/types";

  export type { RegisterSWOptions };

  export function registerSW(
    options?: RegisterSWOptions
  ): (reloadPage?: boolean) => Promise<void>;
}
