import { useCallback, useRef, type MutableRefObject } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SessionState } from '@/types/music';
import { assertDirectorPublisher } from '@/features/director-session/live/liveSessionAuthority';
import type { LiveSessionBroadcastState } from '@/features/director-session/live/liveSessionTypes';
import { realtimeError, realtimeLog } from '@/features/director-session/utils/realtimeLog';

export function useLiveSessionBroadcast(channelRef: MutableRefObject<RealtimeChannel | null>) {
  const broadcastStateRef = useRef<LiveSessionBroadcastState>({
    songId: '',
    semitones: 0,
    currentKey: 'C',
  });
  const broadcastOverridesRef = useRef<Partial<LiveSessionBroadcastState> | undefined>();
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef('');
  const seqRef = useRef(0);

  const flushBroadcast = useCallback(() => {
    if (!assertDirectorPublisher('scheduleBroadcast')) return;
    if (!channelRef.current || channelRef.current.state !== 'joined') return;

    const overrides = broadcastOverridesRef.current;
    broadcastOverridesRef.current = undefined;
    const s = { ...broadcastStateRef.current, ...(overrides || {}) };

    const payloadCore = {
      songId: s.songId,
      semitones: s.semitones,
      key: s.currentKey,
      bpm: s.bpm,
      activeSection: s.activeSection,
      liveNote: s.liveNote,
      listId: s.listId,
      listSongIds: s.listSongIds,
      youtubeUrl: s.youtubeUrl,
      youtubePlaying: s.youtubePlaying,
      youtubeSeek: s.youtubeSeek,
    };

    const serialized = JSON.stringify(payloadCore);
    if (serialized === lastPayloadRef.current) return;

    seqRef.current += 1;
    const outgoing: SessionState = {
      ...payloadCore,
      seq: seqRef.current,
      timestamp: Date.now(),
    };

    realtimeLog('broadcast send', { event: 'sync', songId: outgoing.songId, seq: outgoing.seq });
    void channelRef.current
      .send({
        type: 'broadcast',
        event: 'sync',
        payload: outgoing,
      })
      .then((status) => {
        if (status !== 'ok') {
          realtimeError('broadcast send status', { event: 'sync', status });
        }
      })
      .catch((error) => {
        realtimeError('broadcast send error', { event: 'sync', error });
      });
    lastPayloadRef.current = serialized;
  }, [channelRef]);

  const scheduleBroadcast = useCallback(
    (opts?: { immediate?: boolean; overrides?: Partial<LiveSessionBroadcastState> }) => {
      if (!assertDirectorPublisher('scheduleBroadcast')) return;
      if (opts?.overrides) {
        broadcastOverridesRef.current = {
          ...broadcastOverridesRef.current,
          ...opts.overrides,
        };
      }

      if (opts?.immediate) {
        if (broadcastTimeoutRef.current) {
          clearTimeout(broadcastTimeoutRef.current);
          broadcastTimeoutRef.current = null;
        }
        flushBroadcast();
        return;
      }

      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      broadcastTimeoutRef.current = setTimeout(() => {
        broadcastTimeoutRef.current = null;
        flushBroadcast();
      }, 100);
    },
    [flushBroadcast]
  );

  const updateBroadcastState = useCallback((state: LiveSessionBroadcastState) => {
    broadcastStateRef.current = state;
  }, []);

  return {
    broadcastStateRef,
    scheduleBroadcast,
    updateBroadcastState,
    broadcastTimeoutRef,
    lastPayloadRef,
  };
}
