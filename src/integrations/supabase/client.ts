import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseEnvConfig } from '@/config/env';

const config = getSupabaseEnvConfig();

export const isSupabaseConfigured = config !== null;

const authOptions = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
} as const;

function createConfiguredClient(): SupabaseClient<Database> {
  if (!config) {
    throw new Error(
      '[Supabase] Cliente no configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
  return createClient<Database>(config.url, config.anonKey, authOptions);
}

/** Cliente real; solo existe si las variables de entorno son válidas. */
let clientInstance: SupabaseClient<Database> | null = null;

function getConfiguredClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createConfiguredClient();
  }
  return clientInstance;
}

const noopSubscription = { unsubscribe: () => {} };

/** Evita crash en import si algo accede al cliente sin env (p. ej. tests). */
function createSafeStubClient(): SupabaseClient<Database> {
  const notConfiguredError = { message: 'Supabase no configurado', name: 'SupabaseConfigError' };

  const stubQuery = {
    select: () => stubQuery,
    insert: () => stubQuery,
    update: () => stubQuery,
    delete: () => stubQuery,
    upsert: () => stubQuery,
    eq: () => stubQuery,
    maybeSingle: () => Promise.resolve({ data: null, error: notConfiguredError }),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: notConfiguredError }).then(resolve),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: noopSubscription } }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: notConfiguredError }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      signUp: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
    },
    from: () => stubQuery,
    rpc: async () => ({ data: null, error: notConfiguredError }),
    channel: () => ({
      on: () => ({ subscribe: () => noopSubscription }),
      subscribe: () => noopSubscription,
    }),
    removeChannel: () => {},
    realtime: {
      setAuth: () => {},
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: notConfiguredError }),
        createSignedUrl: async () => ({ data: null, error: notConfiguredError }),
        remove: async () => ({ data: null, error: notConfiguredError }),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? getConfiguredClient()
  : createSafeStubClient();

export function getSupabaseClient(): SupabaseClient<Database> {
  return isSupabaseConfigured ? getConfiguredClient() : supabase;
}
