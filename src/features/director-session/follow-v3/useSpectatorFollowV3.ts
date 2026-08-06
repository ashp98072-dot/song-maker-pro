import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { FEATURES } from '@/config/features';
import type { FollowV3RemoteState } from '@/features/director-session/follow-v3/types';
import type { SharedSessionState } from '@/features/director-session/types';
import { getFollowV3State, setFollowV3Song } from '@/features/director-session/follow-v3/followV3Store';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';

export type UseSpectatorFollowV3Opts = {
  enabled: boolean;
  sessionCode: string;
  handlerRef: MutableRefObject<((state: FollowV3RemoteState) => void) | null>;
  lastRemoteStateRef: MutableRefObject<SharedSessionState | null>;
  /** Called when a Follow V3 song is applied (clears awaiting overlay). */
  onSongApplied?: (songId: string) => void;
};

function logReceiveCompare(
  remote: FollowV3RemoteState,
  extra: {
    applied: boolean;
    skipReason?: string;
    incomingIndex?: number | null;
    renderedIndex?: number | null;
  }
): void {
  const store = getFollowV3State();
  console.log('[FOLLOW_V3_RECEIVE_COMPARE]', {
    incomingSongId: remote.songId,
    incomingSeq: remote.seq,
    incomingIndex: extra.incomingIndex ?? null,
    renderedSongId: store.currentSongId,
    renderedSeq: store.seq,
    renderedIndex: extra.renderedIndex ?? null,
    applied: extra.applied,
    skipReason: extra.skipReason ?? null,
  });
}

/**
 * Spectator Follow V3 — store-driven song identity; no router navigation for sync.
 */
export function useSpectatorFollowV3(opts: UseSpectatorFollowV3Opts): void {
  const lastRemoteV3Ref = useRef<FollowV3RemoteState | null>(null);
  const lastAppliedSeqRef = useRef(0);
  const lateJoinAppliedRef = useRef<string | null>(null);

  const applyRemote = useCallback(
    (remote: FollowV3RemoteState, source: string) => {
      if (!FEATURES.USE_FOLLOW_V3 || !opts.enabled || !readFollowDirector()) return;

      const songId = remote.songId;
      if (!songId) return;

      if (remote.seq <= lastAppliedSeqRef.current) {
        logReceiveCompare(remote, {
          applied: false,
          skipReason: `seq<=${lastAppliedSeqRef.current} (${source})`,
        });
        return;
      }

      const storeState = getFollowV3State();
      if (storeState.currentSongId === songId && remote.seq <= storeState.seq) {
        lastAppliedSeqRef.current = remote.seq;
        lastRemoteV3Ref.current = remote;
        logReceiveCompare(remote, {
          applied: false,
          skipReason: `store-already-at-song-seq (${source})`,
        });
        return;
      }

      console.log('[FOLLOW_V3_STORE_APPLY]', {
        songId,
        seq: remote.seq,
        source,
      });

      const applied = setFollowV3Song(songId, remote.seq);
      if (!applied) {
        logReceiveCompare(remote, {
          applied: false,
          skipReason: `store-seq-rejected (${source})`,
        });
        return;
      }

      lastRemoteV3Ref.current = remote;
      lastAppliedSeqRef.current = remote.seq;
      logReceiveCompare(remote, { applied: true });
      opts.onSongApplied?.(songId);
    },
    [opts.enabled, opts.onSongApplied]
  );

  useEffect(() => {
    opts.handlerRef.current = (state) => applyRemote(state, 'realtime');
    return () => {
      opts.handlerRef.current = null;
    };
  }, [applyRemote, opts.handlerRef]);

  useEffect(() => {
    if (!FEATURES.USE_FOLLOW_V3 || !opts.enabled || !readFollowDirector()) return;
    const code = opts.sessionCode?.trim();
    if (!code || code.length < 4) return;

    const songId = lastRemoteV3Ref.current?.songId;
    if (!songId) return;

    const joinKey = `${code}|${songId}|${lastRemoteV3Ref.current?.seq ?? 0}`;
    if (lateJoinAppliedRef.current === joinKey) return;
    lateJoinAppliedRef.current = joinKey;

    applyRemote(
      {
        sessionCode: code,
        seq: lastRemoteV3Ref.current?.seq ?? 0,
        songId,
        listId: lastRemoteV3Ref.current?.listId ?? null,
        mode: 'song',
        timestamp: Date.now(),
      },
      'late-join'
    );
  }, [opts.enabled, opts.sessionCode, applyRemote]);
}
