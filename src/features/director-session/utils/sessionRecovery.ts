import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { normalizeViewMode, resolveSharedViewMode, type ViewMode } from '@/types/music';
import type { SharedSessionGenderShift } from '@/features/director-session/types';
import { toSharedGenderShift, type LocalGenderShift } from '@/features/director-session/utils/genderShift';
import {
  parseSessionOriginJson,
  type SessionOrigin,
} from '@/features/director-session/utils/sessionOrigin';
import { clearAllLiveSessionLocalState } from '@/features/director-session/utils/sessionStateCleanup';
import { sessionRecoveryLog } from '@/features/director-session/utils/sessionRecoveryLog';
import { joinSessionLog } from '@/features/director-session/utils/joinSessionLog';
import { joinDebugLog } from '@/features/director-session/utils/joinNavigationDebug';

export const LIVE_SESSION_STORAGE_KEY = 'worship-live-session';

const CONTINUOUS_LIST_SYNC_KEY = 'worship-continuous-list-sync';

export type StoredLiveSessionRole = 'director' | 'follower';

export interface StoredLiveSession {
  code: string;
  role: StoredLiveSessionRole;
  origin?: SessionOrigin;
}

export type SessionRecoveryState = {
  code: string;
  directorId: string;
  songId: string | null;
  listSongIds: string[];
  listId: string | null;
  semitones: number;
  bpm: number | null;
  currentKey: string | null;
  viewMode: ViewMode;
  genderShift: SharedSessionGenderShift;
  currentIndex: number;
  sharedSectionAnchor: string | null;
  followDirector: boolean;
  isActive: boolean;
  sessionOrigin: SessionOrigin | null;
};

export type SessionRecoveryMeta = {
  role: StoredLiveSessionRole;
  code: string;
};

type LiveSessionRow = Database['public']['Tables']['live_sessions']['Row'];

function parseListSongIds(raw: LiveSessionRow['list_song_ids']): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function normalizeGenderShift(raw: string | null | undefined): SharedSessionGenderShift {
  if (raw === 'male' || raw === 'female' || raw === 'original') return raw;
  return 'original';
}

export function mapLiveSessionRow(row: LiveSessionRow): SessionRecoveryState {
  const listSongIds = parseListSongIds(row.list_song_ids);
  const rawSongId = row.song_id?.trim() || null;
  // Epoch-millis ids are local list ids — never treat them as song_id.
  const songId =
    rawSongId && !/^\d{12,14}$/.test(rawSongId) ? rawSongId : null;
  const base: SessionRecoveryState = {
    code: row.code,
    directorId: row.director_id,
    songId,
    listSongIds,
    listId: row.list_id,
    semitones: row.semitones ?? 0,
    bpm: row.bpm,
    currentKey: row.current_key,
    viewMode: normalizeViewMode(row.view_mode),
    genderShift: normalizeGenderShift(row.gender_shift),
    currentIndex: row.current_index ?? 0,
    sharedSectionAnchor: row.shared_section_anchor,
    followDirector: row.follow_director ?? true,
    isActive: row.is_active,
    sessionOrigin: parseSessionOriginJson(row.session_origin) ?? null,
  };
  return enrichRecoveryForNavigation(base);
}

/** Derive currentSongId from list_song_ids + current_index when song_id column is empty. */
export function enrichRecoveryForNavigation(
  recovery: SessionRecoveryState
): SessionRecoveryState {
  if (recovery.songId) return recovery;
  if (recovery.listSongIds.length === 0) return recovery;
  const idx = Math.max(0, recovery.currentIndex ?? 0);
  const derived = recovery.listSongIds[idx] ?? recovery.listSongIds[0];
  if (!derived) return recovery;
  return { ...recovery, songId: derived };
}

export function readStoredLiveSession(): StoredLiveSession | null {
  try {
    const raw = localStorage.getItem(LIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLiveSession;
    if (!parsed?.code || (parsed.role !== 'director' && parsed.role !== 'follower')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredLiveSession(
  code: string,
  role: StoredLiveSessionRole,
  origin?: SessionOrigin | null
): void {
  try {
    const payload: StoredLiveSession = { code, role };
    if (origin) payload.origin = origin;
    localStorage.setItem(LIVE_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage no disponible */
  }
}

/** Limpia worship-live-session + caché de lista continua en sessionStorage. */
export function clearSessionRecoveryStorage(): void {
  try {
    localStorage.removeItem(LIVE_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(CONTINUOUS_LIST_SYNC_KEY);
  } catch {
    /* ignore */
  }
  sessionRecoveryLog('cleared local recovery storage');
}

/**
 * Fuente de verdad: live_sessions.is_active.
 * Si la fila no existe o está inactiva → limpieza dura y null (sin reconectar por caché).
 */
export async function resolveLiveSessionForReconnect(
  code: string
): Promise<SessionRecoveryState | null> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || normalized.length < 4) {
    clearAllLiveSessionLocalState();
    return null;
  }

  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    sessionRecoveryLog('reconnect blocked — session missing or inactive', {
      code: normalized,
      error: error?.message,
    });
    // Do not dispatch SESSION_HARD_CLEAR here — DB may lag behind a new director start.
    return null;
  }

  return mapLiveSessionRow(data);
}

export type FollowerDbNavDiagnostic = {
  code: string;
  found: boolean;
  rlsLikely: boolean;
  rlsBlocked: boolean;
  rowSource: 'table' | 'rpc' | null;
  authUserId: string | null;
  isActive: boolean | null;
  error: string | null;
  errorCode: string | null;
  probeRowCount: number | null;
};

export type LiveSessionFetchOpts = {
  /** Join precheck passed — log [RLS_BLOCKED] if both table and RPC miss. */
  expectSessionExists?: boolean;
};

function normalizeLiveSessionCode(code: string): string | null {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || normalized.length < 4) return null;
  return normalized;
}

function unwrapRpcLiveSessionRow(
  data: LiveSessionRow | LiveSessionRow[] | null
): LiveSessionRow | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

/**
 * Reads active live_sessions by join code via SECURITY DEFINER RPC (bypasses follower RLS).
 */
export async function getLiveSessionByCode(code: string): Promise<LiveSessionRow | null> {
  const normalized = normalizeLiveSessionCode(code);
  if (!normalized) {
    console.log('[RPC_CALL]', { code, normalized: null, result: 'invalid-code' });
    return null;
  }

  console.log('[RPC_CALL]', { code: normalized, phase: 'start' });

  const { data, error } = await supabase.rpc('get_live_session_by_code', {
    p_code: normalized,
  });

  const row = unwrapRpcLiveSessionRow((data as LiveSessionRow | LiveSessionRow[] | null) ?? null);

  console.log('[RPC_CALL]', {
    code: normalized,
    phase: 'done',
    found: !!row,
    is_active: row?.is_active ?? null,
    row: row ?? null,
    error: error
      ? { message: error.message, code: error.code ?? null, details: error.details ?? null }
      : null,
  });

  console.log('[DB_SESSION_ROW_FULL]', {
    source: 'rpc',
    code: normalized,
    row: row ?? null,
    error: error
      ? { message: error.message, code: error.code ?? null, details: error.details ?? null }
      : null,
  });

  if (error) {
    joinDebugLog('JOIN_BLOCKED', 'getLiveSessionByCode rpc failed', {
      code: normalized,
      message: error.message,
      codeError: error.code,
    });
    return null;
  }

  if (row && row.is_active === false) {
    console.warn('[RPC_CALL] live session row is inactive — still returning for follower nav', {
      code: normalized,
      is_active: false,
      song_id: row.song_id,
      list_id: row.list_id,
    });
    // Do not return null: inactive rows still unblock the awaiting overlay when
    // director create failed to flip is_active (e.g. prior UUID list_id errors).
  }

  if (!row) {
    const inactiveProbe = await supabase
      .from('live_sessions')
      .select('code, is_active, view_mode, list_id')
      .eq('code', normalized)
      .maybeSingle();
    if (inactiveProbe.data && inactiveProbe.data.is_active === false) {
      console.error('[RPC_CALL] is_active is FALSE even after activation attempt', {
        code: normalized,
        is_active: false,
        message: 'session row exists in DB but is_active=false (RPC filters active only)',
        row: inactiveProbe.data,
      });
    }
  }

  return row;
}

async function fetchLiveSessionRowFromTable(
  normalized: string
): Promise<{ row: LiveSessionRow | null; error: { message: string; code?: string } | null }> {
  const exact = await supabase
    .from('live_sessions')
    .select('*')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle();

  if (exact.data) {
    return { row: exact.data, error: null };
  }

  if (exact.error && exact.error.code !== 'PGRST116') {
    return { row: null, error: { message: exact.error.message, code: exact.error.code } };
  }

  const fuzzy = await supabase
    .from('live_sessions')
    .select('*')
    .ilike('code', normalized)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (fuzzy.error && fuzzy.error.code !== 'PGRST116') {
    return { row: null, error: { message: fuzzy.error.message, code: fuzzy.error.code } };
  }

  return { row: fuzzy.data ?? null, error: null };
}

/**
 * RPC first (SECURITY DEFINER), then table SELECT. Logs [RLS_BLOCKED] when RPC hits but table misses.
 */
export async function fetchLiveSessionRowByCode(
  code: string,
  opts?: LiveSessionFetchOpts
): Promise<{
  row: LiveSessionRow | null;
  rowSource: 'table' | 'rpc' | null;
  rlsBlocked: boolean;
  diagnostic: FollowerDbNavDiagnostic;
}> {
  const normalized = normalizeLiveSessionCode(code);
  if (!normalized) {
    return {
      row: null,
      rowSource: null,
      rlsBlocked: false,
      diagnostic: {
        code: code?.trim().toUpperCase() ?? '',
        found: false,
        rlsLikely: false,
        rlsBlocked: false,
        rowSource: null,
        authUserId: null,
        isActive: null,
        error: 'invalid code',
        errorCode: null,
        probeRowCount: null,
      },
    };
  }

  const { data: authData } = await supabase.auth.getSession();
  const authUserId = authData.session?.user?.id ?? null;
  const isAuthenticated = Boolean(authData.session?.user);

  let probeRowCount: number | null = null;
  if (import.meta.env.DEV) {
    const probe = await supabase
      .from('live_sessions')
      .select('code, is_active, view_mode, list_id, current_index')
      .eq('is_active', true)
      .limit(5);
    probeRowCount = probe.data?.length ?? 0;
    console.log('[DB_RLS_PROBE]', {
      visibleRows: probeRowCount,
      error: probe.error?.message ?? null,
      errorCode: probe.error?.code ?? null,
      sample: probe.data ?? [],
    });
  }

  const rpcRow = await getLiveSessionByCode(normalized);
  let row = rpcRow;
  let rowSource: 'table' | 'rpc' | null = rpcRow ? 'rpc' : null;
  let rlsBlocked = false;
  let tableError: { message: string; code?: string } | null = null;

  if (!row) {
    const table = await fetchLiveSessionRowFromTable(normalized);
    tableError = table.error;
    row = table.row;
    rowSource = row ? 'table' : null;
    console.log('[DB_SESSION_ROW]', { source: 'table', row: row ?? null, error: table.error });

    if (!row && opts?.expectSessionExists) {
      console.warn('[RLS_BLOCKED]', {
        code: normalized,
        reason: 'session expected (join precheck ok) but RPC and table both empty',
        authUserId,
        isAuthenticated,
        tableError: table.error?.message ?? null,
      });
    }
  } else {
    const table = await fetchLiveSessionRowFromTable(normalized);
    tableError = table.error;
    if (!table.row) {
      rlsBlocked = true;
      console.warn('[RLS_BLOCKED]', {
        code: normalized,
        reason: 'RPC returned row but table SELECT returned null',
        authUserId,
        isAuthenticated,
        tableError: table.error?.message ?? null,
      });
    }
    console.log('[DB_SESSION_ROW]', { source: 'table-verify', row: table.row ?? null, error: table.error });
  }

  console.log('[DB_SESSION_ROW_FULL]', row ?? null);

  const diagnostic: FollowerDbNavDiagnostic = {
    code: normalized,
    found: !!row,
    rlsLikely: !row && !tableError && !isAuthenticated,
    rlsBlocked,
    rowSource,
    authUserId,
    isActive: row?.is_active ?? null,
    error: tableError?.message ?? null,
    errorCode: tableError?.code ?? null,
    probeRowCount,
  };

  console.log('[FOLLOWER_DB_QUERY]', {
    ...diagnostic,
    view_mode: row?.view_mode ?? null,
    list_id: row?.list_id ?? null,
    current_index: row?.current_index ?? null,
    list_song_ids: row?.list_song_ids ?? null,
    song_id: row?.song_id ?? null,
  });

  return { row, rowSource, rlsBlocked, diagnostic };
}

/**
 * Direct live_sessions lookup for follower overlay fallback (any active row with nav fields).
 */
export async function queryLiveSessionForFollowerNav(
  code: string,
  opts?: LiveSessionFetchOpts
): Promise<SessionRecoveryState | null> {
  const { row } = await fetchLiveSessionRowByCode(code, opts);
  if (!row) return null;

  const recovery = mapLiveSessionRow(row);
  const hasNavData =
    !!recovery.listId ||
    !!recovery.songId ||
    recovery.listSongIds.length > 0 ||
    !!recovery.viewMode;

  if (!hasNavData) {
    console.log('[FOLLOWER_DB_QUERY]', {
      code: row.code,
      skipped: true,
      reason: 'no navigable fields in row',
      row,
    });
    return null;
  }

  return recovery;
}

const JOIN_STATE_RETRY_ATTEMPTS = 5;
const JOIN_STATE_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Raw DB row has enough data for follower auto-navigation. */
export function liveSessionRowHasNavigableDirectorState(row: LiveSessionRow): boolean {
  const listIds = parseListSongIds(row.list_song_ids);
  return !!(
    (row.song_id && String(row.song_id).trim()) ||
    row.list_id ||
    (row.view_mode && String(row.view_mode).trim()) ||
    listIds.length > 0
  );
}

export function recoveryHasNavigableDirectorState(recovery: SessionRecoveryState): boolean {
  const enriched = enrichRecoveryForNavigation(recovery);
  return !!(
    enriched.songId ||
    enriched.listId ||
    enriched.viewMode === 'continuous' ||
    enriched.listSongIds.length > 0
  );
}

/**
 * Reintenta lectura de live_sessions hasta que el director haya persistido
 * song_id, list_id o view_mode (evita race post-join en HomePage).
 */
export async function resolveLiveSessionForReconnectWithRetry(
  code: string,
  opts?: { maxAttempts?: number; delayMs?: number }
): Promise<SessionRecoveryState | null> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || normalized.length < 4) return null;

  const maxAttempts = opts?.maxAttempts ?? JOIN_STATE_RETRY_ATTEMPTS;
  const delayMs = opts?.delayMs ?? JOIN_STATE_RETRY_DELAY_MS;

  let lastRecovery: SessionRecoveryState | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    joinDebugLog('JOIN_STATE', 'fetching director state', {
      code: normalized,
      attempt,
      maxAttempts,
    });

    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('code', normalized)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      joinDebugLog('JOIN_BLOCKED', 'live_sessions missing or inactive', {
        reason: error?.message ?? 'no row',
        attempt,
      });
      if (attempt < maxAttempts) await sleep(delayMs);
      continue;
    }

    joinDebugLog('JOIN_STATE', 'live_sessions payload', {
      attempt,
      song_id: data.song_id,
      list_id: data.list_id,
      view_mode: data.view_mode,
      current_index: data.current_index,
      list_song_ids: data.list_song_ids,
      updated_at: data.updated_at,
    });

    if (liveSessionRowHasNavigableDirectorState(data)) {
      lastRecovery = mapLiveSessionRow(data);
      joinDebugLog('JOIN_STATE', 'director state loaded', {
        attempt,
        songId: lastRecovery.songId,
        listId: lastRecovery.listId,
        viewMode: lastRecovery.viewMode,
        currentIndex: lastRecovery.currentIndex,
        listSongCount: lastRecovery.listSongIds.length,
      });
      return lastRecovery;
    }

    joinDebugLog('JOIN_BLOCKED', 'director state not ready for navigation', {
      attempt,
      song_id: data.song_id,
      list_id: data.list_id,
      view_mode: data.view_mode,
    });

    if (attempt < maxAttempts) await sleep(delayMs);
  }

  const fallback = await resolveLiveSessionForReconnect(normalized);
  if (fallback) {
    return enrichRecoveryForNavigation(fallback);
  }
  return null;
}

export function isContinuousRecoveryReady(
  state: SessionRecoveryState
): state is SessionRecoveryState & { listId: string; listSongIds: string[] } {
  const resolved = resolveSharedViewMode(state.viewMode, state.listId, state.listSongIds);
  return resolved === 'continuous' && !!state.listId && state.listSongIds.length > 1;
}

export function localGenderFromRecovery(state: SessionRecoveryState): LocalGenderShift {
  if (state.genderShift === 'male') return 'male';
  if (state.genderShift === 'female') return 'female';
  return '';
}

export function recoveryGenderShiftForPersist(
  genderShift: LocalGenderShift | '' | undefined
): string | null {
  if (!genderShift) return 'original';
  return toSharedGenderShift(genderShift);
}
