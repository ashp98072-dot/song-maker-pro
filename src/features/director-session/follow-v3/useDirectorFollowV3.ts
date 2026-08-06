import { useEffect, useRef } from 'react';
import { FEATURES } from '@/config/features';
import { publishFollowState } from '@/features/director-session/follow-v3/publishFollowState';
import { normalizeSessionCode } from '@/features/director-session/types';

export type FollowV3DirectorSourceContext = {
  currentIndex?: number | null;
  renderedIndex?: number | null;
  visibleIndex?: number | null;
  setlistSongId?: string | null;
  routeSongId?: string | null;
};

export type UseDirectorFollowV3Opts = {
  followEnabled: boolean;
  currentSongId: string | null | undefined;
  sessionCode: string | null | undefined;
  listId?: string | null;
  mode?: 'song' | 'continuous';
  sourceContext?: FollowV3DirectorSourceContext | null;
};

/**
 * Director Follow V3 — publish songId only when it changes (no detector / debounce).
 */
export function useDirectorFollowV3(opts: UseDirectorFollowV3Opts): void {
  const lastPublishedSongIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  const enabled = FEATURES.USE_FOLLOW_V3 && opts.followEnabled;
  const sessionCode = opts.sessionCode
    ? normalizeSessionCode(opts.sessionCode)
    : '';
  const songId = opts.currentSongId ?? null;

  useEffect(() => {
    if (!enabled || sessionCode.length < 4 || !songId) return;
    if (lastPublishedSongIdRef.current === songId) return;

    lastPublishedSongIdRef.current = songId;
    seqRef.current += 1;

    const ctx = opts.sourceContext;
    console.log('[FOLLOW_V3_DIRECTOR_SOURCE]', {
      currentSongId: songId,
      currentIndex: ctx?.currentIndex ?? null,
      renderedIndex: ctx?.renderedIndex ?? null,
      visibleIndex: ctx?.visibleIndex ?? null,
      setlistSongId: ctx?.setlistSongId ?? null,
      routeSongId: ctx?.routeSongId ?? null,
      seq: seqRef.current,
      mode: opts.mode ?? 'song',
    });

    publishFollowState({
      sessionCode,
      seq: seqRef.current,
      songId,
      listId: opts.listId ?? null,
      mode: opts.mode ?? 'song',
      timestamp: Date.now(),
    });
  }, [
    enabled,
    sessionCode,
    songId,
    opts.listId,
    opts.mode,
    opts.sourceContext,
  ]);
}
