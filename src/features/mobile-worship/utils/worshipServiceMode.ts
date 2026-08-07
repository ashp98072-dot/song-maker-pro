import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router-dom';
import type { ViewMode } from '@/types/music';
import { shareNative } from '@/utils/shareNative';
import { buildLiveJoinUrl } from '@/features/simple-live-sync/liveJoinUrl';
import { readSimpleLiveHint } from '@/features/simple-live-sync/types';
import type { SimpleLiveSyncContextValue } from '@/features/simple-live-sync/SimpleLiveSyncContext';

export type WorshipServiceModeInput = {
  songId: string;
  semitones?: number;
  viewMode?: ViewMode;
  genderShift?: 'original' | 'male' | 'female';
  currentIndex?: number;
  listId?: string | null;
  listSongIds?: string[];
  sectionAnchor?: string | null;
};

export type WorshipServiceModePlan =
  | { kind: 'start'; needsCreate: boolean }
  | { kind: 'blocked'; reason: string };

export function planWorshipServiceMode(role: string | null | undefined): WorshipServiceModePlan {
  if (role === 'follower') {
    return {
      kind: 'blocked',
      reason: 'Estás como espectador. Sal de la sesión para iniciar Modo culto como director.',
    };
  }
  return { kind: 'start', needsCreate: role !== 'director' };
}

/** Lista/cadena con 2+ canciones → siempre continuo (toda la cadena, no un solo canto). */
export function resolveWorshipServiceModeInput(
  input: WorshipServiceModeInput
): WorshipServiceModeInput {
  const listSongIds = input.listSongIds ?? [];
  const hasChain = !!input.listId && listSongIds.length > 1;
  if (!hasChain) return { ...input, listSongIds };
  return {
    ...input,
    listSongIds,
    viewMode: 'continuous',
    currentIndex:
      typeof input.currentIndex === 'number' && input.currentIndex >= 0
        ? input.currentIndex
        : Math.max(0, listSongIds.indexOf(input.songId)),
  };
}

function continuousLivePath(listId: string): string {
  return `/setlist/${listId}/live`;
}

/**
 * One-tap service mode: ensure director live session, open continuous chain when
 * the list has multiple songs, hide chrome, share join link.
 */
export async function startWorshipServiceMode(opts: {
  live: Pick<
    SimpleLiveSyncContextValue,
    'role' | 'code' | 'createAsDirector' | 'publish'
  > | null;
  hideControls: () => void;
  input: WorshipServiceModeInput;
  share?: boolean;
  /** When set, jumps to continuous setlist for multi-song lists. */
  navigate?: NavigateFunction;
  /** Current path — avoid remounting if already on continuous live. */
  currentPathname?: string;
}): Promise<boolean> {
  const { live, hideControls, share = true, navigate, currentPathname } = opts;
  if (!live) {
    toast.error('Sincronización en vivo no disponible');
    return false;
  }

  const input = resolveWorshipServiceModeInput(opts.input);

  const plan = planWorshipServiceMode(live.role);
  if (plan.kind === 'blocked') {
    toast.error(plan.reason);
    return false;
  }

  const payload = {
    songId: input.songId,
    listId: input.listId ?? null,
    listSongIds: input.listSongIds ?? [],
    currentIndex: input.currentIndex ?? 0,
    viewMode: input.viewMode ?? 'musician',
    semitones: input.semitones ?? 0,
    genderShift: input.genderShift ?? 'original',
    sectionAnchor: input.sectionAnchor ?? null,
  };

  if (plan.needsCreate) {
    const ok = await live.createAsDirector(payload, { quiet: true });
    if (!ok) return false;
  } else {
    live.publish(payload);
  }

  const openContinuous =
    payload.viewMode === 'continuous' &&
    !!payload.listId &&
    (payload.listSongIds?.length ?? 0) > 1;

  if (openContinuous && navigate && payload.listId) {
    const path = continuousLivePath(payload.listId);
    if (currentPathname === path) {
      hideControls();
    } else {
      navigate(path, {
        state: {
          listId: payload.listId,
          listSongIds: payload.listSongIds,
          hideControlsOnMount: true,
          initialSongId: payload.songId,
          initialIndex: payload.currentIndex,
          currentIndex: payload.currentIndex,
        },
      });
    }
  } else {
    hideControls();
  }

  const resolvedCode = readSimpleLiveHint()?.code || live.code;
  const shouldShare = share && !!resolvedCode && plan.needsCreate;
  if (shouldShare && resolvedCode) {
    const url = buildLiveJoinUrl(resolvedCode);
    await shareNative({
      title: 'Worship Transpose — Modo culto',
      text: `Únete en vivo: ${resolvedCode}`,
      url,
    });
  }

  if (resolvedCode) {
    toast.success(
      plan.needsCreate
        ? `Modo culto activo · ${resolvedCode}`
        : `Modo culto listo · ${resolvedCode}`
    );
  } else {
    toast.success('Modo culto activo');
  }

  return true;
}
