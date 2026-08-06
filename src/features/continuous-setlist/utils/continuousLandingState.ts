/** FASE 6 — estado único de landing follower (sin cambiar semántica FASE 5.x). */

export type PendingRemoteScroll = {
  songId: string;
  index: number;
  sectionAnchor?: string | null;
  remoteUpdatedAt?: string | null;
};

export type FollowerLandingSource =
  | 'shared-session'
  | 'recovery'
  | 'replay'
  | 'route-initial';

export type LandingStateSnapshot = {
  pendingLanding: { index: number; songId: string } | null;
  pendingRemoteScroll: PendingRemoteScroll | null;
  lastAppliedIndex: number | null;
  lastAppliedSongId: string | null;
  landingInProgress: boolean;
  lastSettledAt: number;
};

export function createLandingState() {
  let pendingLanding: { index: number; songId: string } | null = null;
  let pendingRemoteScroll: PendingRemoteScroll | null = null;
  let lastAppliedIndex: number | null = null;
  let lastAppliedSongId: string | null = null;
  let lastAppliedSection: string | null = null;
  let lastSettledAt = 0;
  let lastSettledUpdatedAt: string | null = null;
  let landingGeneration = 0;
  let remoteScrollInFlight = false;
  let frozenFollowerWindowIndex: number | null = null;

  return {
    beginLanding(remoteIndex: number, songId: string): number {
      landingGeneration += 1;
      pendingLanding = { index: remoteIndex, songId };
      lastAppliedSection = null;
      return landingGeneration;
    },

    queuePendingScroll(payload: PendingRemoteScroll): void {
      pendingRemoteScroll = payload;
    },

    getPendingScroll(): PendingRemoteScroll | null {
      return pendingRemoteScroll;
    },

    getPendingLanding(): { index: number; songId: string } | null {
      return pendingLanding;
    },

    hasPendingLanding(): boolean {
      return pendingLanding != null;
    },

    isLandingInProgress(): boolean {
      return pendingLanding != null || remoteScrollInFlight;
    },

    isSettled(remoteIndex: number): boolean {
      return (
        remoteIndex >= 0 &&
        remoteIndex === lastAppliedIndex &&
        pendingLanding == null &&
        !remoteScrollInFlight
      );
    },

    completeLanding(args: {
      index: number;
      songId: string;
      remoteUpdatedAt?: string | null;
    }): void {
      lastAppliedSongId = args.songId;
      lastAppliedIndex = args.index >= 0 ? args.index : null;
      lastSettledAt = Date.now();
      if (args.remoteUpdatedAt) {
        lastSettledUpdatedAt = args.remoteUpdatedAt;
      }
      pendingLanding = null;
      pendingRemoteScroll = null;
      remoteScrollInFlight = false;
    },

    cancelLanding(_reason: string): void {
      remoteScrollInFlight = false;
    },

    setScrollInFlight(value: boolean): void {
      remoteScrollInFlight = value;
    },

    getScrollInFlight(): boolean {
      return remoteScrollInFlight;
    },

    getGeneration(): number {
      return landingGeneration;
    },

    isCurrentGeneration(generation: number): boolean {
      return generation === landingGeneration;
    },

    getLastAppliedIndex(): number | null {
      return lastAppliedIndex;
    },

    getLastAppliedSongId(): string | null {
      return lastAppliedSongId;
    },

    getLastAppliedSection(): string | null {
      return lastAppliedSection;
    },

    setLastAppliedSection(anchorId: string | null): void {
      lastAppliedSection = anchorId;
    },

    clearLastAppliedSection(): void {
      lastAppliedSection = null;
    },

    getLastSettledAt(): number {
      return lastSettledAt;
    },

    getLastSettledUpdatedAt(): string | null {
      return lastSettledUpdatedAt;
    },

    getFrozenWindowIndex(): number | null {
      return frozenFollowerWindowIndex;
    },

    setFrozenWindowIndex(index: number | null): void {
      frozenFollowerWindowIndex = index;
    },

    reset(): void {
      pendingLanding = null;
      pendingRemoteScroll = null;
      lastAppliedIndex = null;
      lastAppliedSongId = null;
      lastAppliedSection = null;
      lastSettledAt = 0;
      lastSettledUpdatedAt = null;
      landingGeneration = 0;
      remoteScrollInFlight = false;
      frozenFollowerWindowIndex = null;
    },

    snapshot(): LandingStateSnapshot {
      return {
        pendingLanding,
        pendingRemoteScroll,
        lastAppliedIndex,
        lastAppliedSongId,
        landingInProgress: pendingLanding != null || remoteScrollInFlight,
        lastSettledAt,
      };
    },
  };
}

export type FollowerLandingStore = ReturnType<typeof createLandingState>;
