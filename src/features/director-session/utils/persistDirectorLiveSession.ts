import { supabase } from '@/integrations/supabase/client';
import type { SharedSessionState } from '@/features/director-session/types';
import type { SessionOrigin } from '@/features/director-session/utils/sessionOrigin';
import { recoveryGenderShiftForPersist } from '@/features/director-session/utils/sessionRecovery';
import { writeStoredLiveSession } from '@/features/director-session/utils/sessionRecovery';
import type { ViewMode } from '@/types/music';
import { normalizeSessionCode } from '@/features/director-session/types';
import {
  activateLiveSessionViaRpc,
  deactivateLiveSessionRow,
  forceUpdateAndVerifyLiveSessionActive,
  verifyLiveSessionActiveState,
  type LiveSessionActiveVerify,
} from '@/features/director-session/utils/liveSessionActive';
import {
  resolveAuthenticatedDirector,
  type AuthDirectorResult,
} from '@/features/director-session/utils/liveSessionAuth';
import {
  deactivateAllMyPreviousSessions,
  protectDirectorLiveSessionCode,
} from '@/features/director-session/utils/ghostSessionCleanup';
import { asUuidOrNull } from '@/utils/asUuidOrNull';
import { writeLiveSessionPersistence } from '@/features/director-session/utils/liveSessionPersistence';

export type { AuthDirectorResult };
export { resolveAuthenticatedDirector, requireAuthenticatedDirector } from '@/features/director-session/utils/liveSessionAuth';

export function liveSessionLog(message: string, detail?: Record<string, unknown>): void {
  console.log(`[LIVE_SESSION] ${message}`, detail ?? {});
}

export type PersistDirectorLiveSessionInput = {
  sessionCode: string;
  currentSongId: string | null;
  listId?: string | null;
  listSongIds?: string[];
  viewMode: ViewMode;
  currentIndex?: number;
  customSemitones?: number;
  currentKey?: string;
  bpm?: number | null;
  sharedSectionAnchor?: string | null;
  genderShift?: '' | 'male' | 'female';
  followDirector?: boolean;
  sessionOrigin?: SessionOrigin | null;
};

export type LiveSessionRpcErrorReason =
  | 'not_authenticated'
  | 'invalid_code'
  | 'rpc_error'
  | 'verify_failed';

export type CreateDirectorLiveSessionResult = {
  ok: boolean;
  code: string;
  error?: string;
  reason?: LiveSessionRpcErrorReason;
};

export type RpcUpsertResult = {
  ok: boolean;
  row: { code?: string; is_active?: boolean } | null;
  verify: LiveSessionActiveVerify;
  error?: string;
  reason?: LiveSessionRpcErrorReason;
};

export function isLiveSessionAuthError(
  result: Pick<CreateDirectorLiveSessionResult, 'reason' | 'error'>
): boolean {
  if (result.reason === 'not_authenticated') return true;
  const msg = (result.error ?? '').toLowerCase();
  return (
    msg.includes('not authenticated') ||
    msg.includes('no autenticado') ||
    msg.includes('usuario no autenticado') ||
    msg.includes('jwt')
  );
}

/** Deactivates other active live_sessions rows for this director (before RPC upsert). */
export async function deactivatePreviousDirectorLiveSessions(
  _directorId: string,
  keepCode?: string
): Promise<void> {
  await deactivateAllMyPreviousSessions(keepCode);
}

function buildRpcUpsertPayload(
  code: string,
  input: PersistDirectorLiveSessionInput
): Record<string, unknown> {
  const listSongIds = input.listSongIds ?? [];
  const songId = input.currentSongId ?? '';
  // live_sessions.list_id is UUID in production — local Date.now() ids must not be sent.
  const listId = asUuidOrNull(input.listId);

  return {
    code,
    song_id: songId || null,
    list_song_ids: listSongIds,
    semitones: input.customSemitones ?? 0,
    bpm: input.bpm ?? null,
    current_key: input.currentKey ?? null,
    view_mode: input.viewMode ?? 'musician',
    gender_shift: recoveryGenderShiftForPersist(input.genderShift),
    current_index: input.currentIndex ?? 0,
    list_id: listId,
    shared_section_anchor: input.sharedSectionAnchor?.trim() || null,
    follow_director: input.followDirector ?? true,
    ...(input.sessionOrigin ? { session_origin: input.sessionOrigin } : {}),
  };
}

/** Log verify result with a stable label for tracing. */
export async function verifyAndLogLiveSessionActive(
  code: string,
  label: string
): Promise<LiveSessionActiveVerify> {
  const verify = await verifyLiveSessionActiveState(code);
  console.log(`[LIVE_SESSION] verify (${label})`, {
    code: verify.code,
    is_active: verify.is_active,
    rowFound: verify.rowFound,
    director_id: verify.director_id,
  });
  if (verify.is_active !== true) {
    console.error(`[LIVE_SESSION] verify (${label}) — is_active is NOT true`, verify);
  }
  return verify;
}

/**
 * SECURITY DEFINER upsert — sole write path for live_sessions (no client upsert).
 */
export async function upsertDirectorLiveSessionViaRpc(
  input: PersistDirectorLiveSessionInput,
  directorId?: string
): Promise<RpcUpsertResult> {
  const code = normalizeSessionCode(input.sessionCode);
  if (code.length < 4) {
    const verify = await verifyLiveSessionActiveState(code);
    return {
      ok: false,
      row: null,
      verify,
      error: 'Código de sesión inválido (mínimo 4 caracteres)',
      reason: 'invalid_code',
    };
  }

  let userId = directorId;
  if (!userId) {
    const auth = await resolveAuthenticatedDirector();
    if (!auth.ok) {
      const verify = await verifyLiveSessionActiveState(code);
      return {
        ok: false,
        row: null,
        verify,
        error: auth.message,
        reason: 'not_authenticated',
      };
    }
    userId = auth.userId;
  }

  const payload = buildRpcUpsertPayload(code, input);

  if (import.meta.env.DEV) {
    console.log('[LIVE_SESSION_RPC_PAYLOAD]', {
      rpc: 'upsert_activate_director_live_session',
      directorId: userId,
      code,
      song_id: payload.song_id ?? null,
      list_id: payload.list_id ?? null,
    });
  }

  const { data, error } = await supabase.rpc('upsert_activate_director_live_session', {
    p_payload: payload,
  });

  const row = (Array.isArray(data) ? data[0] : data) as {
    code?: string;
    is_active?: boolean;
    director_id?: string;
  } | null;

  if (error || row?.is_active !== true) {
    console.log('[LIVE_SESSION_RPC_RESULT]', {
      rpc: 'upsert_activate_director_live_session',
      code,
      error: error
        ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
        : null,
      row: row ?? null,
    });
  }

  if (error) {
    const verify = await verifyAndLogLiveSessionActive(code, 'RPC-upsert-error');
    return {
      ok: false,
      row: null,
      verify,
      error: error.message,
      reason: isLiveSessionAuthError({ error: error.message })
        ? 'not_authenticated'
        : 'rpc_error',
    };
  }

  const verify = await verifyAndLogLiveSessionActive(code, 'RPC-upsert-immediate');

  const ok = row?.is_active === true || verify.is_active === true;
  if (!ok) {
    return {
      ok: false,
      row,
      verify,
      error: 'RPC completó pero is_active no quedó en true',
      reason: 'verify_failed',
    };
  }

  return { ok: true, row, verify };
}

/** console.error if is_active is still false after `delayMs` (default 2s). */
export function scheduleLiveSessionActiveAssertion(
  code: string,
  delayMs = 2000
): void {
  const normalized = normalizeSessionCode(code);
  window.setTimeout(() => {
    void (async () => {
      let verify = await verifyAndLogLiveSessionActive(normalized, `delayed-${delayMs}ms`);

      if (verify.is_active === true) return;

      await activateLiveSessionViaRpc(normalized);
      verify = await verifyAndLogLiveSessionActive(normalized, `delayed-${delayMs}ms-retry`);

      if (verify.is_active !== true) {
        console.error('[LIVE_SESSION CRITICAL] is_active still FALSE after session create', {
          code: normalized,
          delayMs,
          is_active: verify.is_active,
          rowFound: verify.rowFound,
          director_id: verify.director_id,
        });
      }
    })();
  }, delayMs);
}

/**
 * Session creation: auth → close previous sessions → RPC upsert only → verify.
 */
function markDirectorCreateLocally(
  code: string,
  sessionOrigin?: PersistDirectorLiveSessionInput['sessionOrigin'],
  mode: 'full' | 'protect-only' = 'full'
): void {
  protectDirectorLiveSessionCode(code);
  if (mode === 'protect-only') return;
  writeLiveSessionPersistence({
    role: 'director',
    sessionCode: code,
    connected: true,
    passiveMode: false,
    directorAwayFromScope: false,
  });
  if (sessionOrigin) {
    writeStoredLiveSession(code, 'director', sessionOrigin);
  } else {
    writeStoredLiveSession(code, 'director');
  }
}

export type CreateDirectorLiveSessionOptions = {
  /**
   * `protect-only`: keep ghost-cleanup protect, skip legacy localStorage
   * (used by SIMPLE_LIVE_SYNC so restore loops cannot revive).
   */
  localMark?: 'full' | 'protect-only';
};

export async function createDirectorLiveSessionRpc(
  input: PersistDirectorLiveSessionInput,
  options?: CreateDirectorLiveSessionOptions
): Promise<CreateDirectorLiveSessionResult> {
  const code = normalizeSessionCode(input.sessionCode);
  const localMark = options?.localMark ?? 'full';

  const auth = await resolveAuthenticatedDirector();
  if (!auth.ok) {
    return { ok: false, code, error: auth.message, reason: 'not_authenticated' };
  }

  // Protect before any ghost cleanup so a racing startup wipe cannot set is_active=false.
  markDirectorCreateLocally(code, input.sessionOrigin, localMark);
  await deactivateAllMyPreviousSessions(code);

  const first = await upsertDirectorLiveSessionViaRpc(input, auth.userId);
  if (first.ok) {
    const forced = await forceUpdateAndVerifyLiveSessionActive(code);
    if (forced) {
      scheduleLiveSessionActiveAssertion(code);
      markDirectorCreateLocally(code, input.sessionOrigin, localMark);
      return { ok: true, code };
    }
    console.warn('[LIVE_SESSION] create upsert ok but force-activate verify failed — retrying', {
      code,
    });
  }

  if (first.reason === 'not_authenticated') {
    protectDirectorLiveSessionCode(null);
    return { ok: false, code, error: first.error, reason: 'not_authenticated' };
  }

  console.warn('[LIVE_SESSION] create RPC first pass failed — retrying activate_live_session', {
    code,
    first,
  });

  await activateLiveSessionViaRpc(code);
  const second = await upsertDirectorLiveSessionViaRpc(input, auth.userId);
  const forced = await forceUpdateAndVerifyLiveSessionActive(code);
  const verify = await verifyAndLogLiveSessionActive(code, 'create-RPC-second-pass');

  scheduleLiveSessionActiveAssertion(code);

  if (forced && verify.is_active === true) {
    markDirectorCreateLocally(code, input.sessionOrigin, localMark);
    return { ok: true, code };
  }

  protectDirectorLiveSessionCode(null);

  const error =
    second.error ??
    first.error ??
    'No se pudo activar la sesión en la base de datos';

  console.error('[LIVE_SESSION] createDirectorLiveSessionRpc FAILED', {
    code,
    error,
    first,
    second,
    verify,
  });

  return {
    ok: false,
    code,
    error,
    reason: second.reason ?? first.reason ?? 'verify_failed',
  };
}

/** RPC-only persist (no client-side upsert). */
export async function persistDirectorLiveSession(
  input: PersistDirectorLiveSessionInput
): Promise<boolean> {
  const result = await createDirectorLiveSessionRpc(input);
  return result.ok;
}

/** @alias RPC upsert + verify — used during live navigation sync. */
export async function ensureDirectorLiveSessionPersisted(
  input: PersistDirectorLiveSessionInput
): Promise<boolean> {
  const result = await upsertDirectorLiveSessionViaRpc(input);
  if (result.ok) return true;

  await activateLiveSessionViaRpc(normalizeSessionCode(input.sessionCode));
  const verify = await verifyAndLogLiveSessionActive(
    input.sessionCode,
    'ensure-persist-retry'
  );
  return verify.is_active === true;
}

export { deactivateLiveSessionRow };

/** Persiste desde payload shared-session (navegación en vivo). */
export async function persistDirectorLiveSessionFromShared(
  state: SharedSessionState,
  sessionOrigin?: SessionOrigin | null
): Promise<boolean> {
  return ensureDirectorLiveSessionPersisted({
    sessionCode: state.sessionId,
    currentSongId: state.currentSongId,
    listId: state.listId,
    listSongIds: state.listSongIds,
    viewMode: state.viewMode,
    currentIndex: state.currentIndex,
    customSemitones: state.customSemitones,
    sharedSectionAnchor: state.sharedSectionAnchor,
    genderShift:
      state.genderShift === 'male'
        ? 'male'
        : state.genderShift === 'female'
          ? 'female'
          : '',
    sessionOrigin,
  });
}
