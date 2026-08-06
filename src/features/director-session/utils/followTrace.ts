export type FollowTracePayload = {
  sessionCode?: string;
  actor?: 'director' | 'spectator';
  page?: string;
  songId?: string;
  remoteSongId?: string;
  localSongId?: string;
  remoteIndex?: number;
  localIndex?: number;
  visibilityIndex?: number;
  effectiveWindowIndex?: number;
  sectionIndex?: number;
  targetRoute?: string;
  currentRoute?: string;
  reason?: string;
  source?: string;
  extra?: Record<string, unknown>;
};

let traceSeq = 0;

/** FASE 1.1 — gate instrumentation alias (observability only). */
export function traceFollow(event: string, detail: Record<string, unknown>): void {
  followTrace(event, {
    currentRoute: typeof detail.pathname === 'string' ? detail.pathname : undefined,
    reason: typeof detail.reason === 'string' ? detail.reason : undefined,
    extra: detail,
  });
}

/** Deterministic follow pipeline trace — observability only. */
export function followTrace(event: string, payload?: FollowTracePayload): void {
  const seq = ++traceSeq;
  console.log('[FOLLOW_TRACE]');
  console.log(`seq=${seq}`);
  console.log(`perf=${performance.now().toFixed(3)}`);
  console.log(`ts=${Date.now()}`);
  console.log(`event=${event}`);
  if (payload != null) {
    console.log('payload', payload);
  }
}
