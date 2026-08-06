export type ContinuousVisibilityUpdate = {
  currentSongId: string | null;
  currentIndex: number;
  sectionAnchor?: string | null;
};

export type ContinuousDirectorPublisher = {
  queueVisibilityUpdate: (update: ContinuousVisibilityUpdate) => void;
  flushImmediate: (snapshot?: ContinuousVisibilityUpdate) => void;
  destroy: () => void;
};

export function directorPublishLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[DIRECTOR_PUBLISH] ${message}`, detail);
  } else {
    console.log(`[DIRECTOR_PUBLISH] ${message}`);
  }
}

export function directorStableLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[DIRECTOR_STABLE] ${message}`, detail);
  } else {
    console.log(`[DIRECTOR_STABLE] ${message}`);
  }
}

export function directorSkipLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[DIRECTOR_SKIP] ${message}`, detail);
  } else {
    console.log(`[DIRECTOR_SKIP] ${message}`);
  }
}

export function directorFlushLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[DIRECTOR_FLUSH] ${message}`, detail);
  } else {
    console.log(`[DIRECTOR_FLUSH] ${message}`);
  }
}

export function directorCancelLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[DIRECTOR_CANCEL] ${message}`, detail);
  } else {
    console.log(`[DIRECTOR_CANCEL] ${message}`);
  }
}

type PublisherOptions = {
  publish: (update: ContinuousVisibilityUpdate) => void;
  stableDelay?: number;
};

function sameSongIndex(
  a: ContinuousVisibilityUpdate,
  b: ContinuousVisibilityUpdate
): boolean {
  return a.currentSongId === b.currentSongId && a.currentIndex === b.currentIndex;
}

function sameFullState(
  a: ContinuousVisibilityUpdate,
  b: ContinuousVisibilityUpdate
): boolean {
  return (
    sameSongIndex(a, b) &&
    (a.sectionAnchor ?? null) === (b.sectionAnchor ?? null)
  );
}

export function createContinuousDirectorPublisher(
  options: PublisherOptions
): ContinuousDirectorPublisher {
  const { publish, stableDelay = 300 } = options;

  let pending: ContinuousVisibilityUpdate | null = null;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPublished: ContinuousVisibilityUpdate | null = null;

  const clearStableTimer = (reason: string) => {
    if (!stableTimer) return;
    directorCancelLog(reason);
    clearTimeout(stableTimer);
    stableTimer = null;
  };

  const commitPublish = (update: ContinuousVisibilityUpdate, label: 'stable' | 'flush') => {
    if (lastPublished && sameFullState(lastPublished, update)) {
      directorSkipLog('duplicate ignored', update);
      return;
    }
    if (label === 'stable') {
      directorStableLog('publishing stable song', update);
    } else {
      directorFlushLog('manual publish', update);
    }
    publish(update);
    lastPublished = {
      currentSongId: update.currentSongId,
      currentIndex: update.currentIndex,
      sectionAnchor: update.sectionAnchor ?? null,
    };
    pending = null;
  };

  const scheduleStable = () => {
    if (!pending) return;
    clearStableTimer('replaced by newer visibility');
    stableTimer = setTimeout(() => {
      stableTimer = null;
      const candidate = pending;
      if (!candidate) return;
      commitPublish(candidate, 'stable');
    }, stableDelay);
  };

  return {
    queueVisibilityUpdate(update: ContinuousVisibilityUpdate) {
      directorPublishLog('candidate visibility', update);

      const merged: ContinuousVisibilityUpdate = {
        currentSongId: update.currentSongId,
        currentIndex: update.currentIndex,
        sectionAnchor:
          update.sectionAnchor !== undefined
            ? update.sectionAnchor
            : (pending?.sectionAnchor ?? null),
      };

      if (pending && !sameSongIndex(pending, merged)) {
        clearStableTimer('replaced by newer visibility');
      } else if (stableTimer) {
        clearStableTimer('replaced by newer visibility');
      }

      if (lastPublished && sameFullState(lastPublished, merged)) {
        directorSkipLog('duplicate ignored', merged);
        pending = merged;
        return;
      }

      pending = merged;
      scheduleStable();
    },

    flushImmediate(snapshot?: ContinuousVisibilityUpdate) {
      clearStableTimer('flushed before stable window');
      const toPublish = snapshot
        ? {
            currentSongId: snapshot.currentSongId,
            currentIndex: snapshot.currentIndex,
            sectionAnchor: snapshot.sectionAnchor ?? null,
          }
        : pending;
      if (!toPublish) {
        directorSkipLog('flush skipped — no pending snapshot');
        return;
      }
      commitPublish(toPublish, 'flush');
    },

    destroy() {
      clearStableTimer('publisher destroyed');
      pending = null;
      lastPublished = null;
    },
  };
}
