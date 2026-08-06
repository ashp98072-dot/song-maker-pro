/**
 * Acceso tipado y validación de variables Vite (`import.meta.env`).
 * Canónicas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_YOUTUBE_API_KEY
 * Alias: VITE_SUPABASE_PUBLISHABLE_KEY → ANON_KEY
 */

export const ENV_CANONICAL = {
  SUPABASE_URL: 'VITE_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'VITE_SUPABASE_ANON_KEY',
  SUPABASE_ANON_ALIAS: 'VITE_SUPABASE_PUBLISHABLE_KEY',
  YOUTUBE_API_KEY: 'VITE_YOUTUBE_API_KEY',
} as const;

function normalizeEnvValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function devEnvError(message: string): void {
  if (import.meta.env.DEV) {
    console.error(`[ENV] ${message}`);
  }
}

/** Logs missing/invalid Supabase env in production (Vercel browser console). */
export function logEnvValidationAlways(): void {
  const { blockers, warnings } = validateClientEnv();
  if (blockers.length > 0) {
    console.error('[ENV] Missing Supabase env', { blockers });
    for (const name of blockers) {
      console.error(`[ENV] Missing required env: ${name}`);
    }
    if (blockers.some((b) => b.includes('ANON_KEY'))) {
      console.error(
        `[ENV] También se acepta el alias legacy: ${ENV_CANONICAL.SUPABASE_ANON_ALIAS}`
      );
    }
    return;
  }
  if (warnings.length > 0 && import.meta.env.DEV) {
    for (const w of warnings) {
      console.warn(`[ENV] ${w}`);
    }
  }
}

export function getOptionalEnv(name: keyof ImportMetaEnv): string | undefined {
  const value = normalizeEnvValue(import.meta.env[name]);
  return value || undefined;
}

export function getRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = normalizeEnvValue(import.meta.env[name]);
  if (!value) {
    devEnvError(`Missing required env: ${name}`);
  }
  return value;
}

/** Clave anónima: preferir VITE_SUPABASE_ANON_KEY; alias legacy VITE_SUPABASE_PUBLISHABLE_KEY */
export function resolveSupabaseAnonKey(): string {
  return (
    getOptionalEnv('VITE_SUPABASE_ANON_KEY') ??
    getOptionalEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ??
    ''
  );
}

export function isValidSupabaseProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isLocalDev =
      import.meta.env.DEV &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (host === 'localhost' || host === '127.0.0.1');
    const isSupabaseHost =
      parsed.protocol === 'https:' && /\.supabase\.co$/i.test(host);
    return isSupabaseHost || isLocalDev;
  } catch {
    return false;
  }
}

export function getYouTubeApiKeyFromEnv(): string | undefined {
  const key = getOptionalEnv('VITE_YOUTUBE_API_KEY');
  return key && key.length >= 10 ? key : undefined;
}

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig | null {
  const url = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey();
  if (!url || !anonKey) return null;
  if (!isValidSupabaseProjectUrl(url)) return null;
  return { url, anonKey };
}

export interface EnvValidationResult {
  /** Si la app puede arrancar (Supabase mínimo válido). */
  ready: boolean;
  /** Variables que faltan o son inválidas (mostrar en EnvironmentErrorScreen). */
  blockers: string[];
  /** Avisos no bloqueantes (solo DEV log). */
  warnings: string[];
}

/** Validación fuerte antes de montar la app. */
export function validateClientEnv(): EnvValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const url = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey();

  if (!url) {
    blockers.push(ENV_CANONICAL.SUPABASE_URL);
  } else if (!isValidSupabaseProjectUrl(url)) {
    blockers.push(`${ENV_CANONICAL.SUPABASE_URL} (URL inválida)`);
    devEnvError('VITE_SUPABASE_URL debe ser https://<project>.supabase.co');
  }

  if (!anonKey) {
    blockers.push(ENV_CANONICAL.SUPABASE_ANON_KEY);
  } else if (anonKey.length < 20) {
    blockers.push(`${ENV_CANONICAL.SUPABASE_ANON_KEY} (valor demasiado corto)`);
  }

  if (
    normalizeEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) &&
    !normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)
  ) {
    if (import.meta.env.DEV) {
      warnings.push('Usando alias VITE_SUPABASE_PUBLISHABLE_KEY; preferir VITE_SUPABASE_ANON_KEY');
    }
  }

  const ytKey = getOptionalEnv('VITE_YOUTUBE_API_KEY');
  if (!ytKey && import.meta.env.DEV) {
    warnings.push(
      `${ENV_CANONICAL.YOUTUBE_API_KEY} no definida — búsqueda YouTube usará Piped o modo demo`
    );
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

/** @deprecated Usar validateClientEnv().blockers */
export function getMissingSupabaseEnvVars(): string[] {
  return validateClientEnv().blockers;
}

export function logEnvValidationInDev(): void {
  if (!import.meta.env.DEV) return;
  const { blockers, warnings } = validateClientEnv();
  for (const name of blockers) {
    console.error(`[ENV] Missing required env: ${name}`);
  }
  if (blockers.includes(ENV_CANONICAL.SUPABASE_ANON_KEY)) {
    console.error(
      `[ENV] También se acepta el alias legacy: ${ENV_CANONICAL.SUPABASE_ANON_ALIAS}`
    );
  }
  for (const w of warnings) {
    console.warn(`[ENV] ${w}`);
  }
}

/** @deprecated Usar logEnvValidationInDev */
export function logMissingSupabaseEnvInDev(): void {
  logEnvValidationInDev();
}
