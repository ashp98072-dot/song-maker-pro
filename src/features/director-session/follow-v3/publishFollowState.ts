import { FOLLOW_V3_BROADCAST_EVENT } from '@/features/director-session/follow-v3/constants';
import type { FollowV3RemoteState } from '@/features/director-session/follow-v3/types';
import { publishDirectorSessionBroadcast } from '@/features/director-session/realtime/sharedSessionSync';
import { normalizeSessionCode } from '@/features/director-session/types';
import { traceFollow } from '@/features/director-session/utils/followTrace';

export function publishFollowState(state: FollowV3RemoteState): void {
  const sessionCode = normalizeSessionCode(state.sessionCode);
  const payload: FollowV3RemoteState = {
    sessionCode,
    seq: state.seq,
    songId: state.songId,
    listId: state.listId ?? null,
    mode: state.mode,
    timestamp: state.timestamp,
  };

    console.log('[FOLLOW_V3_PUBLISH]', payload);
  traceFollow('FOLLOW_V3_PUBLISH', {
    seq: payload.seq,
    songId: payload.songId ?? undefined,
    sessionCode: payload.sessionCode,
  });

  publishDirectorSessionBroadcast(sessionCode, FOLLOW_V3_BROADCAST_EVENT, payload);
}
