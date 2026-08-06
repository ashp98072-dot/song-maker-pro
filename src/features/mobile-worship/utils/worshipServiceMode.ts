import { toast } from 'sonner';
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

/**
 * One-tap service mode: ensure director live session, hide chrome, share join link.
 */
export async function startWorshipServiceMode(opts: {
  live: Pick<SimpleLiveSyncContextValue, 'role' | 'code' | 'createAsDirector'> | null;
  hideControls: () => void;
  input: WorshipServiceModeInput;
  share?: boolean;
}): Promise<boolean> {
  const { live, hideControls, input, share = true } = opts;
  if (!live) {
    toast.error('Sincronización en vivo no disponible');
    return false;
  }

  const plan = planWorshipServiceMode(live.role);
  if (plan.kind === 'blocked') {
    toast.error(plan.reason);
    return false;
  }

  if (plan.needsCreate) {
    const ok = await live.createAsDirector({
      songId: input.songId,
      listId: input.listId ?? null,
      listSongIds: input.listSongIds ?? [],
      currentIndex: input.currentIndex ?? 0,
      viewMode: input.viewMode ?? 'musician',
      semitones: input.semitones ?? 0,
      genderShift: input.genderShift ?? 'original',
      sectionAnchor: input.sectionAnchor ?? null,
    });
    if (!ok) return false;
  }

  hideControls();

  const resolvedCode = readSimpleLiveHint()?.code || live.code;
  if (share && resolvedCode) {
    const url = buildLiveJoinUrl(resolvedCode);
    await shareNative({
      title: 'Worship Transpose — Modo culto',
      text: `Únete en vivo: ${resolvedCode}`,
      url,
    });
  }

  if (resolvedCode) {
    toast.success(`Modo culto activo · ${resolvedCode}`);
  } else {
    toast.success('Modo culto activo');
  }

  return true;
}
