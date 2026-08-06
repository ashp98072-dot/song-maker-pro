import { supabase } from '@/integrations/supabase/client';

export type AuthDirectorResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'not_authenticated'; message: string };

function logAuthCheck(
  userId: string | null,
  hasSession: boolean,
  accessToken: 'present' | 'missing',
  source: string,
  extra?: Record<string, unknown>
): void {
  console.log('[AUTH_CHECK]', {
    userId,
    hasSession,
    accessToken,
    source,
    ...extra,
  });
}

function sessionHasValidUser(
  session: { user?: { id: string } | null; access_token?: string } | null
): session is { user: { id: string }; access_token: string } {
  return Boolean(session?.user?.id && session.access_token);
}

/**
 * Resolves the current director user id for live_sessions writes.
 * Order: getSession → refreshSession (if needed) → getUser fallback.
 */
export async function resolveAuthenticatedDirector(): Promise<AuthDirectorResult> {
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  let session = initialSession;

  const expiresSoon =
    session?.expires_at != null && session.expires_at * 1000 < Date.now() + 60_000;

  if ((!session?.user || expiresSoon) && session?.refresh_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshed.session) {
      session = refreshed.session;
      logAuthCheck(session.user?.id ?? null, true, session.access_token ? 'present' : 'missing', 'refreshSession');
    } else if (refreshError) {
      console.warn('[AUTH_CHECK] refreshSession failed', { message: refreshError.message });
    }
  }

  if (sessionHasValidUser(session)) {
    logAuthCheck(session.user.id, true, 'present', 'getSession');
    return { ok: true, userId: session.user.id };
  }

  if (!session?.user) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (sessionHasValidUser(refreshed.session)) {
      logAuthCheck(refreshed.session.user.id, true, 'present', 'refreshSession-empty');
      return { ok: true, userId: refreshed.session.user.id };
    }
    if (refreshError) {
      console.warn('[AUTH_CHECK] refreshSession (no session) failed', { message: refreshError.message });
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (user?.id) {
    logAuthCheck(
      user.id,
      Boolean(session),
      session?.access_token ? 'present' : 'missing',
      'getUser'
    );
    return { ok: true, userId: user.id };
  }

  logAuthCheck(null, false, 'missing', 'failed', {
    sessionError: sessionError?.message ?? null,
    userError: userError?.message ?? null,
  });

  return {
    ok: false,
    reason: 'not_authenticated',
    message: userError?.message ?? sessionError?.message ?? 'Usuario no autenticado',
  };
}

/** @alias — same resilient auth path used by session create flows. */
export const requireAuthenticatedDirector = resolveAuthenticatedDirector;
