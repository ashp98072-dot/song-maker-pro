import { followTrace } from '@/features/director-session/utils/followTrace';

export const DIRECTOR_SONG_STABLE_MS = 350;
export const DIRECTOR_SONG_BOUNDARY_EXTRA_MS = 80;

/** Optional caller context for forensic traces only — does not affect detection logic. */
export type DirectorSongDetectionForensicContext = {
  renderedSongId?: string | null;
  renderedIndex?: number | null;
  previousSongId?: string | null;
  previousIndex?: number | null;
  publishedSongId?: string | null;
  publishedIndex?: number | null;
  currentUrl?: string;
  visibilityIndex?: number | null;
  effectiveWindowIndex?: number | null;
};

export type DirectorSongDetectionCandidate = {
  candidateIndex: number;
  candidateSongId: string;
  totalSongs: number;
  forensic?: DirectorSongDetectionForensicContext;
};

export type DirectorSongDetectionState = {
  lastPublishedIndex: number | null;
  /** Forensic mirror of last publish — NOT used by same-as-published gate (index-only). */
  lastPublishedSongId: string | null;
  lastStableAt: number | null;
  /** True only after publish-success; initialIndex does not set this. */
  hasPublishedOnce: boolean;
  pending: { index: number; songId: string; since: number } | null;
};

export type PublishedStateMutationSource =
  | 'publish-success'
  | 'pending-reset'
  | 'candidate-start'
  | 'recovery'
  | 'unknown';

export function createDirectorSongDetectionState(
  initialPublishedIndex: number | null = null,
  initialPublishedSongId: string | null = null
): DirectorSongDetectionState {
  return {
    lastPublishedIndex: initialPublishedIndex,
    lastPublishedSongId: initialPublishedSongId,
    lastStableAt: null,
    hasPublishedOnce: false,
    pending: null,
  };
}

export function directorSongDetectedLog(detail: Record<string, unknown>): void {
  console.log('[DIRECTOR_SONG_DETECTED]', detail);
}

export function directorSongStableLog(detail: Record<string, unknown>): void {
  console.log('[DIRECTOR_SONG_STABLE]', detail);
}

export function directorSongIgnoreLog(detail: Record<string, unknown>): void {
  console.log('[DIRECTOR_SONG_IGNORE]', detail);
}

function requiredStableMs(index: number, totalSongs: number): number {
  if (totalSongs <= 1) return DIRECTOR_SONG_STABLE_MS;
  const isBoundary = index === 0 || index === totalSongs - 1;
  return isBoundary ? DIRECTOR_SONG_STABLE_MS + DIRECTOR_SONG_BOUNDARY_EXTRA_MS : DIRECTOR_SONG_STABLE_MS;
}

export type DirectorSongDetectionResult = {
  state: DirectorSongDetectionState;
  stableIndex: number | null;
  stableSongId: string | null;
  ignoreReason?: string;
};

function tracePublishedStateMutation(opts: {
  previousPublishedIndex: number | null;
  previousPublishedSongId: string | null;
  nextPublishedIndex: number | null;
  nextPublishedSongId: string | null;
  source: PublishedStateMutationSource;
}): void {
  const indexChanged = opts.previousPublishedIndex !== opts.nextPublishedIndex;
  const songChanged = opts.previousPublishedSongId !== opts.nextPublishedSongId;
  if (!indexChanged && !songChanged && opts.source !== 'pending-reset') {
    return;
  }
  followTrace('FOLLOW_PUBLISHED_STATE_MUTATION', {
    actor: 'director',
    extra: {
      previousPublishedIndex: opts.previousPublishedIndex,
      previousPublishedSongId: opts.previousPublishedSongId,
      nextPublishedIndex: opts.nextPublishedIndex,
      nextPublishedSongId: opts.nextPublishedSongId,
      source: opts.source,
      indexChanged,
      songChanged,
    },
  });
}

function buildDetectorPayload(
  candidate: DirectorSongDetectionCandidate,
  state: DirectorSongDetectionState
): DirectorSongDetectionForensicContext & {
  renderedSongId: string;
  renderedIndex: number;
} {
  const f = candidate.forensic ?? {};
  return {
    renderedSongId: f.renderedSongId ?? candidate.candidateSongId,
    renderedIndex: f.renderedIndex ?? candidate.candidateIndex,
    previousSongId: f.previousSongId ?? state.pending?.songId ?? null,
    previousIndex: f.previousIndex ?? state.pending?.index ?? null,
    publishedSongId: f.publishedSongId ?? state.lastPublishedSongId,
    publishedIndex: f.publishedIndex ?? state.lastPublishedIndex,
    currentUrl: f.currentUrl,
    visibilityIndex: f.visibilityIndex ?? null,
    effectiveWindowIndex: f.effectiveWindowIndex ?? null,
  };
}

function traceDetectorInput(
  candidate: DirectorSongDetectionCandidate,
  state: DirectorSongDetectionState
): ReturnType<typeof buildDetectorPayload> {
  const payload = buildDetectorPayload(candidate, state);
  followTrace('FOLLOW_DETECTOR_INPUT', {
    actor: 'director',
    songId: payload.renderedSongId ?? undefined,
    remoteSongId: payload.renderedSongId ?? undefined,
    remoteIndex: payload.renderedIndex ?? undefined,
    localIndex: payload.renderedIndex ?? undefined,
    visibilityIndex: payload.visibilityIndex ?? undefined,
    effectiveWindowIndex: payload.effectiveWindowIndex ?? undefined,
    currentRoute: payload.currentUrl,
    extra: { ...payload },
  });
  return payload;
}

function tracePublishCompare(
  candidate: DirectorSongDetectionCandidate,
  state: DirectorSongDetectionState
): void {
  const renderedIndex = candidate.candidateIndex;
  const renderedSongId = candidate.candidateSongId;
  const publishedIndex = state.lastPublishedIndex;
  const publishedSongId = state.lastPublishedSongId;
  const indexEqual = publishedIndex === renderedIndex;
  const songEqual =
    publishedSongId != null &&
    publishedSongId.length > 0 &&
    publishedSongId === renderedSongId;
  const gateWouldBlock =
    state.hasPublishedOnce && indexEqual;

  followTrace('FOLLOW_PUBLISH_COMPARE', {
    actor: 'director',
    songId: renderedSongId,
    remoteSongId: renderedSongId,
    remoteIndex: renderedIndex,
    currentRoute: candidate.forensic?.currentUrl ?? undefined,
    extra: {
      renderedIndex,
      renderedSongId,
      publishedIndex,
      publishedSongId,
      hasPublishedOnce: state.hasPublishedOnce,
      indexEqual,
      songEqual,
      bothEqual: indexEqual && songEqual,
      gateUsesIndexOnly: true,
      gateExpression:
        'hasPublishedOnce && lastPublishedIndex === candidateIndex',
      gateWouldBlock,
      songDiffersWhileIndexEqual: indexEqual && !songEqual,
    },
  });
}

function traceSameAsPublishedForensic(
  candidate: DirectorSongDetectionCandidate,
  state: DirectorSongDetectionState,
  now: number
): void {
  const renderedIndex = candidate.candidateIndex;
  const renderedSongId = candidate.candidateSongId;
  const publishedIndex = state.lastPublishedIndex;
  const publishedSongId = state.lastPublishedSongId;
  const pendingIndex = state.pending?.index ?? null;
  const pendingSongId = state.pending?.songId ?? null;
  const indexEqual = publishedIndex === renderedIndex;
  const songEqual =
    publishedSongId != null &&
    publishedSongId.length > 0 &&
    publishedSongId === renderedSongId;

  const forensicPayload = {
    renderedIndex,
    renderedSongId,
    publishedIndex,
    publishedSongId,
    pendingIndex,
    pendingSongId,
    previousPendingIndex: pendingIndex,
    previousPendingSongId: pendingSongId,
    equality: {
      indexEqual,
      songEqual,
      bothEqual: indexEqual && songEqual,
    },
    detectorState: {
      hasPending: state.pending != null,
      publishInProgress: false,
      lastStableAt: state.lastStableAt,
      pendingStartedAt: state.pending?.since ?? null,
    },
    route: candidate.forensic?.currentUrl ?? null,
    ts: Date.now(),
    blockedBecausePublishedOnce: state.hasPublishedOnce,
    gateNote:
      'same-as-published requires hasPublishedOnce && indexEqual; songEqual is forensic-only',
    compareAtMs: now,
  };

  followTrace('FOLLOW_SAME_AS_PUBLISHED_FORENSIC', {
    actor: 'director',
    songId: renderedSongId,
    remoteSongId: renderedSongId,
    remoteIndex: renderedIndex,
    reason: 'same-as-published',
    currentRoute: candidate.forensic?.currentUrl ?? undefined,
    extra: forensicPayload,
  });
}

function traceDetectorIgnoreReason(
  reason: string,
  payload: ReturnType<typeof buildDetectorPayload>
): void {
  followTrace('FOLLOW_DETECTOR_IGNORE_REASON', {
    actor: 'director',
    reason,
    songId: payload.renderedSongId ?? undefined,
    remoteSongId: payload.renderedSongId ?? undefined,
    remoteIndex: payload.renderedIndex ?? undefined,
    extra: {
      reason,
      renderedSongId: payload.renderedSongId,
      previousSongId: payload.previousSongId,
      renderedIndex: payload.renderedIndex,
      previousIndex: payload.previousIndex,
      publishedSongId: payload.publishedSongId,
      publishedIndex: payload.publishedIndex,
    },
  });
}

function traceStableCancelledDetail(
  reason: string,
  payload: ReturnType<typeof buildDetectorPayload>,
  candidateSongId: string,
  candidateIndex: number
): void {
  followTrace('FOLLOW_STABLE_CANCELLED_DETAIL', {
    actor: 'director',
    reason,
    songId: candidateSongId,
    remoteSongId: candidateSongId,
    remoteIndex: candidateIndex,
    extra: {
      reason,
      candidateSongId,
      candidateIndex,
      publishedSongId: payload.publishedSongId,
      publishedIndex: payload.publishedIndex,
      previousSongId: payload.previousSongId,
      previousIndex: payload.previousIndex,
      renderedSongId: payload.renderedSongId,
      renderedIndex: payload.renderedIndex,
    },
  });
  followTrace('FOLLOW_STABLE_CANCELLED', {
    actor: 'director',
    remoteIndex: candidateIndex,
    remoteSongId: candidateSongId,
    reason,
    extra: {
      publishedIndex: payload.publishedIndex,
      publishedSongId: payload.publishedSongId,
    },
  });
}

function traceStablePublishDetail(
  payload: ReturnType<typeof buildDetectorPayload>,
  nextSongId: string,
  nextIndex: number,
  publishReason: string
): void {
  followTrace('FOLLOW_STABLE_PUBLISH_DETAIL', {
    actor: 'director',
    songId: nextSongId,
    remoteSongId: nextSongId,
    remoteIndex: nextIndex,
    reason: publishReason,
    extra: {
      previousSongId: payload.previousSongId ?? payload.publishedSongId,
      nextSongId,
      previousIndex: payload.previousIndex ?? payload.publishedIndex,
      nextIndex,
      publishReason,
      publishedSongId: payload.publishedSongId,
      publishedIndex: payload.publishedIndex,
    },
  });
}

/**
 * visibility candidate → dominant song → stable window → publish when index changed.
 */
export function processDirectorSongDetection(
  candidate: DirectorSongDetectionCandidate,
  state: DirectorSongDetectionState,
  now = Date.now()
): DirectorSongDetectionResult {
  const { candidateIndex, candidateSongId, totalSongs } = candidate;
  const detectorPayload = traceDetectorInput(candidate, state);

  directorSongDetectedLog({ candidate: candidateIndex, songId: candidateSongId });

  if (candidateIndex < 0 || !candidateSongId) {
    directorSongIgnoreLog({ reason: 'invalid candidate', index: candidateIndex });
    traceDetectorIgnoreReason('invalid-candidate', detectorPayload);
    traceStableCancelledDetail('invalid-candidate', detectorPayload, candidateSongId, candidateIndex);
    return { state, stableIndex: null, stableSongId: null, ignoreReason: 'invalid-candidate' };
  }

  tracePublishCompare(candidate, state);

  if (state.hasPublishedOnce && state.lastPublishedIndex === candidateIndex) {
    traceSameAsPublishedForensic(candidate, state, now);
    directorSongIgnoreLog({ reason: 'same as last published', index: candidateIndex });
    traceDetectorIgnoreReason('same-as-published', detectorPayload);
    traceStableCancelledDetail('same-as-published', detectorPayload, candidateSongId, candidateIndex);
    tracePublishedStateMutation({
      previousPublishedIndex: state.lastPublishedIndex,
      previousPublishedSongId: state.lastPublishedSongId,
      nextPublishedIndex: state.lastPublishedIndex,
      nextPublishedSongId: state.lastPublishedSongId,
      source: 'pending-reset',
    });
    return {
      state: { ...state, pending: null },
      stableIndex: null,
      stableSongId: null,
      ignoreReason: 'same-as-published',
    };
  }

  const stableMs = requiredStableMs(candidateIndex, totalSongs);
  const isBoundary =
    totalSongs > 1 && (candidateIndex === 0 || candidateIndex === totalSongs - 1);

  if (!state.pending || state.pending.index !== candidateIndex || state.pending.songId !== candidateSongId) {
    followTrace('FOLLOW_STABLE_CANDIDATE', {
      actor: 'director',
      remoteIndex: candidateIndex,
      remoteSongId: candidateSongId,
      reason: 'pending-started',
      extra: {
        timerMs: stableMs,
        isBoundary,
        previousPendingIndex: state.pending?.index ?? null,
        ...detectorPayload,
      },
    });
    return {
      state: {
        lastPublishedIndex: state.lastPublishedIndex,
        lastPublishedSongId: state.lastPublishedSongId,
        lastStableAt: state.lastStableAt,
        hasPublishedOnce: state.hasPublishedOnce,
        pending: { index: candidateIndex, songId: candidateSongId, since: now },
      },
      stableIndex: null,
      stableSongId: null,
    };
  }

  const elapsed = now - state.pending.since;
  if (elapsed < stableMs) {
    const ignoreReason = isBoundary ? 'unstable-boundary' : 'not-stable-yet';
    if (isBoundary) {
      directorSongIgnoreLog({
        reason: 'unstable boundary',
        index: candidateIndex,
        elapsedMs: elapsed,
        requiredMs: stableMs,
      });
    } else {
      directorSongIgnoreLog({
        reason: 'not stable yet',
        index: candidateIndex,
        elapsedMs: elapsed,
        requiredMs: stableMs,
      });
    }
    traceDetectorIgnoreReason(ignoreReason, detectorPayload);
    traceStableCancelledDetail(ignoreReason, detectorPayload, candidateSongId, candidateIndex);
    return {
      state,
      stableIndex: null,
      stableSongId: null,
      ignoreReason,
    };
  }

  traceStablePublishDetail(
    detectorPayload,
    candidateSongId,
    candidateIndex,
    'stable-window-elapsed'
  );
  directorSongStableLog({ index: candidateIndex, songId: candidateSongId, stableMs: elapsed });
  followTrace('FOLLOW_STABLE_PUBLISHED', {
    actor: 'director',
    remoteIndex: candidateIndex,
    remoteSongId: candidateSongId,
    reason: 'stable-window-elapsed',
    extra: { timerMs: elapsed, isBoundary, ...detectorPayload },
  });

  tracePublishedStateMutation({
    previousPublishedIndex: state.lastPublishedIndex,
    previousPublishedSongId: state.lastPublishedSongId,
    nextPublishedIndex: candidateIndex,
    nextPublishedSongId: candidateSongId,
    source: 'publish-success',
  });

  return {
    state: {
      lastPublishedIndex: candidateIndex,
      lastPublishedSongId: candidateSongId,
      lastStableAt: now,
      hasPublishedOnce: true,
      pending: null,
    },
    stableIndex: candidateIndex,
    stableSongId: candidateSongId,
  };
}
