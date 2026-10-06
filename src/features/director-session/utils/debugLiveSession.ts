import type { ViewMode } from '@/types/music';

export type DebugLiveSessionSnapshot = {
  pathname: string;
  connection: { sessionCode: string; role: string } | null;
  liveIsDirector: boolean;
  liveSessionCode: string;
  liveIsFollower: boolean;
  liveFollowerCode: string;
  directorChannelJoin: string;
  directorChannelState: string | null;
  followerChannelState: string | null;
  remote: {
    viewMode: ViewMode | null;
    resolvedViewMode: ViewMode | null;
    currentIndex: number | null;
    listId: string | null;
    currentSongId: string | null;
    genderShift: string | null;
    sharedSectionAnchor: string | null;
    updatedAt: string | null;
  } | null;
  liveSessionStatus: string;
  followDirector: boolean;
};

export function installDebugLiveSession(getSnapshot: () => DebugLiveSessionSnapshot): () => void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return () => {};

  const debugWindow = window as Window & { debugLiveSession?: () => DebugLiveSessionSnapshot };
  const debug = () => {
    const snap = getSnapshot();
    console.log('[debugLiveSession]', snap);
    return snap;
  };
  debugWindow.debugLiveSession = debug;

  console.log('[debugLiveSession] window.debugLiveSession() — dev only');
  return () => {
    if (debugWindow.debugLiveSession === debug) delete debugWindow.debugLiveSession;
  };
}
