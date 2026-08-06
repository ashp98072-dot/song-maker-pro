import { followIgnoreLog } from '@/features/continuous-setlist/utils/continuousFollowSyncLog';

/** Follower con followDirector: visibility es solo UI local, nunca SoT de sync. */
export function isFollowerVisibilityReadOnly(opts: {
  isFollower: boolean;
  followDirector: boolean;
}): boolean {
  return opts.isFollower && opts.followDirector;
}

/** Registra intento de usar visibility para lógica de sync (prohibido en follower). */
export function logVisibilitySyncAttempt(source: string): void {
  followIgnoreLog({ reason: 'visibility is ui-only', source });
}
