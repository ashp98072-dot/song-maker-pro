import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FEATURES } from '@/config/features';
import { isFollowV3SpectatorActive } from '@/features/director-session/follow-v3/isFollowV3Active';
import { useFollowV3Song } from '@/features/director-session/follow-v3/followV3Store';
import { getSongPathById } from '@/utils/songSlug';

const REMOTE_NAV_RETRY_MS = 1200;
const MAX_REMOTE_NAV_RETRIES = 2;

type UseFollowV3RouteMountOpts = {
  liveIsFollower: boolean;
  /** When true, director snapshot is continuous — do not mount SongView. */
  isDirectorContinuousView?: () => boolean;
  /** Retry match-director navigation after join (no song in store yet). */
  retryRemoteNavigation?: () => void;
};

/**
 * One-time initial mount of SongView route when V3 store has a song but follower is off /cancion/*.
 * URL mount only — render owner remains followV3Store; not used for sync re-navigation.
 */
export function useFollowV3RouteMount(opts: UseFollowV3RouteMountOpts): void {
  const followSongId = useFollowV3Song();
  const location = useLocation();
  const navigate = useNavigate();
  const hasMountedRef = useRef(false);
  const remoteRetryCountRef = useRef(0);
  const remoteRetryTimersRef = useRef<number[]>([]);

  const isFollowOwner = isFollowV3SpectatorActive(opts.liveIsFollower);

  const clearRetryTimers = () => {
    remoteRetryTimersRef.current.forEach((id) => window.clearTimeout(id));
    remoteRetryTimersRef.current = [];
  };

  useEffect(() => {
    if (!opts.liveIsFollower) {
      hasMountedRef.current = false;
      remoteRetryCountRef.current = 0;
      clearRetryTimers();
    }
  }, [opts.liveIsFollower]);

  useEffect(() => {
    if (!FEATURES.USE_FOLLOW_V3 || !isFollowOwner) return;
    if (followSongId || location.pathname.startsWith('/cancion/')) {
      remoteRetryCountRef.current = 0;
      clearRetryTimers();
      return;
    }

    clearRetryTimers();
    remoteRetryCountRef.current = 0;

    for (let attempt = 0; attempt < MAX_REMOTE_NAV_RETRIES; attempt++) {
      const delayMs = REMOTE_NAV_RETRY_MS * (attempt + 1);
      const timer = window.setTimeout(() => {
        remoteRetryCountRef.current = attempt + 1;
        console.log('[FOLLOW_V3_ROUTE_MOUNT_RETRY]', {
          attempt: attempt + 1,
          maxAttempts: MAX_REMOTE_NAV_RETRIES,
          delayMs,
          pathname: location.pathname,
          followSongId,
          directorContinuous: opts.isDirectorContinuousView?.() ?? false,
        });
        opts.retryRemoteNavigation?.();
      }, delayMs);
      remoteRetryTimersRef.current.push(timer);
    }

    return clearRetryTimers;
  }, [
    isFollowOwner,
    followSongId,
    location.pathname,
    opts.retryRemoteNavigation,
    opts.isDirectorContinuousView,
  ]);

  useEffect(() => {
    const pathname = location.pathname;
    const currentRoute = pathname;
    const onSongRoute = pathname.startsWith('/cancion/');
    const onLiveRoute = pathname.includes('/live');
    const directorContinuous = opts.isDirectorContinuousView?.() ?? false;
    const shouldMount =
      FEATURES.USE_FOLLOW_V3 &&
      isFollowOwner &&
      !!followSongId &&
      !onSongRoute &&
      !onLiveRoute &&
      !directorContinuous &&
      !hasMountedRef.current;

    console.log('[FOLLOW_V3_ROUTE_MOUNT_CHECK]', {
      pathname,
      followSongId,
      liveIsFollower: opts.liveIsFollower,
      shouldMount,
      currentRoute,
      isFollowOwner,
      hasMounted: hasMountedRef.current,
      directorContinuous,
    });

    if (!FEATURES.USE_FOLLOW_V3 || !isFollowOwner) {
      if (opts.liveIsFollower && followSongId && !onSongRoute) {
        console.log('[POTENTIAL_MOUNT_SKIP]', { reason: 'follow-v3-spectator-not-active' });
      }
      return;
    }

    if (directorContinuous) {
      console.log('[POTENTIAL_MOUNT_SKIP]', { reason: 'director-continuous-view' });
      opts.retryRemoteNavigation?.();
      return;
    }

    if (!followSongId) {
      if (!onSongRoute && !onLiveRoute) {
        console.log('[POTENTIAL_MOUNT_SKIP]', { reason: 'no-followSongId-yet' });
      }
      return;
    }

    if (onSongRoute || onLiveRoute) {
      hasMountedRef.current = true;
      return;
    }

    if (hasMountedRef.current) {
      console.log('[POTENTIAL_MOUNT_SKIP]', { reason: 'already-mounted' });
      return;
    }

    hasMountedRef.current = true;
    console.log('[FOLLOW_V3_INITIAL_ROUTE_MOUNT]', {
      followSongId,
      from: pathname,
    });
    navigate(getSongPathById(followSongId), { replace: true });
  }, [
    isFollowOwner,
    followSongId,
    location.pathname,
    navigate,
    opts.liveIsFollower,
    opts.isDirectorContinuousView,
    opts.retryRemoteNavigation,
  ]);
}
