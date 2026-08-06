import type { RealtimeChannel } from '@supabase/supabase-js';
import { FOLLOW_V3_BROADCAST_EVENT } from '@/features/director-session/follow-v3/constants';
import type { FollowV3RemoteState } from '@/features/director-session/follow-v3/types';
import { realtimeLog } from '@/features/director-session/utils/realtimeLog';

export function attachFollowV3Listener(
  channel: RealtimeChannel,
  onUpdate: (state: FollowV3RemoteState) => void
): () => void {
  channel.on('broadcast', { event: FOLLOW_V3_BROADCAST_EVENT }, ({ payload }) => {
    if (!payload || typeof payload !== 'object') return;
    const state = payload as FollowV3RemoteState;
    if (!state.sessionCode || typeof state.seq !== 'number') return;
    realtimeLog('follow-v3 received', {
      sessionCode: state.sessionCode,
      seq: state.seq,
      songId: state.songId,
    });
    console.log('[FOLLOW_V3_RECEIVED]', state);
    onUpdate(state);
  });

  return () => {};
}
