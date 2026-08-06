import type { NavigateFunction } from 'react-router-dom';
import { persistContinuousListSync } from '@/features/continuous-setlist/utils/continuousListSyncCache';
import { getJoinPathname } from '@/features/director-session/utils/joinNavigationDebug';
import {
  enrichRecoveryForNavigation,
  type SessionRecoveryState,
} from '@/features/director-session/utils/sessionRecovery';
import { normalizeViewMode, resolveSharedViewMode } from '@/types/music';
import { getSongPathById } from '@/utils/songSlug';
import { asSongIdOrNull } from '@/utils/asSongIdOrNull';

export type DbRpcNavTarget = {
  path: string;
  state: Record<string, unknown>;
};

export function buildDbRpcFollowerNavTarget(
  recovery: SessionRecoveryState,
  resolveSongId?: (recovery: SessionRecoveryState) => string | null
): DbRpcNavTarget | null {
  const enriched = enrichRecoveryForNavigation(recovery);
  const songId = resolveForceNavSongId(enriched, resolveSongId);

  const resolved = resolveSharedViewMode(
    enriched.viewMode,
    enriched.listId,
    enriched.listSongIds
  );

  if (resolved === 'continuous' && enriched.listId) {
    const listSongIds =
      enriched.listSongIds.length > 0 ? enriched.listSongIds : songId ? [songId] : [];
    const currentIndex = Math.max(0, enriched.currentIndex ?? 0);
    const initialSongId = songId ?? listSongIds[currentIndex] ?? listSongIds[0] ?? undefined;
    return {
      path: `/setlist/${enriched.listId}/live?index=${currentIndex}`,
      state: {
        listId: enriched.listId,
        listSongIds,
        joinSessionCode: enriched.code,
        initialSongId,
        initialIndex: currentIndex,
        recoverySource: 'db',
      },
    };
  }

  if (songId) {
    return {
      path: getSongPathById(songId),
      state: {
        listId: enriched.listId ?? undefined,
        listSongIds: enriched.listSongIds,
        currentIndex: enriched.currentIndex,
        joinSessionCode: enriched.code,
        recoverySource: 'db',
      },
    };
  }

  if (enriched.listId) {
    const currentIndex = Math.max(0, enriched.currentIndex ?? 0);
    return {
      path: `/setlist/${enriched.listId}/live?index=${currentIndex}`,
      state: {
        listId: enriched.listId,
        listSongIds: enriched.listSongIds,
        joinSessionCode: enriched.code,
        initialIndex: currentIndex,
        recoverySource: 'db',
      },
    };
  }

  return null;
}

/** React navigate + hard window.location.replace if route did not change. */
export function navigateWithHardReplace(
  path: string,
  navigate: NavigateFunction,
  state?: Record<string, unknown>
): void {
  const pathnameBefore = getJoinPathname();
  navigate(path, { replace: true, state });
  window.setTimeout(() => {
    const targetBase = path.split('?')[0];
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith(targetBase)) {
      console.log('[FORCE_NAV_REPLACE]', {
        path,
        pathnameBefore,
        currentPath,
        search: window.location.search,
      });
      window.location.replace(path);
    }
  }, 150);
}

function resolveForceNavSongId(
  enriched: SessionRecoveryState,
  resolveSongId?: (recovery: SessionRecoveryState) => string | null
): string | null {
  const raw =
    resolveSongId?.(enriched) ??
    enriched.songId ??
    (enriched.listSongIds.length > 0
      ? enriched.listSongIds[Math.max(0, enriched.currentIndex ?? 0)] ??
        enriched.listSongIds[0]
      : null);
  return asSongIdOrNull(raw, enriched.listId);
}

export function resolveEmergencyFollowerPath(
  recovery: SessionRecoveryState,
  sessionCode: string,
  resolveSongId?: (recovery: SessionRecoveryState) => string | null
): string | null {
  const enriched = enrichRecoveryForNavigation({ ...recovery, code: sessionCode });
  const viewMode = normalizeViewMode(enriched.viewMode);
  const songId = resolveForceNavSongId(enriched, resolveSongId);

  if (viewMode === 'continuous' && enriched.listId) {
    const currentIndex = Math.max(0, enriched.currentIndex ?? 0);
    if (enriched.listSongIds.length > 0) {
      persistContinuousListSync(enriched.listId, enriched.listSongIds);
    } else if (songId) {
      persistContinuousListSync(enriched.listId, [songId]);
    }
    return `/setlist/${enriched.listId}/live?index=${currentIndex}`;
  }

  if ((viewMode === 'musician' || viewMode === 'singer') && songId) {
    return getSongPathById(songId);
  }

  if (enriched.listId) {
    const currentIndex = Math.max(0, enriched.currentIndex ?? 0);
    if (enriched.listSongIds.length > 0) {
      persistContinuousListSync(enriched.listId, enriched.listSongIds);
    }
    return `/setlist/${enriched.listId}/live?index=${currentIndex}`;
  }

  if (songId) {
    return getSongPathById(songId);
  }

  return null;
}

/** Immediate full-page navigation — no React Router. */
export function emergencyWindowReplacePath(path: string, source: string): void {
  console.error('[EMERGENCY_NAV]', { source, path, current: window.location.pathname });
  window.location.replace(path);
}

/**
 * Hard navigation from DB/RPC row — uses window.location.replace (bypasses React Router).
 */
export function forceFollowerNavFromDbRecovery(
  recovery: SessionRecoveryState,
  sessionCode: string,
  _navigate?: NavigateFunction,
  resolveSongId?: (recovery: SessionRecoveryState) => string | null
): boolean {
  const path = resolveEmergencyFollowerPath(recovery, sessionCode, resolveSongId);
  if (!path) {
    console.log('[FORCE_DB_NAV]', { sessionCode, result: 'no-target', recovery });
    return false;
  }
  console.log('[FORCE_DB_NAV]', {
    sessionCode,
    path,
    viewMode: recovery.viewMode,
    method: 'window.location.replace',
  });
  emergencyWindowReplacePath(path, 'forceFollowerNavFromDbRecovery');
  return true;
}
