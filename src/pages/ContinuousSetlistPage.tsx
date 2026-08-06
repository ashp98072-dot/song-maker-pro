import { useParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import DirectorSession from '@/components/DirectorSession';
import { SimpleLiveSyncPanel, type SimpleLiveState, useSimpleLiveSyncOptional } from '@/features/simple-live-sync';
import { useSetlistSongs } from '@/features/continuous-setlist/hooks/useSetlistSongs';
import { useContinuousSetlistSettings } from '@/features/continuous-setlist/hooks/useContinuousSetlistSettings';
import { useScrollVisibility } from '@/features/continuous-setlist/hooks/useScrollVisibility';
import {
  sectionApplyLog,
  sectionSyncLog,
} from '@/features/continuous-setlist/utils/sectionSync';
import {
  ensureRemoteSongRendered,
  scrollFollowerToExactSong,
} from '@/features/continuous-setlist/utils/continuousFollowLanding';
import {
  runFollowerSettleVerification,
  type FollowAuditSnapshot,
} from '@/features/continuous-setlist/utils/continuousFollowAudit';
import {
  emitFollowerDiagnosis,
  isSectionSyncBlocked,
  isStaleRemoteReplay,
  isWithinReplayCooldown,
  SECTION_SYNC_BLOCK_MS,
  SETTLE_VERIFY_MS,
  WINDOW_FREEZE_EXTRA_MS,
  type FollowRuntimeContext,
  type FollowRuntimeEventType,
} from '@/features/continuous-setlist/utils/continuousFollowRuntimeDiagnosis';
import {
  followApplyAllowedLog,
  followApplyBlockedLog,
  followApplyLog,
  followDuplicateLog,
  followFailedLog,
  followIgnoreLog,
  followLandingLog,
  followPipelineLog,
  followResidualLog,
  followSettledLog,
  followSkipLog,
  followUnexpectedScrollLog,
  remoteSectionLog,
} from '@/features/continuous-setlist/utils/continuousFollowSyncLog';
import {
  createLandingState,
  type FollowerLandingSource,
} from '@/features/continuous-setlist/utils/continuousLandingState';
import { isFollowerVisibilityReadOnly } from '@/features/continuous-setlist/utils/continuousFollowVisibility';
import {
  followDesyncWarningLog,
} from '@/features/continuous-setlist/utils/continuousFollowSyncLog';
import {
  enforceFollowerLiveRetention,
  followTargetLog,
  followViewLog,
  isContinuousLiveSimpleMode,
  isFollowerInContinuousMode,
  shouldRetainFollowerViewMode,
} from '@/features/director-session/utils/followerViewMode';
import { FEATURES } from '@/config/features';
import { followTrace, traceFollow } from '@/features/director-session/utils/followTrace';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';
import { navigateFollowerSongViewOnly } from '@/features/director-session/utils/navigateFollowerSongViewOnly';
import { shouldDisableLegacyFollowPipeline } from '@/features/director-session/follow-v3/followV3Ownership';
import { useDirectorFollowV3 } from '@/features/director-session/follow-v3/useDirectorFollowV3';
import {
  createDirectorSongDetectionState,
  processDirectorSongDetection,
} from '@/features/continuous-setlist/utils/continuousDirectorSongDetection';
import {
  createInitialDirectorContinuousState,
  directorIntentLog,
  directorPublishIntentLog,
  directorStableVisibilityLog,
  type DirectorContinuousState,
  type DirectorIntentAction,
} from '@/features/continuous-setlist/utils/continuousDirectorIntent';
import { auditEventLog } from '@/features/director-session/utils/auditEventLog';
import { mobileUiLog } from '@/features/mobile-worship/utils/mobileUiLog';
import {
  isIndexInWindow,
  useVirtualSongWindow,
} from '@/features/continuous-setlist/hooks/useVirtualSongWindow';
import { useSetlistPreload } from '@/features/continuous-setlist/hooks/useSetlistPreload';
import { ContinuousSetlistScroller } from '@/features/continuous-setlist/components/ContinuousSetlistScroller';
import { ContinuousSetlistToolbar } from '@/features/continuous-setlist/components/ContinuousSetlistToolbar';
import { ContinuousSetlistDock } from '@/features/continuous-setlist/components/ContinuousSetlistDock';
import { SetlistMiniNavigator } from '@/features/continuous-setlist/components/SetlistMiniNavigator';
import { useTransposeEngine } from '@/features/transpose/hooks/useTransposeEngine';
import { useAutoScroll } from '@/features/rehearsal/hooks/useAutoScroll';
import { getUserSemitones, setUserSemitones } from '@/utils/userTranspositions';
import { getSongPath, getSongPathById } from '@/utils/songSlug';
import { useWakeLock } from '@/features/mobile-stage/hooks/useWakeLock';
import { useIsMobileViewport } from '@/features/mobile-stage/hooks/useIsMobileViewport';
import { useMobileDockState } from '@/features/mobile-worship/hooks/useMobileDockState';
import { useMobileControlsChrome } from '@/features/mobile-worship/hooks/useMobileControlsChrome';
import { MobileControlsRestoreFab } from '@/features/mobile-worship/components/MobileControlsRestoreFab';
import { TeleprompterLivePill } from '@/features/mobile-worship/components/TeleprompterLivePill';
import { startWorshipServiceMode } from '@/features/mobile-worship/utils/worshipServiceMode';
import {
  loadContinuousPersisted,
  saveContinuousPersisted,
} from '@/features/continuous-setlist/utils/persistence';
import { resolveSharedViewMode, type SessionState, type ViewMode } from '@/types/music';
import type { DirectorSessionConnection, SharedSessionState } from '@/features/director-session/types';
import {
  LIVE_SESSION_FORCE_CONTINUOUS_INDEX_EVENT,
  type ForceContinuousIndexDetail,
} from '@/features/director-session/utils/liveSessionContinuousSyncEvents';
import {
  buildContinuousSharedState,
  readFollowDirector,
  writeFollowDirector,
  followDirectorLog,
  followPrefLog,
  followBlockedLog,
  sessionSyncLog,
  isPassiveSpectatorMode,
  fromSharedGenderShift,
  toSharedGenderShift,
  continuousSyncLog,
  logContinuousPublish,
  isContinuousRecoveryReady,
  localGenderFromRecovery,
  sessionRecoveryLog,
  type SessionRecoveryMeta,
  type SessionRecoveryState,
} from '@/features/director-session';
import { readStoredLiveSession } from '@/features/director-session/utils/sessionRecovery';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerDirectorSyncLoader } from '@/features/director-session/components/FollowerDirectorSyncLoader';
import { FollowerContinuousShell } from '@/features/director-session/components/FollowerContinuousShell';
import { useSessionOriginMismatch } from '@/features/director-session/hooks/useSessionOriginMismatch';
import { useReportSessionPageContext } from '@/features/director-session/hooks/useReportSessionPageContext';
import { SessionOriginMismatchDialog } from '@/features/director-session/components/SessionOriginMismatchDialog';
import {
  hasManualExitContinuous,
  markManualExitContinuous,
} from '@/features/director-session/utils/continuousExitGuard';
import {
  navigateExitToSongView,
  resolveExitContinuousSongId,
  type ExitContinuousNavState,
} from '@/features/director-session/utils/exitContinuousNavigation';
import {
  persistContinuousListSync,
  readContinuousListSync,
} from '@/features/continuous-setlist/utils/continuousListSyncCache';
import { fetchLiveSessionList } from '@/features/continuous-setlist/utils/fetchLiveSessionList';
import { SectionQuickNav } from '@/features/song-view/components/SectionQuickNav';
import { SongViewPreferenceToggle } from '@/features/song-view/components/SongViewPreferenceToggle';
import {
  songViewRenderLog,
  useSongViewPreference,
} from '@/features/song-view/preferences/songViewPreference';
import { scrollToSectionAnchor } from '@/utils/sectionAnchorScroll';
import '@/features/continuous-setlist/continuous-setlist.css';

console.log('[BOOT_IMPORT]', 'ContinuousSetlistPage');

type ContinuousRouteState = {
  joinSessionCode?: string;
  listId?: string;
  listSongIds?: string[];
  initialSongId?: string;
  initialIndex?: number;
  recoverySource?: 'shared-session' | 'db' | 'route' | 'fallback';
  /** From ListDetail “Iniciar culto” — auto-start live + teleprompter once. */
  startServiceMode?: boolean;
};

export type { ExitContinuousNavState } from '@/features/director-session/utils/exitContinuousNavigation';

export default function ContinuousSetlistPage() {
  const { id: listId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeState = (location.state as ContinuousRouteState | null) ?? {};
  const indexFromQuery = Number.parseInt(searchParams.get('index') ?? '', 10);
  const routeInitialIndex =
    typeof routeState.initialIndex === 'number' && routeState.initialIndex >= 0
      ? routeState.initialIndex
      : Number.isFinite(indexFromQuery) && indexFromQuery >= 0
        ? indexFromQuery
        : undefined;
  const joinSessionCode = routeState.joinSessionCode;
  const {
    connection: sessionConnection,
    liveIsDirector,
    liveIsFollower,
    followerAwaitingDirector,
    publishSharedSessionIfDirector,
    sessionConnected,
    activeJoinCode,
    setFollowDirectorPreference,
  } = useSpectatorSession();
  const simpleLive = useSimpleLiveSyncOptional();
  const autoJoinFollower = sessionConnected;
  const effectiveJoinCode = activeJoinCode ?? joinSessionCode;
  const routeInitialAppliedRef = useRef(false);
  const [sharedListSongIds, setSharedListSongIds] = useState<string[]>(() => {
    if (routeState.listSongIds?.length) return routeState.listSongIds;
    if (listId) {
      const cached = readContinuousListSync(listId);
      if (cached?.length) return cached;
    }
    return [];
  });
  const [liveSessionSongIds, setLiveSessionSongIds] = useState<string[]>([]);
  const sessionCodeForFetch =
    joinSessionCode ?? simpleLive?.code ?? readStoredLiveSession()?.code ?? '';

  const scrollRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSeqRef = useRef(0);
  const initialScrollDone = useRef(false);
  const applyingRemoteRef = useRef(false);
  const sessionHydrationRef = useRef(false);
  const lastPublishedSongRef = useRef<string | null>(null);
  const lastPublishedSectionRef = useRef<string>('');
  const directorContinuousStateRef = useRef<DirectorContinuousState>(
    createInitialDirectorContinuousState([], {
      initialSongId: routeState.initialSongId,
      initialIndex: routeInitialIndex,
    })
  );

  useEffect(() => {
    if (!liveIsFollower) return;
    console.log('[CONTINUOUS_PAGE_RENDER]', {
      listId,
      pathname: location.pathname,
      indexFromQuery: Number.isFinite(indexFromQuery) ? indexFromQuery : null,
      routeInitialIndex: routeInitialIndex ?? null,
      followerAwaitingDirector,
      sharedListSongIdsLen: sharedListSongIds.length,
    });
  }, [
    liveIsFollower,
    listId,
    location.pathname,
    indexFromQuery,
    routeInitialIndex,
    followerAwaitingDirector,
    sharedListSongIds.length,
  ]);
  const directorEnterPublishedRef = useRef(false);
  const unsettledRemoteChangeCountRef = useRef(0);
  const lastSettledRemoteIndexRef = useRef<number | null>(null);
  const lastPublishedIntentKeyRef = useRef('');
  const lastStableVisibilityPublishKeyRef = useRef('');
  const directorSongDetectionRef = useRef(createDirectorSongDetectionState());
  const applyRemoteSongOnceRef = useRef<
    | ((
        remoteIndex: number | undefined,
        remoteSongId: string | null | undefined,
        remoteListIds: string[],
        sectionAnchor?: string | null,
        source?: FollowerLandingSource,
        remoteUpdatedAt?: string | null
      ) => Promise<boolean>)
    | null
  >(null);
  const STABLE_VISIBILITY_MS = 400;
  const landing = useMemo(() => createLandingState(), []);
  const windowUnfreezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const autoScrollingRef = useRef(false);
  const [directorSectionAnchor, setDirectorSectionAnchor] = useState('');
  const [genderShift, setGenderShift] = useState<'' | 'male' | 'female'>('');
  const [followDirector, setFollowDirector] = useState(() => readFollowDirector());
  const followDirectorRef = useRef(followDirector);
  useEffect(() => {
    followDirectorRef.current = followDirector;
  }, [followDirector]);

  // Keep page follow flag in sync with simple-live panel checkbox.
  useEffect(() => {
    if (!simpleLive || simpleLive.role !== 'follower') return;
    if (followDirector === simpleLive.followDirector) return;
    setFollowDirector(simpleLive.followDirector);
  }, [simpleLive?.role, simpleLive?.followDirector, followDirector, simpleLive]);

  const { list, entries, songIds, resolvedSongIds, resolvedSource } = useSetlistSongs(listId, {
    routeSongIds: routeState.listSongIds,
    sharedSongIds: sharedListSongIds,
    liveSessionSongIds,
  });


  useEffect(() => {
    if (routeState.listSongIds?.length && listId) {
      setSharedListSongIds(routeState.listSongIds);
      persistContinuousListSync(listId, routeState.listSongIds);
      continuousSyncLog('route state applied to shared list', {
        listId,
        count: routeState.listSongIds.length,
      });
    }
  }, [listId, routeState.listSongIds]);

  useEffect(() => {
    if (!followDirector || !sessionCodeForFetch || !listId || resolvedSongIds.length > 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const payload = await fetchLiveSessionList(sessionCodeForFetch);
      if (cancelled || !payload?.listSongIds.length) return;

      const ids = payload.listSongIds;

      setLiveSessionSongIds(ids);
      setSharedListSongIds(ids);
      persistContinuousListSync(listId, ids);
      continuousSyncLog('live_sessions bootstrap list', {
        listId,
        sessionCode: sessionCodeForFetch,
        count: ids.length,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [followDirector, sessionCodeForFetch, listId, resolvedSongIds.length]);
  const persisted = useMemo(
    () => (listId ? loadContinuousPersisted(listId) : null),
    [listId]
  );

  const { settings, patch, toggle } = useContinuousSetlistSettings(persisted?.settings);
  const [songViewPreference, setSongViewPreference] = useSongViewPreference();
  const isLyricsOnlyPreference = songViewPreference === 'lyrics-only';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  /** Expande ventana virtual al índice remoto antes de scroll (follower sync). */
  const [syncTargetIndex, setSyncTargetIndex] = useState<number | null>(null);
  /** Fuerza re-render al congelar/descongelar ventana virtual follower. */
  const [followerWindowFreezeTick, setFollowerWindowFreezeTick] = useState(0);
  const [transposeRevision, setTransposeRevision] = useState(0);
  const [liveNote, setLiveNote] = useState('');

  const { controlsHidden, hideControls: hideControlsBase, showControls } =
    useMobileControlsChrome();
  const isMobile = useIsMobileViewport();
  const showDock = settings.stageMode || isMobile;
  const hideControls = useCallback(() => {
    if (isMobile) mobileUiLog('controls hidden');
    hideControlsBase();
  }, [hideControlsBase, isMobile]);
  const mobileTeleprompter = isMobile && controlsHidden;
  const dockUiVisible = showDock && !mobileTeleprompter;
  const scrollerSettings = mobileTeleprompter
    ? { ...settings, stickyTitles: false }
    : settings;

  useWakeLock(isFullscreen || settings.stageMode);

  const { visibility, scrollToSongId, scrollToSongStart } = useScrollVisibility(
    scrollRef,
    songIds,
    entries.length > 0
  );

  const isFollowerRole =
    sessionConnection?.role === 'follower' || simpleLive?.role === 'follower';
  const isDirectorRole =
    (liveIsDirector && sessionConnection?.role === 'director') ||
    simpleLive?.role === 'director';
  const followerContinuousFrozen =
    isFollowerRole && followDirector && !isFollowerContinuousEnabled(followDirector);

  const directorSongIdForV3 = useMemo(() => {
    if (!isDirectorRole) return null;
    const idx = visibility.currentSongIndex;
    if (idx >= 0 && songIds[idx]) return songIds[idx];
    return visibility.currentSongId || directorContinuousStateRef.current.currentSongId;
  }, [isDirectorRole, visibility.currentSongIndex, visibility.currentSongId, songIds]);

  const directorFollowV3Source = useMemo(() => {
    if (!isDirectorRole || !directorSongIdForV3) return null;
    const idx = songIds.indexOf(directorSongIdForV3);
    return {
      currentIndex: idx >= 0 ? idx : visibility.currentSongIndex,
      renderedIndex: visibility.currentSongIndex,
      visibleIndex: visibility.currentSongIndex,
      setlistSongId: idx >= 0 ? songIds[idx] : directorSongIdForV3,
      routeSongId: null,
    };
  }, [isDirectorRole, directorSongIdForV3, songIds, visibility.currentSongIndex]);

  useDirectorFollowV3({
    followEnabled: FEATURES.USE_FOLLOW_V3 && isDirectorRole && !!sessionConnection?.sessionCode,
    currentSongId: directorSongIdForV3,
    sessionCode: sessionConnection?.sessionCode,
    listId,
    mode: 'continuous',
    sourceContext: directorFollowV3Source,
  });

  useEffect(() => {
    if (!isContinuousLiveSimpleMode(location.pathname)) return;
    directorSongDetectionRef.current = createDirectorSongDetectionState();
    followTrace('FOLLOW_DETECTOR_RESET', {
      actor: isFollowerRole ? 'spectator' : 'director',
      page: 'continuous-live',
      sessionCode: sessionConnection?.sessionCode ?? undefined,
      currentRoute: location.pathname,
      source: 'continuous-live-mount',
      extra: {
        source: 'continuous-live-mount',
        sessionCode: sessionConnection?.sessionCode ?? null,
        pathname: location.pathname,
      },
    });
    traceFollow('FOLLOW_DETECTOR_RESET_ACTIVE', {
      pathname: location.pathname,
      followDirector: readFollowDirector(),
    });
  }, [location.pathname, listId, sessionConnection?.sessionCode, isFollowerRole]);

  const getFollowAuditSnapshot = useCallback(
    (source: string): FollowAuditSnapshot => {
      const snap = landing.snapshot();
      return {
        source,
        pathname: location.pathname,
        currentRemoteIndex:
          snap.pendingRemoteScroll?.index ??
          snap.pendingLanding?.index ??
          null,
        lastAppliedIndex: snap.lastAppliedIndex,
        pendingLanding: snap.pendingLanding,
        syncTargetIndex,
        landingInProgress: snap.landingInProgress,
      };
    },
    [location.pathname, syncTargetIndex, landing]
  );

  const isRemoteLandingInProgress = useCallback(
    () => landing.isLandingInProgress(),
    [landing]
  );

  const markProgrammaticScroll = useCallback((source: string, ms = 1200) => {
    programmaticScrollUntilRef.current = Date.now() + ms;
    followPipelineLog({
      action: 'markProgrammaticScroll',
      source,
      untilMs: programmaticScrollUntilRef.current,
      ...getFollowAuditSnapshot(source),
    });
  }, [getFollowAuditSnapshot]);

  const isProgrammaticScrollActive = useCallback(
    () => Date.now() < programmaticScrollUntilRef.current,
    []
  );

  const buildRuntimeDiagnosisCtx = useCallback(
    (overrides?: Partial<FollowRuntimeContext>): FollowRuntimeContext => ({
      pathname: location.pathname,
      remoteIndex:
        landing.getPendingScroll()?.index ??
        landing.getPendingLanding()?.index ??
        landing.getLastAppliedIndex(),
      lastAppliedIndex: landing.getLastAppliedIndex(),
      syncTargetIndex,
      pendingLanding: landing.hasPendingLanding(),
      landingInProgress: isRemoteLandingInProgress(),
      lastSettledAt: landing.getLastSettledAt(),
      visibilityIndex: visibility.currentSongIndex,
      visibilitySongId: visibility.currentSongId ?? null,
      autoScrolling: autoScrollingRef.current,
      programmaticScrollActive: isProgrammaticScrollActive(),
      ...overrides,
    }),
    [
      location.pathname,
      syncTargetIndex,
      visibility.currentSongIndex,
      visibility.currentSongId,
      isRemoteLandingInProgress,
      isProgrammaticScrollActive,
    ]
  );

  const reportRuntimeEvent = useCallback(
    (
      event: FollowRuntimeEventType,
      detail: Record<string, unknown>,
      ctxOverrides?: Partial<FollowRuntimeContext>
    ) => {
      const ctx = buildRuntimeDiagnosisCtx({
        probableSourceHint:
          typeof detail.probableSource === 'string'
            ? detail.probableSource
            : typeof detail.reason === 'string'
              ? detail.reason
              : undefined,
        reason: typeof detail.reason === 'string' ? detail.reason : undefined,
        scrollDelta:
          typeof detail.delta === 'number' ? detail.delta : undefined,
        elapsedSinceSettleMs:
          typeof detail.elapsedMs === 'number' ? detail.elapsedMs : undefined,
        remoteUpdatedAt:
          typeof detail.remoteUpdatedAt === 'string'
            ? detail.remoteUpdatedAt
            : undefined,
        ...ctxOverrides,
      });
      return emitFollowerDiagnosis(event, ctx);
    },
    [buildRuntimeDiagnosisCtx]
  );

  const scheduleWindowUnfreeze = useCallback(() => {
    if (windowUnfreezeTimerRef.current) {
      clearTimeout(windowUnfreezeTimerRef.current);
    }
    windowUnfreezeTimerRef.current = window.setTimeout(() => {
      windowUnfreezeTimerRef.current = null;
      if (isRemoteLandingInProgress()) return;
      landing.setFrozenWindowIndex(null);
      setFollowerWindowFreezeTick((t) => t + 1);
      followIgnoreLog({
        reason: 'virtual window unfrozen',
        ...getFollowAuditSnapshot('virtual-window-unfreeze'),
      });
    }, SETTLE_VERIFY_MS + WINDOW_FREEZE_EXTRA_MS);
  }, [getFollowAuditSnapshot, isRemoteLandingInProgress]);

  const setSyncTargetIndexAudited = useCallback(
    (next: number | null, source: string) => {
      followPipelineLog({
        action: 'setSyncTargetIndex',
        next,
        ...getFollowAuditSnapshot(source),
      });
      setSyncTargetIndex(next);
    },
    [getFollowAuditSnapshot]
  );

  const shouldIgnoreFollowerSongApply = useCallback(
    (
      source: FollowerLandingSource | string,
      remoteIndex: number | null | undefined,
      songId: string | null | undefined,
      remoteUpdatedAt?: string | null
    ): boolean => {
      if (!isFollowerRole || !followDirectorRef.current) return false;

      const snap = getFollowAuditSnapshot(source);
      const idx =
        typeof remoteIndex === 'number' && remoteIndex >= 0 ? remoteIndex : -1;
      const lastApplied = landing.getLastAppliedIndex();
      const inLiveFollow =
        isFollowerInContinuousMode(location.pathname, listId) &&
        followDirectorRef.current;

      if (inLiveFollow && idx >= 0) {
        const currentIndex = lastApplied;
        if (idx !== currentIndex || landing.isLandingInProgress()) {
          followTrace('FOLLOW_REMOTE_PRIORITY_APPLIED', {
            actor: 'spectator',
            page: 'continuous-live',
            remoteIndex: idx,
            localIndex: currentIndex ?? undefined,
            currentRoute: location.pathname,
            reason: 'remote-is-source-of-truth',
            extra: {
              remoteIndex: idx,
              currentIndex,
              pathname: location.pathname,
              reason: 'remote-is-source-of-truth',
            },
          });
        }
        followApplyAllowedLog({
          reason:
            idx !== currentIndex
              ? 'remote-index-changed'
              : 'continuous-live-remote-priority',
          remoteIndex: idx,
          lastAppliedIndex: currentIndex,
          ...snap,
        });
        return false;
      }

      if (
        remoteUpdatedAt &&
        isStaleRemoteReplay(remoteUpdatedAt, landing.getLastSettledAt())
      ) {
        followApplyBlockedLog({
          reason: 'stale-replay',
          remoteUpdatedAt,
          lastSettledAt: landing.getLastSettledAt(),
          ...snap,
        });
        followIgnoreLog({
          reason: 'stale remote replay',
          remoteUpdatedAt,
          lastSettledAt: landing.getLastSettledAt(),
          ...snap,
        });
        reportRuntimeEvent('ignore', { reason: 'stale remote replay', remoteUpdatedAt }, {
          remoteUpdatedAt,
          probableSourceHint: 'stale-remote-replay',
        });
        return true;
      }

      if (landing.isLandingInProgress()) {
        followApplyBlockedLog({
          reason: 'same-pending-landing',
          remoteIndex: idx,
          songId: songId ?? null,
          ...snap,
        });
        followIgnoreLog({
          reason: 'duplicate recovery ignored',
          remoteIndex: idx,
          songId: songId ?? null,
          ...snap,
        });
        return true;
      }

      if (idx >= 0 && idx === lastApplied) {
        if (
          isWithinReplayCooldown(
            idx,
            landing.getLastAppliedIndex(),
            landing.getLastSettledAt()
          )
        ) {
          followApplyBlockedLog({
            reason: 'duplicate-settled',
            remoteIndex: idx,
            sinceSettleMs: Date.now() - landing.getLastSettledAt(),
            ...snap,
          });
          followDuplicateLog({
            reason: 'replay ignored',
            remoteIndex: idx,
            sinceSettleMs: Date.now() - landing.getLastSettledAt(),
            ...snap,
          });
          reportRuntimeEvent('duplicate', { reason: 'replay ignored', ...snap }, {
            remoteIndex: idx,
            probableSourceHint: 'replay-recovery',
          });
          return true;
        }
        followApplyBlockedLog({
          reason: 'duplicate-settled',
          remoteIndex: idx,
          ...snap,
        });
        followIgnoreLog({
          reason: 'same remote index already settled',
          remoteIndex: idx,
          ...snap,
        });
        return true;
      }

      if (idx < 0 && songId && songId === landing.getLastAppliedSongId()) {
        followApplyBlockedLog({
          reason: 'duplicate-settled',
          songId,
          ...snap,
        });
        followIgnoreLog({
          reason: 'same remote song already settled',
          songId,
          ...snap,
        });
        return true;
      }

      followApplyAllowedLog({ reason: 'default-allow', remoteIndex: idx, ...snap });
      return false;
    },
    [getFollowAuditSnapshot, isFollowerRole, reportRuntimeEvent, landing, location.pathname, listId]
  );

  const auditedNavigate = useCallback(
    (
      to: Parameters<typeof navigate>[0],
      options?: Parameters<typeof navigate>[1],
      source = 'navigate'
    ) => {
      const path = typeof to === 'string' ? to : '';

      const retainListId = listId ?? (options?.state as { listId?: string } | undefined)?.listId ?? null;

      auditEventLog({
        source: 'ContinuousSetlistPage',
        action: 'navigate',
        sessionCode: sessionConnection?.sessionCode ?? null,
        pathname: location.pathname,
        extra: { to: path || '[object]', source },
      });

      const liveLock = enforceFollowerLiveRetention({
        pathname: location.pathname,
        followDirector: isFollowerRole && followDirectorRef.current,
        targetPath: path,
        source,
        listId: retainListId,
      });
      followTrace('FOLLOW_ROUTE_DECISION', {
        actor: 'spectator',
        page: 'continuous-live',
        currentRoute: location.pathname,
        targetRoute: path,
        source,
        reason: liveLock.blocked ? 'live-lock-apply-remote' : 'router-navigate',
        extra: { blocked: liveLock.blocked, retainLive: liveLock.retainedLiveMode },
      });
      if (liveLock.blocked) {
        const songId = path.replace(/^\/cancion\//, '').split('/')[0] || '';
        const navState = options?.state as
          | { currentIndex?: number; listSongIds?: string[] }
          | undefined;
        const remoteList =
          navState?.listSongIds && navState.listSongIds.length > 0
            ? navState.listSongIds
            : resolvedSongIds.length > 0
              ? resolvedSongIds
              : songIds;
        const remoteIndex =
          typeof navState?.currentIndex === 'number' && navState.currentIndex >= 0
            ? navState.currentIndex
            : remoteList.indexOf(songId);
        followViewLog({ reason: 'retain-live-mode', mode: 'continuous', action: 'sync-inside-live' });
        if (songId) {
          void applyRemoteSongOnceRef.current?.(
            remoteIndex >= 0 ? remoteIndex : undefined,
            songId,
            remoteList,
            null,
            'shared-session',
            null
          );
        }
        return;
      }

      if (isFollowerRole && followDirectorRef.current) {
        followPipelineLog({
          action: 'navigate',
          source,
          to: path || '[location-object]',
          ...getFollowAuditSnapshot(source),
        });
      }
      navigate(to, options);
    },
    [navigate, isFollowerRole, getFollowAuditSnapshot, location.pathname, listId, resolvedSongIds, songIds]
  );

  /** Scroll local de canción — solo director / follower sin followDirector. */
  const scrollSongLocal = useCallback(
    (songId: string, behavior: ScrollBehavior = 'smooth') => {
      if (
        isFollowerVisibilityReadOnly({
          isFollower: isFollowerRole,
          followDirector: followDirectorRef.current,
        })
      ) {
        followResidualLog({
          reason: 'follower scroll blocked — landing pipeline only',
          songId,
          behavior,
          ...getFollowAuditSnapshot('scrollSongLocal'),
        });
        return;
      }
      scrollToSongId(songId, behavior);
    },
    [scrollToSongId, isFollowerRole, getFollowAuditSnapshot]
  );

  const scrollSongStartLocal = useCallback(
    (songId: string) => {
      if (
        isFollowerVisibilityReadOnly({
          isFollower: isFollowerRole,
          followDirector: followDirectorRef.current,
        })
      ) {
        followResidualLog({
          reason: 'follower scrollSongStart blocked',
          songId,
          ...getFollowAuditSnapshot('scrollSongStartLocal'),
        });
        return;
      }
      scrollToSongStart(songId);
    },
    [scrollToSongStart, isFollowerRole, getFollowAuditSnapshot]
  );

  /** Follower en live: ventana SIEMPRE gobernada por índice remoto (nunca visibility local). */
  const followerInLiveFollow =
    isFollowerRole &&
    followDirectorRef.current &&
    !!listId &&
    isFollowerInContinuousMode(location.pathname, listId);

  const followerRemoteWindowIndex = followerInLiveFollow
    ? (syncTargetIndex ??
      landing.getPendingLanding()?.index ??
      landing.getLastAppliedIndex() ??
      (typeof routeInitialIndex === 'number' && routeInitialIndex >= 0
        ? routeInitialIndex
        : 0))
    : null;

  void followerWindowFreezeTick;

  const effectiveWindowIndex =
    followerRemoteWindowIndex != null
      ? followerRemoteWindowIndex
      : visibility.currentSongIndex;

  const { start: windowStart, end: windowEnd } = useVirtualSongWindow(
    effectiveWindowIndex,
    entries.length,
    2
  );

  useEffect(() => {
    if (!followerInLiveFollow) return;
    const remoteIdx = followerRemoteWindowIndex ?? null;
    const targetSongId =
      remoteIdx != null && remoteIdx >= 0 && songIds[remoteIdx]
        ? songIds[remoteIdx]
        : null;
    followTargetLog({
      remoteIndex: remoteIdx,
      visibilityIndex: visibility.currentSongIndex,
      effectiveWindowIndex,
      syncTargetIndex,
      frozenWindowIndex: landing.getFrozenWindowIndex(),
      lastAppliedIndex: landing.getLastAppliedIndex(),
      pendingLandingIndex: landing.getPendingLanding()?.index ?? null,
      renderedNodeFound: targetSongId
        ? !!document.querySelector(`[data-song-id="${targetSongId}"]`)
        : null,
      pathname: location.pathname,
    });
  }, [
    followerInLiveFollow,
    followerRemoteWindowIndex,
    visibility.currentSongIndex,
    effectiveWindowIndex,
    syncTargetIndex,
    landing,
    songIds,
    location.pathname,
    followerWindowFreezeTick,
  ]);

  useEffect(() => {
    if (syncTargetIndex == null) return;
    if (isFollowerRole) return;
    if (visibility.currentSongIndex === syncTargetIndex) {
      setSyncTargetIndexAudited(null, 'director-visibility-caught-up');
    }
  }, [
    syncTargetIndex,
    visibility.currentSongIndex,
    isFollowerRole,
    setSyncTargetIndexAudited,
  ]);

  const songs = useMemo(() => entries.map((e) => e.song), [entries]);
  useSetlistPreload(songs, effectiveWindowIndex);

  const currentEntry = entries[visibility.currentSongIndex] ?? entries[0];
  const currentSong = currentEntry?.song;

  const pageSessionContext = useMemo(
    () => ({
      songId: visibility.currentSongId ?? currentSong?.id,
      listId,
      listSongIds: resolvedSongIds.length > 0 ? resolvedSongIds : songIds,
      listName: list?.name,
    }),
    [
      visibility.currentSongId,
      currentSong?.id,
      listId,
      list?.name,
      resolvedSongIds,
      songIds,
    ]
  );

  const sessionOriginMismatch = useSessionOriginMismatch(pageSessionContext);
  useReportSessionPageContext(pageSessionContext);

  const customSemitones = currentSong ? getUserSemitones(currentSong.id) : 0;
  const { effectiveSemitones, displayKey, displayOriginalKey } = useTransposeEngine({
    song: currentSong,
    vocalRegister: '',
    genderShift,
    customSemitones,
    modeSwapped: false,
    useAmerican: true,
  });

  const { autoScrolling, setAutoScrolling } = useAutoScroll({
    isFullscreen: true,
    fullscreenScrollRef: scrollRef,
    youtubeDuration: 0,
  });

  autoScrollingRef.current = autoScrolling;

  const serviceModeBootRef = useRef(false);
  const wantsServiceModeBoot =
    routeState.startServiceMode === true || searchParams.get('culto') === '1';

  useEffect(() => {
    if (!wantsServiceModeBoot || serviceModeBootRef.current) return;
    if (!FEATURES.SIMPLE_LIVE_SYNC || !simpleLive || !currentSong || entries.length === 0) {
      return;
    }
    if (simpleLive.role === 'follower') return;

    serviceModeBootRef.current = true;

    void startWorshipServiceMode({
      live: simpleLive,
      hideControls,
      input: {
        songId: currentSong.id,
        semitones: effectiveSemitones,
        viewMode: 'continuous',
        genderShift:
          genderShift === 'male' || genderShift === 'female' ? genderShift : 'original',
        currentIndex: visibility.currentSongIndex >= 0 ? visibility.currentSongIndex : 0,
        listId: listId ?? null,
        listSongIds: resolvedSongIds.length > 0 ? resolvedSongIds : songIds,
        sectionAnchor: directorSectionAnchor || visibility.currentSection || null,
      },
      share: true,
    }).then((ok) => {
      const next = new URLSearchParams(searchParams);
      next.delete('culto');
      const qs = next.toString();
      const { startServiceMode: _drop, ...restState } = routeState;
      navigate(
        { pathname: location.pathname, search: qs ? `?${qs}` : '' },
        { replace: true, state: restState }
      );
      if (!ok) serviceModeBootRef.current = false;
    });
  }, [
    wantsServiceModeBoot,
    simpleLive,
    currentSong?.id,
    entries.length,
    hideControls,
    effectiveSemitones,
    genderShift,
    visibility.currentSongIndex,
    visibility.currentSection,
    listId,
    resolvedSongIds,
    songIds,
    directorSectionAnchor,
    searchParams,
    routeState,
    navigate,
    location.pathname,
    currentSong,
  ]);

  useEffect(() => {
    if (!isFollowerRole || !followDirector) return;
    const root = scrollRef.current;
    if (!root) return;

    let lastTop = root.scrollTop;
    let lastLogAt = 0;
    const onScroll = () => {
      const top = root.scrollTop;
      const delta = Math.abs(top - lastTop);
      if (delta < 8) return;
      lastTop = top;

      if (
        isRemoteLandingInProgress() ||
        isProgrammaticScrollActive() ||
        autoScrolling
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastLogAt < 2000) return;
      lastLogAt = now;

      const detail = {
        timestamp: now,
        scrollTop: top,
        probableSource: 'untracked follower scroll',
        ...getFollowAuditSnapshot('scroll-container'),
      };
      const diagnosis = reportRuntimeEvent('unexpected-scroll', detail, {
        scrollDelta: delta,
      });
      followUnexpectedScrollLog({
        ...detail,
        diagnosis: diagnosis.probableSource,
        confidence: diagnosis.confidence,
      });
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [
    isFollowerRole,
    followDirector,
    autoScrolling,
    getFollowAuditSnapshot,
    isRemoteLandingInProgress,
    isProgrammaticScrollActive,
  ]);

  const { dockVisible: scrollDockVisible } = useMobileDockState({
    scrollRef,
    enabled: dockUiVisible && isMobile,
    autoScrolling,
    isFullscreen,
  });
  const dockControlsVisible = scrollDockVisible;

  const handleScrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFollowDirectorChange = useCallback(
    (value: boolean) => {
      setFollowDirector(value);
      setFollowDirectorPreference(value);
      followPrefLog('user toggle', { followDirector: value });

      if (isPassiveSpectatorMode(value)) {
        followBlockedLog('auto sync disabled until user re-enables');
        followDirectorLog('passive mode enabled');
        if (sessionConnection?.role !== 'follower') return;

        const exitSong =
          currentSong ??
          entries[visibility.currentSongIndex]?.song ??
          (visibility.currentSongId
            ? entries.find((e) => e.song.id === visibility.currentSongId)?.song
            : undefined);
        const listSongIdsForNav =
          resolvedSongIds.length > 0 ? resolvedSongIds : songIds;

        if (exitSong?.id && listId) {
          followDirectorLog('skipping navigation sync');
          auditedNavigate(getSongPath(exitSong, songs), {
            state: {
              listId,
              listSongIds: listSongIdsForNav,
              currentIndex: visibility.currentSongIndex,
              joinSessionCode: joinSessionCode ?? sessionConnection?.sessionCode,
              fromContinuous: true,
            } satisfies ExitContinuousNavState,
          });
        }
      } else {
        followDirectorLog('passive mode disabled');
      }
    },
    [
      sessionConnection?.role,
      currentSong,
      entries,
      visibility.currentSongIndex,
      visibility.currentSongId,
      resolvedSongIds,
      songIds,
      listId,
      joinSessionCode,
      sessionConnection?.sessionCode,
      auditedNavigate,
      setFollowDirectorPreference,
    ]
  );

  const applySongSemitones = useCallback((songId: string, semitones: number) => {
    setUserSemitones(songId, semitones);
    setTransposeRevision((r) => r + 1);
  }, []);

  const isFollower = isFollowerRole;
  const isDirector = isDirectorRole;

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !isDirector) return;
    const onScroll = () => {
      followTrace('FOLLOW_DIRECTOR_SCROLL', {
        actor: 'director',
        page: 'continuous-live',
        visibilityIndex: visibility.currentSongIndex,
        songId: visibility.currentSongId ?? undefined,
        extra: { scrollY: root.scrollTop },
      });
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [isDirector, visibility.currentSongIndex, visibility.currentSongId]);

  const prevVisibilityRef = useRef({
    index: visibility.currentSongIndex,
    songId: visibility.currentSongId,
  });
  useEffect(() => {
    const prev = prevVisibilityRef.current;
    if (
      prev.index === visibility.currentSongIndex &&
      prev.songId === visibility.currentSongId
    ) {
      return;
    }
    const total = songIds.length;
    const isBoundary =
      total > 1 &&
      (visibility.currentSongIndex === 0 || visibility.currentSongIndex === total - 1);
    followTrace('FOLLOW_VISIBILITY_CHANGE', {
      actor: isDirector ? 'director' : 'spectator',
      page: 'continuous-live',
      visibilityIndex: visibility.currentSongIndex,
      songId: visibility.currentSongId ?? undefined,
      localIndex: visibility.currentSongIndex,
      extra: {
        previousIndex: prev.index,
        previousSongId: prev.songId,
        isBoundary,
        scrollY: scrollRef.current?.scrollTop ?? null,
      },
    });
    prevVisibilityRef.current = {
      index: visibility.currentSongIndex,
      songId: visibility.currentSongId,
    };
  }, [visibility.currentSongIndex, visibility.currentSongId, songIds.length, isDirector]);

  const applyRemoteSectionOnce = useCallback(
    (anchorId: string) => {
      if (!followDirectorRef.current || !anchorId) {
        followSkipLog({ reason: 'section apply blocked — followDirector off' });
        return false;
      }
      if (isContinuousLiveSimpleMode(location.pathname)) {
        followSkipLog({ reason: 'section apply blocked — continuous live mode' });
        return false;
      }
      if (
        isSectionSyncBlocked(
          landing.hasPendingLanding(),
          isRemoteLandingInProgress(),
          landing.getLastSettledAt()
        )
      ) {
        followIgnoreLog({
          reason: 'section sync blocked during landing',
          anchorId,
          ...getFollowAuditSnapshot('section-sync'),
        });
        reportRuntimeEvent('ignore', { reason: 'section sync blocked during landing', anchorId }, {
          probableSourceHint: 'section-sync',
        });
        return false;
      }
      if (landing.getLastAppliedSection() === anchorId) {
        followSkipLog({ reason: 'duplicate remote section', anchorId });
        return true;
      }
      const root = scrollRef.current;
      if (!root) return false;
      remoteSectionLog('scrolling to anchor', { anchorId });
      markProgrammaticScroll('section-sync', SECTION_SYNC_BLOCK_MS);
      const ok = scrollToSectionAnchor(anchorId, root, {
        behavior: 'smooth',
        block: 'start',
      });
      if (ok) {
        landing.setLastAppliedSection(anchorId);
        sectionApplyLog(`scrollIntoView ${anchorId}`);
        followApplyLog('section applied', { anchorId });
      }
      return ok;
    },
    [
      markProgrammaticScroll,
      getFollowAuditSnapshot,
      isRemoteLandingInProgress,
      reportRuntimeEvent,
      landing,
      location.pathname,
    ]
  );

  const applyRemoteSongOnce = useCallback(
    async (
      remoteIndex: number | undefined,
      remoteSongId: string | null | undefined,
      remoteListIds: string[],
      sectionAnchor?: string | null,
      source: FollowerLandingSource = 'shared-session',
      remoteUpdatedAt?: string | null
    ) => {
      followTrace('FOLLOW_APPLY_REMOTE_START', {
        actor: 'spectator',
        page: 'continuous-live',
        currentRoute: location.pathname,
        remoteIndex: remoteIndex ?? undefined,
        remoteSongId: remoteSongId ?? undefined,
        localIndex: landing.getLastAppliedIndex() ?? undefined,
        source,
        extra: {
          pendingLanding: landing.hasPendingLanding(),
          sameSong: remoteSongId === landing.getLastAppliedSongId(),
          sameIndex: remoteIndex === landing.getLastAppliedIndex(),
        },
      });
      followPipelineLog({
        entry: 'unique',
        source,
        remoteIndex: remoteIndex ?? null,
        remoteSongId: remoteSongId ?? null,
        ...getFollowAuditSnapshot(source),
      });
      auditEventLog({
        source: 'ContinuousSetlistPage',
        action: 'applyRemoteSongOnce-enter',
        sessionCode: sessionConnection?.sessionCode ?? null,
        songId: remoteSongId ?? null,
        remoteIndex: remoteIndex ?? null,
        pathname: location.pathname,
        extra: { landingSource: source },
      });

      const indexFromRemote =
        typeof remoteIndex === 'number' && remoteIndex >= 0 ? remoteIndex : -1;
      const songIdFromIndex =
        indexFromRemote >= 0 && remoteListIds[indexFromRemote]
          ? remoteListIds[indexFromRemote]
          : null;
      const songId = songIdFromIndex ?? remoteSongId ?? null;
      if (!songId) {
        followTrace('FOLLOW_APPLY_REMOTE_SKIP', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex: remoteIndex ?? undefined,
          reason: 'no-songId',
          source,
        });
        followSkipLog({ reason: 'apply song skipped — no songId', remoteIndex });
        return false;
      }

      const resolvedIndex =
        indexFromRemote >= 0 ? indexFromRemote : remoteListIds.indexOf(songId);

      if (
        isFollowerRole &&
        followDirectorRef.current &&
        resolvedIndex >= 0 &&
        isFollowerInContinuousMode(location.pathname, listId)
      ) {
        setSyncTargetIndexAudited(resolvedIndex, `${source}:pre-apply`);
      }

      if (
        shouldIgnoreFollowerSongApply(
          source,
          resolvedIndex,
          songId,
          remoteUpdatedAt
        )
      ) {
        followTrace('FOLLOW_APPLY_REMOTE_SKIP', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex: resolvedIndex,
          remoteSongId: songId,
          localIndex: landing.getLastAppliedIndex() ?? undefined,
          reason: 'shouldIgnoreFollowerSongApply',
          source,
          extra: { pendingLanding: landing.hasPendingLanding() },
        });
        return true;
      }

      const generation = landing.beginLanding(resolvedIndex, songId);

      if (resolvedIndex >= 0) {
        landing.setFrozenWindowIndex(resolvedIndex);
        setFollowerWindowFreezeTick((t) => t + 1);
        followIgnoreLog({
          reason: 'virtual window frozen',
          remoteIndex: resolvedIndex,
          ...getFollowAuditSnapshot(source),
        });
        setSyncTargetIndexAudited(resolvedIndex, `${source}:expand-window`);
      }

      landing.queuePendingScroll({
        songId,
        index: resolvedIndex,
        sectionAnchor: sectionAnchor ?? null,
        remoteUpdatedAt: remoteUpdatedAt ?? null,
      });

      followLandingLog({
        remoteIndex: resolvedIndex,
        remoteSongId: songId,
      });
      followApplyLog('queued deterministic landing', {
        index: resolvedIndex,
        songId,
        generation,
      });
      followTrace('FOLLOW_APPLY_REMOTE_END', {
        actor: 'spectator',
        page: 'continuous-live',
        remoteIndex: resolvedIndex,
        remoteSongId: songId,
        source,
        reason: 'queued-landing',
        extra: { generation, pendingLanding: true },
      });
      return true;
    },
    [
      applyRemoteSectionOnce,
      getFollowAuditSnapshot,
      setSyncTargetIndexAudited,
      shouldIgnoreFollowerSongApply,
      landing,
      isFollowerRole,
      listId,
      location.pathname,
    ]
  );

  applyRemoteSongOnceRef.current = applyRemoteSongOnce;

  /** V3 follower on /live: sync index/song without legacy navigation pipeline. */
  const applyV3ContinuousIndexFromRemote = useCallback(
    (state: SharedSessionState, source: string) => {
      if (!followDirectorRef.current) return;

      const effectiveListId = listId ?? state.listId ?? null;
      if (!effectiveListId || typeof state.currentIndex !== 'number' || state.currentIndex < 0) {
        return;
      }

      const remoteListIds =
        state.listSongIds && state.listSongIds.length > 0
          ? state.listSongIds
          : resolvedSongIds.length > 0
            ? resolvedSongIds
            : songIds;

      const resolvedViewMode = resolveSharedViewMode(
        state.viewMode,
        state.listId ?? effectiveListId,
        remoteListIds
      );
      if (resolvedViewMode !== 'continuous') return;
      if (!isFollowerInContinuousMode(location.pathname, effectiveListId)) return;
      if (state.listId && listId && state.listId !== listId) return;

      const remoteIndex = state.currentIndex;
      const targetSongId = remoteListIds[remoteIndex] ?? state.currentSongId ?? null;
      if (!targetSongId) return;

      if (remoteIndex === landing.getLastAppliedIndex() && targetSongId === landing.getLastAppliedSongId()) {
        return;
      }

      sessionSyncLog('V3 continuous index sync', {
        source,
        remoteIndex,
        targetSongId,
        effectiveListId,
      });

      setSyncTargetIndexAudited(remoteIndex, source);
      void applyRemoteSongOnce(
        remoteIndex,
        targetSongId,
        remoteListIds,
        null,
        source as FollowerLandingSource,
        state.updatedAt
      );
    },
    [
      listId,
      songIds,
      resolvedSongIds,
      location.pathname,
      setSyncTargetIndexAudited,
      applyRemoteSongOnce,
      landing,
    ]
  );

  useEffect(() => {
    const pending = landing.getPendingScroll();
    if (!pending || !isFollowerRole || !followDirectorRef.current) return;
    if (landing.getScrollInFlight()) return;

    followPipelineLog({
      action: 'landing-effect',
      songId: pending.songId,
      index: pending.index,
      ...getFollowAuditSnapshot('landing-effect'),
    });

    const idx = pending.index;
    if (idx >= 0 && !isIndexInWindow(idx, windowStart, windowEnd)) {
      followPipelineLog({
        action: 'waiting-virtual-window',
        index: idx,
        windowStart,
        windowEnd,
      });
      return;
    }

    const root = scrollRef.current;
    if (!root) {
      followFailedLog({ reason: 'missing scroll root' });
      return;
    }

    const generation = landing.getGeneration();
    landing.setScrollInFlight(true);
    let cancelled = false;

    void (async () => {
      followApplyLog('landing pipeline start', {
        songId: pending.songId,
        index: idx,
        generation,
      });

      const rendered = await ensureRemoteSongRendered({
        scrollRoot: root,
        remoteIndex: idx,
        remoteSongId: pending.songId,
        windowStart,
        windowEnd,
      });

      if (cancelled || !landing.isCurrentGeneration(generation)) {
        followTrace('FOLLOW_LANDING_ABORT', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex: idx,
          remoteSongId: pending.songId,
          reason: cancelled ? 'effect-cancelled' : 'generation-stale',
          extra: { generation },
        });
        return;
      }
      if (!rendered) {
        landing.setScrollInFlight(false);
        followTrace('FOLLOW_LANDING_ABORT', {
          actor: 'spectator',
          page: 'continuous-live',
          remoteIndex: idx,
          remoteSongId: pending.songId,
          reason: 'render-not-ready',
        });
        followApplyLog('waiting render or window', { index: idx });
        return;
      }

      markProgrammaticScroll('landing-scroll', 1600);
      const baselineScrollTop = root.scrollTop;
      const { success } = await scrollFollowerToExactSong({
        scrollRoot: root,
        remoteSongId: pending.songId,
        remoteIndex: idx,
      });

      if (cancelled || !landing.isCurrentGeneration(generation)) return;
      landing.setScrollInFlight(false);

      if (success) {
        landing.completeLanding({
          index: idx,
          songId: pending.songId,
          remoteUpdatedAt: pending.remoteUpdatedAt,
        });
        followSettledLog({ landedIndex: idx });
        auditEventLog({
          source: 'ContinuousSetlistPage',
          action: 'FOLLOW_SETTLED',
          sessionCode: sessionConnection?.sessionCode ?? null,
          songId: pending.songId,
          remoteIndex: idx,
          pathname: location.pathname,
        });
        lastSettledRemoteIndexRef.current = idx;
        unsettledRemoteChangeCountRef.current = 0;
        reportRuntimeEvent('settled', { landedIndex: idx, songId: pending.songId });
        followApplyLog('landing settled', { songId: pending.songId, index: idx });
        scheduleWindowUnfreeze();

        const listForVerify =
          resolvedSongIds.length > 0 ? resolvedSongIds : songIds;
        runFollowerSettleVerification({
          scrollRoot: root,
          songIds: listForVerify,
          remoteIndex: idx,
          remoteSongId: pending.songId,
          baselineScrollTop,
          onDuplicate: (detail) => {
            const diagnosis = reportRuntimeEvent('duplicate', detail);
            followDuplicateLog({
              ...detail,
              diagnosis: diagnosis.probableSource,
              confidence: diagnosis.confidence,
            });
          },
          onUnexpectedScroll: (detail) => {
            const diagnosis = reportRuntimeEvent('unexpected-scroll', detail);
            if (diagnosis.confidence > 0.8) {
              followUnexpectedScrollLog({
                ...detail,
                diagnosis: diagnosis.probableSource,
                confidence: diagnosis.confidence,
              });
            }
          },
        });

        if (pending.sectionAnchor) {
          window.setTimeout(
            () => applyRemoteSectionOnce(pending.sectionAnchor!),
            SECTION_SYNC_BLOCK_MS
          );
        }
      } else {
        followFailedLog({
          reason: 'landing pipeline failed',
          songId: pending.songId,
          index: idx,
        });
      }
    })();

    return () => {
      cancelled = true;
      landing.setScrollInFlight(false);
    };
  }, [
    syncTargetIndex,
    windowStart,
    windowEnd,
    entries.length,
    isFollowerRole,
    applyRemoteSectionOnce,
    getFollowAuditSnapshot,
    markProgrammaticScroll,
    resolvedSongIds,
    songIds,
    scheduleWindowUnfreeze,
    reportRuntimeEvent,
    landing,
  ]);

  const handleDirectorSessionEstablished = useCallback((code: string) => {
    setShowSession(true);
    toast.success(`Sesión iniciada: ${code}`);
  }, []);

  const publishDirectorIntent = useCallback(
    (action: DirectorIntentAction, patch?: Partial<DirectorContinuousState>) => {
      if (!isDirector || !listId || !sessionConnection) return;
      if (applyingRemoteRef.current || sessionHydrationRef.current) {
        sessionRecoveryLog('skipped publish during hydration');
        return;
      }

      const ids = resolvedSongIds.length > 0 ? resolvedSongIds : songIds;
      const prev = directorContinuousStateRef.current;

      let index =
        typeof patch?.currentIndex === 'number' && patch.currentIndex >= 0
          ? patch.currentIndex
          : prev.currentIndex;
      let songId =
        patch?.currentSongId ??
        (index >= 0 && ids[index] ? ids[index] : prev.currentSongId);

      if (songId) {
        const found = ids.indexOf(songId);
        if (found >= 0) index = found;
      }

      const sectionAnchor =
        patch?.currentSectionAnchor !== undefined
          ? patch.currentSectionAnchor
          : prev.currentSectionAnchor;

      const snap: DirectorContinuousState = {
        currentSongId: songId,
        currentIndex: Math.max(0, Math.min(index, Math.max(0, ids.length - 1))),
        currentSectionAnchor: sectionAnchor,
      };
      directorContinuousStateRef.current = snap;

      directorIntentLog({
        action,
        index: snap.currentIndex,
        songId: snap.currentSongId,
      });
      const publishSource: 'intent' | 'stable-visibility' =
        action === 'stable-visibility' || action === 'stable-song-change'
          ? 'stable-visibility'
          : 'intent';
      directorPublishIntentLog({
        source: publishSource,
        action,
        index: snap.currentIndex,
        songId: snap.currentSongId,
        sectionAnchor: snap.currentSectionAnchor,
      });

      if (snap.currentSongId) {
        lastPublishedIntentKeyRef.current = `${snap.currentSongId}|${snap.currentIndex}`;
      }
      lastPublishedSongRef.current = snap.currentSongId;
      if (snap.currentSectionAnchor) {
        lastPublishedSectionRef.current = snap.currentSectionAnchor;
        setDirectorSectionAnchor(snap.currentSectionAnchor);
      }

      const payload = buildContinuousSharedState({
        sessionId: sessionConnection.sessionCode,
        currentSongId: snap.currentSongId,
        currentIndex: snap.currentIndex,
        listId,
        listSongIds: ids,
        customSemitones: snap.currentSongId ? getUserSemitones(snap.currentSongId) : 0,
        genderShift,
        viewMode: 'continuous',
        sharedSectionAnchor: snap.currentSectionAnchor ?? undefined,
      });
      logContinuousPublish(payload);
      publishSharedSessionIfDirector(sessionConnection.sessionCode, payload, {
        immediate: true,
      });
    },
    [
      isDirector,
      publishSharedSessionIfDirector,
      listId,
      sessionConnection,
      resolvedSongIds,
      songIds,
      genderShift,
    ]
  );

  useEffect(() => {
    if (songIds.length === 0) return;
    const cur = directorContinuousStateRef.current;
    if (cur.currentSongId && songIds.includes(cur.currentSongId)) return;
    directorContinuousStateRef.current = createInitialDirectorContinuousState(songIds, {
      initialSongId: routeState.initialSongId,
      initialIndex: routeInitialIndex,
    });
  }, [songIds, routeState.initialSongId, routeInitialIndex]);

  useEffect(() => {
    if (
      !isDirector ||
      !sessionConnection ||
      !listId ||
      entries.length === 0 ||
      directorEnterPublishedRef.current
    ) {
      return;
    }
    directorEnterPublishedRef.current = true;
    publishDirectorIntent('enter-continuous');
  }, [isDirector, sessionConnection, listId, entries.length, publishDirectorIntent]);

  useEffect(() => {
    if (!isDirector || !sessionConnection || applyingRemoteRef.current || sessionHydrationRef.current) {
      return;
    }
    const songId = visibility.currentSongId;
    const index = visibility.currentSongIndex;
    if (!songId || index < 0 || songIds.length === 0) return;

    const detection = processDirectorSongDetection(
      {
        candidateIndex: index,
        candidateSongId: songId,
        totalSongs: songIds.length,
      },
      directorSongDetectionRef.current
    );
    directorSongDetectionRef.current = detection.state;

    if (detection.ignoreReason) {
      followTrace('FOLLOW_STABLE_CANCELLED', {
        actor: 'director',
        page: 'continuous-live',
        remoteIndex: index,
        remoteSongId: songId,
        reason: detection.ignoreReason,
        extra: { scrollY: scrollRef.current?.scrollTop ?? null },
      });
    }

    if (detection.stableIndex == null || !detection.stableSongId) return;

    const intentKey = `${detection.stableSongId}|${detection.stableIndex}`;
    if (intentKey === lastStableVisibilityPublishKeyRef.current) return;

    directorStableVisibilityLog({
      songId: detection.stableSongId,
      index: detection.stableIndex,
      stableMs: STABLE_VISIBILITY_MS,
    });
    lastStableVisibilityPublishKeyRef.current = intentKey;
    publishDirectorIntent('stable-song-change', {
      currentSongId: detection.stableSongId,
      currentIndex: detection.stableIndex,
    });
  }, [
    isDirector,
    sessionConnection,
    visibility.currentSongId,
    visibility.currentSongIndex,
    publishDirectorIntent,
    songIds.length,
  ]);

  const handleRequestSharedSessionPublish = useCallback(() => {
    publishDirectorIntent('request-publish');
  }, [publishDirectorIntent]);

  const handleDirectorSectionAnchor = useCallback(
    (anchorId: string) => {
      if (!anchorId) return;
      setDirectorSectionAnchor(anchorId);
      lastPublishedSectionRef.current = anchorId;

      if (isDirector) {
        const root = scrollRef.current;
        if (root) scrollToSectionAnchor(anchorId, root, { behavior: 'smooth', block: 'start' });
      } else {
        applyRemoteSectionOnce(anchorId);
      }

      if (!isDirector || !listId || !sessionConnection) return;
      sectionSyncLog(`publish ${anchorId}`);
      publishDirectorIntent('section-anchor', {
        currentSectionAnchor: anchorId,
      });
    },
    [
      isDirector,
      applyRemoteSectionOnce,
      listId,
      sessionConnection,
      publishDirectorIntent,
    ]
  );

  useEffect(() => {
    if (persisted?.settings?.stageMode != null) {
      patch({ stageMode: persisted.settings.stageMode });
    }
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!listId || !persisted?.lastSongId || entries.length === 0 || initialScrollDone.current) {
      return;
    }
    const t = setTimeout(() => {
      const id = persisted.lastSongId;
      const idx = songIds.indexOf(id);
      if (isFollowerRole && followDirectorRef.current) {
        followIgnoreLog({
          reason: 'persisted restore scroll blocked for follower',
          songId: id,
          ...getFollowAuditSnapshot('persisted-restore'),
        });
        initialScrollDone.current = true;
        return;
      }
      scrollSongLocal(id, 'auto');
      if (isDirector && idx >= 0) {
        publishDirectorIntent('persisted-restore', {
          currentSongId: id,
          currentIndex: idx,
        });
      }
      initialScrollDone.current = true;
    }, 150);
    return () => clearTimeout(t);
  }, [
    listId,
    persisted?.lastSongId,
    entries.length,
    scrollSongLocal,
    isDirector,
    isFollowerRole,
    songIds,
    publishDirectorIntent,
    getFollowAuditSnapshot,
  ]);

  useEffect(() => {
    if (!listId || !visibility.currentSongId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const root = scrollRef.current;
      saveContinuousPersisted({
        listId,
        lastSongId: visibility.currentSongId,
        scrollY: root?.scrollTop ?? 0,
        settings: {
          largeSpacing: settings.largeSpacing,
          ultraContrast: settings.ultraContrast,
          stickyTitles: settings.stickyTitles,
          hideChrome: settings.hideChrome,
          stageMode: settings.stageMode,
          fontSize: settings.fontSize,
        },
        updatedAt: Date.now(),
      });
    }, 500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [listId, visibility.currentSongId, settings]);

  const handleSessionUpdate = useCallback((state: SessionState) => {
    if (state.seq != null) {
      if (state.seq <= lastSeqRef.current) return;
      lastSeqRef.current = state.seq;
    }
    if (typeof state.semitones === 'number' && state.songId) {
      setUserSemitones(state.songId, state.semitones);
      setTransposeRevision((r) => r + 1);
    }
    if (typeof state.liveNote === 'string') {
      setLiveNote(state.liveNote);
    }
  }, []);

  const goToIndex = useCallback(
    (index: number, action: DirectorIntentAction) => {
      const id = songIds[index];
      if (!id) return;
      scrollSongLocal(id);
      if (isDirector) {
        publishDirectorIntent(action, {
          currentSongId: id,
          currentIndex: index,
        });
      }
    },
    [songIds, scrollSongLocal, isDirector, publishDirectorIntent]
  );

  const handlePrev = useCallback(() => {
    const idx = directorContinuousStateRef.current.currentIndex;
    if (idx > 0) goToIndex(idx - 1, 'prev');
  }, [goToIndex]);

  const handleNext = useCallback(() => {
    const idx = directorContinuousStateRef.current.currentIndex;
    if (idx < songIds.length - 1) goToIndex(idx + 1, 'next');
  }, [goToIndex, songIds.length]);

  const handleSharedSessionUpdate = useCallback(
    (state: SharedSessionState) => {
      const following = followDirectorRef.current;
      followTrace('FOLLOW_SHARED_RECEIVE', {
        actor: 'spectator',
        page: 'continuous-live',
        sessionCode: state.sessionId ?? sessionConnection?.sessionCode ?? undefined,
        currentRoute: location.pathname,
        remoteSongId: state.currentSongId ?? undefined,
        remoteIndex: state.currentIndex ?? undefined,
        localIndex: landing.getLastAppliedIndex() ?? undefined,
        localSongId: landing.getLastAppliedSongId() ?? undefined,
        source: 'handleSharedSessionUpdate',
        extra: {
          viewMode: state.viewMode,
          followDirector: following,
          effectiveWindowIndex,
        },
      });
      followPipelineLog({
        action: 'handleSharedSessionUpdate',
        currentIndex: state.currentIndex ?? null,
        currentSongId: state.currentSongId ?? null,
        ...getFollowAuditSnapshot('handleSharedSessionUpdate'),
      });
      const effectiveListId = listId ?? state.listId ?? null;

      sessionSyncLog('payload received', {
        currentSongId: state.currentSongId,
        viewMode: state.viewMode,
        currentIndex: state.currentIndex,
        listId: state.listId,
        effectiveListId,
      });
      sessionSyncLog('followDirector state', { followDirector: following });

      if (state.currentSongId && typeof state.customSemitones === 'number') {
        applySongSemitones(state.currentSongId, state.customSemitones);
        sessionSyncLog('transpose applied', {
          songId: state.currentSongId,
          semitones: state.customSemitones,
        });
      }

      const localGender = fromSharedGenderShift(state.genderShift);
      if (localGender !== genderShift) {
        setGenderShift(localGender);
        sessionSyncLog('gender applied', { genderShift: state.genderShift });
      }

      if (sessionConnection?.role === 'director') {
        sessionRecoveryLog('director: skip navigation on shared update');
        return;
      }

      if (!following) {
        followBlockedLog('shared update — navigation/scroll skipped', {
          songId: state.currentSongId,
        });
        followDirectorLog('applying transpose only', {
          songId: state.currentSongId,
          semitones: state.customSemitones,
          genderShift: state.genderShift,
        });
        followDirectorLog('skipping navigation sync');
        return;
      }

      if (shouldDisableLegacyFollowPipeline('follower')) {
        applyV3ContinuousIndexFromRemote(state, 'shared-session-v3');
        return;
      }

      if (!effectiveListId) {
        sessionSyncLog('navigation skipped — no list context', { listId: state.listId });
        return;
      }

      const remoteListIds =
        state.listSongIds && state.listSongIds.length > 0
          ? state.listSongIds
          : resolvedSongIds.length > 0
            ? resolvedSongIds
            : songIds;

      if (remoteListIds.length > 0) {
        setSharedListSongIds(remoteListIds);
        persistContinuousListSync(state.listId ?? effectiveListId, remoteListIds);
        continuousSyncLog('shared payload applied', {
          listId: state.listId ?? effectiveListId,
          count: remoteListIds.length,
        });
      }

      const resolvedViewMode = resolveSharedViewMode(
        state.viewMode,
        state.listId ?? effectiveListId,
        remoteListIds
      );

      const wantsContinuous =
        resolvedViewMode === 'continuous' &&
        !!state.listId &&
        remoteListIds.length > 1;

      if (wantsContinuous && hasManualExitContinuous(state.listId ?? listId)) {
        sessionRecoveryLog('skipped continuous sync (manual exit)', { listId: state.listId });
        return;
      }

      if (wantsContinuous && state.listId && listId && state.listId !== listId) {
        continuousSyncLog('navigate follower to live (other list)', {
          listId: state.listId,
          currentIndex: state.currentIndex,
        });
        auditedNavigate(`/setlist/${state.listId}/live`, {
          state: {
            listId: state.listId,
            listSongIds: remoteListIds,
            joinSessionCode,
            initialSongId: state.currentSongId ?? undefined,
            initialIndex: state.currentIndex,
          },
        }, 'shared-session:other-list');
        return;
      }

      if (listId && state.listId && state.listId !== listId) return;

      if (wantsContinuous && state.listId && !listId) {
        if (!isFollowerInContinuousMode(location.pathname, state.listId) && state.currentSongId) {
          followTrace('FOLLOW_ROUTE_DECISION', {
            actor: 'spectator',
            page: 'continuous-live',
            currentRoute: location.pathname,
            targetRoute: getSongPathById(state.currentSongId, songs),
            source: 'shared-session:sync-song-only',
            reason: 'auditedNavigate',
            extra: { retainLive: false },
          });
          followViewLog({ mode: 'song', action: 'sync-song-only' });
          auditedNavigate(getSongPathById(state.currentSongId, songs), {
            state: {
              listId: state.listId,
              listSongIds: remoteListIds,
              joinSessionCode: joinSessionCode ?? sessionConnection?.sessionCode,
              currentIndex: state.currentIndex,
              fromContinuous: true,
            },
          }, 'shared-session:sync-song-only');
          return;
        }
        sessionRecoveryLog('navigate live', { listId: state.listId });
        auditedNavigate(`/setlist/${state.listId}/live`, {
          state: {
            listId: state.listId,
            listSongIds: remoteListIds,
            joinSessionCode: joinSessionCode ?? sessionConnection?.sessionCode,
            initialSongId: state.currentSongId ?? undefined,
            initialIndex: state.currentIndex,
          },
        }, 'shared-session:navigate-live');
        return;
      }

      applyingRemoteRef.current = true;
      try {
        const onContinuousLive =
          !!effectiveListId &&
          shouldRetainFollowerViewMode(location.pathname, effectiveListId);

        if (resolvedViewMode === 'musician' && onContinuousLive) {
          followTrace('FOLLOW_ROUTE_DECISION', {
            actor: 'spectator',
            page: 'continuous-live',
            currentRoute: location.pathname,
            source: 'shared-session:retain-live',
            reason: 'applyRemoteSongOnce',
            extra: { blocked: false, retainLive: true },
          });
          followViewLog({ reason: 'retain-live-mode', mode: 'continuous', action: 'sync-inside-live' });
          const remoteIndex =
            typeof state.currentIndex === 'number' && state.currentIndex >= 0
              ? state.currentIndex
              : null;
          const targetSongId =
            remoteIndex != null && remoteListIds[remoteIndex]
              ? remoteListIds[remoteIndex]
              : state.currentSongId ?? null;
          if (targetSongId) {
            if (remoteIndex != null && remoteIndex >= 0) {
              setSyncTargetIndexAudited(remoteIndex, 'shared-session:retain-live');
            }
            void applyRemoteSongOnce(
              remoteIndex ?? undefined,
              targetSongId,
              remoteListIds,
              null,
              'shared-session',
              state.updatedAt
            );
          }
          return;
        }

        if (resolvedViewMode === 'musician') {
          followTrace('FOLLOW_ROUTE_DECISION', {
            actor: 'spectator',
            page: 'continuous-live',
            currentRoute: location.pathname,
            targetRoute: state.currentSongId ? getSongPathById(state.currentSongId, songs) : undefined,
            source: 'shared-session:musician',
            reason: 'auditedNavigate',
            extra: { retainLive: onContinuousLive },
          });
          const remoteIndex =
            typeof state.currentIndex === 'number' && state.currentIndex >= 0
              ? state.currentIndex
              : -1;
          const targetId =
            (remoteIndex >= 0 && remoteListIds[remoteIndex]) ||
            state.currentSongId ||
            null;
          if (targetId) {
            auditedNavigate(getSongPathById(targetId, songs), {
              state: {
                listId,
                listSongIds: remoteListIds,
                joinSessionCode,
                currentIndex: state.currentIndex,
                fromContinuous: true,
              } satisfies ExitContinuousNavState,
            }, 'shared-session:musician');
          }
          return;
        }

        if (!wantsContinuous) return;

        const remoteIndex =
          typeof state.currentIndex === 'number' && state.currentIndex >= 0
            ? state.currentIndex
            : null;
        const targetSongId =
          remoteIndex != null && remoteListIds[remoteIndex]
            ? remoteListIds[remoteIndex]
            : state.currentSongId ?? null;

        if (targetSongId) {
          const remoteIdx =
            remoteIndex ?? remoteListIds.indexOf(targetSongId);
          if (remoteIdx >= 0) {
            setSyncTargetIndexAudited(remoteIdx, 'shared-session:immediate');
          }
          if (
            isFollowerRole &&
            followDirectorRef.current &&
            remoteIdx >= 0 &&
            remoteIdx !== lastSettledRemoteIndexRef.current &&
            remoteIdx !== landing.getLastAppliedIndex()
          ) {
            unsettledRemoteChangeCountRef.current += 1;
            if (
              unsettledRemoteChangeCountRef.current >= 2 &&
              !landing.hasPendingLanding()
            ) {
              followDesyncWarningLog({
                remoteIndex: remoteIdx,
                lastAppliedIndex: landing.getLastAppliedIndex(),
                lastSettledIndex: lastSettledRemoteIndexRef.current,
                landingInProgress: landing.hasPendingLanding(),
                pathname: location.pathname,
                viewMode: state.viewMode,
              });
            }
          }
          void applyRemoteSongOnce(
            remoteIndex ?? undefined,
            targetSongId,
            remoteListIds,
            null,
            'shared-session',
            state.updatedAt
          );
          return;
        }
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false;
        });
      }
    },
    [
      listId,
      songIds,
      genderShift,
      navigate,
      joinSessionCode,
      sessionConnection?.sessionCode,
      applySongSemitones,
      applyRemoteSongOnce,
      applyRemoteSectionOnce,
      resolvedSongIds,
      getFollowAuditSnapshot,
      shouldIgnoreFollowerSongApply,
      auditedNavigate,
      reportRuntimeEvent,
      isStaleRemoteReplay,
      location.pathname,
      isFollowerRole,
      applyV3ContinuousIndexFromRemote,
    ]
  );

  const handleSimpleRemoteState = useCallback(
    (state: SimpleLiveState) => {
      handleSharedSessionUpdate({
        sessionId: state.sessionCode,
        currentSongId: state.songId,
        currentIndex: state.currentIndex,
        listId: state.listId,
        listSongIds: state.listSongIds,
        customSemitones: state.semitones,
        genderShift: state.genderShift,
        viewMode: state.viewMode,
        sharedSectionAnchor: state.sectionAnchor ?? undefined,
        updatedAt: state.updatedAt,
      });
    },
    [handleSharedSessionUpdate]
  );

  useEffect(() => {
    const onForceIndex = (ev: Event) => {
      const detail = (ev as CustomEvent<ForceContinuousIndexDetail>).detail;
      if (!detail || typeof detail.currentIndex !== 'number' || detail.currentIndex < 0) return;
      if (!followDirectorRef.current) return;
      if (detail.listId && listId && detail.listId !== listId) return;

      applyV3ContinuousIndexFromRemote(
        {
          sessionId: detail.sessionCode ?? sessionConnection?.sessionCode ?? '',
          currentSongId: detail.currentSongId,
          currentIndex: detail.currentIndex,
          listId: detail.listId,
          viewMode: (detail.viewMode as ViewMode) ?? 'continuous',
          customSemitones: 0,
          genderShift: 'original',
          updatedAt: new Date().toISOString(),
        },
        detail.source ?? 'force-continuous-index-event'
      );
    };

    window.addEventListener(LIVE_SESSION_FORCE_CONTINUOUS_INDEX_EVENT, onForceIndex);
    return () => window.removeEventListener(LIVE_SESSION_FORCE_CONTINUOUS_INDEX_EVENT, onForceIndex);
  }, [applyV3ContinuousIndexFromRemote, listId, sessionConnection?.sessionCode]);

  const handleDirectorSessionEnded = useCallback(() => {
    if (sessionConnection?.role !== 'follower') return;
    landing.reset();
    routeInitialAppliedRef.current = false;
  }, [sessionConnection?.role, landing]);

  const handleSessionRecovered = useCallback(
    (state: SessionRecoveryState, meta: SessionRecoveryMeta) => {
      followPipelineLog({
        action: 'handleSessionRecovered',
        role: meta.role,
        currentIndex: state.currentIndex ?? null,
        songId: state.songId ?? null,
        ...getFollowAuditSnapshot('handleSessionRecovered'),
      });
      sessionHydrationRef.current = true;
      applyingRemoteRef.current = true;
      try {
        sessionRecoveryLog('hydrate session', { code: meta.code, role: meta.role });

        if (meta.role === 'director') {
          if (state.listId && state.listSongIds.length > 0) {
            persistContinuousListSync(state.listId, state.listSongIds);
            setSharedListSongIds(state.listSongIds);
          }
          const localGender = localGenderFromRecovery(state);
          if (localGender !== genderShift) {
            setGenderShift(localGender);
          }
          if (state.songId && typeof state.semitones === 'number') {
            applySongSemitones(state.songId, state.semitones);
          }
          sessionRecoveryLog('director recovery: local state only, no navigation');
          const ids =
            state.listSongIds.length > 0 ? state.listSongIds : songIds;
          const idx =
            typeof state.currentIndex === 'number' && state.currentIndex >= 0
              ? state.currentIndex
              : state.songId
                ? ids.indexOf(state.songId)
                : -1;
          const songId =
            state.songId ?? (idx >= 0 ? ids[idx] : null);
          if (songId && idx >= 0) {
            directorContinuousStateRef.current = {
              currentSongId: songId,
              currentIndex: idx,
              currentSectionAnchor: state.sharedSectionAnchor ?? null,
            };
            const publishAfterHydration = () => {
              if (sessionHydrationRef.current) {
                queueMicrotask(publishAfterHydration);
                return;
              }
              publishDirectorIntent('recovery');
            };
            queueMicrotask(publishAfterHydration);
          }
          return;
        }

        if (state.listId && state.listSongIds.length > 0) {
          persistContinuousListSync(state.listId, state.listSongIds);
          setSharedListSongIds(state.listSongIds);
        }

        const shouldFollowNavigation = readFollowDirector();

        if (!shouldFollowNavigation) {
          followDirectorLog('passive mode enabled');
          followDirectorLog('skipping navigation sync');

          const localGenderOnly = localGenderFromRecovery(state);
          if (localGenderOnly !== genderShift) {
            setGenderShift(localGenderOnly);
          }
          if (state.songId && typeof state.semitones === 'number') {
            applySongSemitones(state.songId, state.semitones);
            followDirectorLog('applying transpose only', {
              songId: state.songId,
              semitones: state.semitones,
            });
          }
          return;
        }

        const localGender = localGenderFromRecovery(state);
        if (localGender !== genderShift) {
          setGenderShift(localGender);
        }

        if (state.songId && typeof state.semitones === 'number') {
          applySongSemitones(state.songId, state.semitones);
          sessionRecoveryLog('restore transpose', {
            songId: state.songId,
            semitones: state.semitones,
          });
        }

        if (!shouldFollowNavigation) return;

        if (shouldDisableLegacyFollowPipeline('follower')) {
          return;
        }

        traceFollow('FOLLOW_RECOVERY_HANDLER_GATE', {
          pathname: location.pathname,
          followDirector: shouldFollowNavigation,
          shouldBypass:
            location.pathname?.includes('/live') && shouldFollowNavigation,
        });

        if (
          meta.role === 'follower' &&
          !isFollowerContinuousEnabled(shouldFollowNavigation)
        ) {
          const remoteSongId =
            state.songId ??
            (typeof state.currentIndex === 'number' &&
            state.listSongIds[state.currentIndex]
              ? state.listSongIds[state.currentIndex]
              : null);
          navigateFollowerSongViewOnly({
            navigate,
            followDirector: shouldFollowNavigation,
            songId: remoteSongId,
            remoteIndex: state.currentIndex,
            listId: state.listId ?? listId,
            listSongIds: state.listSongIds,
            joinSessionCode: meta.code,
          });
          return;
        }

        if (
          meta.role === 'follower' &&
          isContinuousLiveSimpleMode(location.pathname)
        ) {
          followTrace('FOLLOW_RECOVERY_BYPASSED', {
            actor: 'spectator',
            page: 'continuous-live',
            sessionCode: meta.code,
            currentRoute: location.pathname,
            reason: 'continuous-live-simple-mode',
            extra: {
              reason: 'continuous-live-simple-mode',
              pathname: location.pathname,
              sessionCode: meta.code,
              route: location.pathname,
            },
          });
          const targetListId = state.listId ?? listId;
          if (
            isContinuousRecoveryReady(state) &&
            targetListId === listId &&
            songIds.length > 0
          ) {
            const remoteList =
              state.listSongIds.length > 0 ? state.listSongIds : songIds;
            const remoteIndex =
              typeof state.currentIndex === 'number' && state.currentIndex >= 0
                ? state.currentIndex
                : undefined;
            const targetId =
              (remoteIndex != null && remoteList[remoteIndex]) ?? state.songId ?? null;
            if (targetId && remoteIndex != null) {
              traceFollow('FOLLOW_REMOTE_PRIORITY_RECOVERY', {
                remoteIndex,
                remoteSongId: targetId,
              });
              followTrace('FOLLOW_REMOTE_PRIORITY_APPLIED', {
                actor: 'spectator',
                page: 'continuous-live',
                remoteIndex,
                localIndex: landing.getLastAppliedIndex() ?? undefined,
                currentRoute: location.pathname,
                reason: 'remote-is-source-of-truth',
                extra: {
                  remoteIndex,
                  currentIndex: landing.getLastAppliedIndex(),
                  pathname: location.pathname,
                  reason: 'remote-is-source-of-truth',
                },
              });
              void applyRemoteSongOnce(
                remoteIndex,
                targetId,
                remoteList,
                null,
                'recovery-remote-priority'
              );
            }
          }
          return;
        }

        const wantsContinuous = isContinuousRecoveryReady(state);
        const targetListId = state.listId ?? listId;

        if (wantsContinuous && hasManualExitContinuous(targetListId)) {
          sessionRecoveryLog('skipped continuous restore (manual exit)', {
            listId: targetListId,
          });
          return;
        }

        if (
          meta.role === 'follower' &&
          wantsContinuous &&
          targetListId &&
          targetListId !== listId
        ) {
          if (state.songId) {
            sessionRecoveryLog('navigate song (follower, other list)', {
              listId: targetListId,
              songId: state.songId,
            });
            auditedNavigate(getSongPathById(state.songId, songs), {
              state: {
                listId: targetListId,
                listSongIds: state.listSongIds,
                joinSessionCode: meta.code,
                currentIndex: state.currentIndex,
                fromContinuous: true,
              },
            }, 'handleSessionRecovered:other-list-song');
          } else {
            sessionRecoveryLog('navigate list (follower, other list)', { listId: targetListId });
            auditedNavigate(`/lista/${targetListId}`, undefined, 'handleSessionRecovered:other-list');
          }
          return;
        }

        if (wantsContinuous && targetListId === listId && songIds.length > 0) {
          const remoteList =
            state.listSongIds.length > 0 ? state.listSongIds : songIds;
          const remoteIndex =
            typeof state.currentIndex === 'number' && state.currentIndex >= 0
              ? state.currentIndex
              : undefined;
          const targetId =
            (remoteIndex != null && remoteList[remoteIndex]) ?? state.songId ?? null;
          if (targetId) {
            void applyRemoteSongOnce(
              remoteIndex,
              targetId,
              remoteList,
              null,
              'recovery'
            );
          }
        }

        const resolvedView = resolveSharedViewMode(
          state.viewMode,
          state.listId,
          state.listSongIds
        );
        if (meta.role === 'follower' && resolvedView === 'musician' && state.songId) {
          sessionRecoveryLog('navigate song', { songId: state.songId });
          auditedNavigate(getSongPathById(state.songId, songs), {
            state: {
              listId: state.listId ?? undefined,
              listSongIds: state.listSongIds,
              joinSessionCode: meta.code,
              currentIndex: state.currentIndex,
              fromContinuous: true,
            } satisfies ExitContinuousNavState,
          }, 'handleSessionRecovered:musician');
        }
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false;
          sessionHydrationRef.current = false;
        });
      }
    },
    [
      listId,
      songIds,
      genderShift,
      followDirector,
      auditedNavigate,
      applySongSemitones,
      applyRemoteSectionOnce,
      applyRemoteSongOnce,
      getFollowAuditSnapshot,
      shouldIgnoreFollowerSongApply,
      publishDirectorIntent,
    ]
  );

  useEffect(() => {
    directorEnterPublishedRef.current = false;
  }, [listId]);

  useEffect(() => {
    if (routeInitialAppliedRef.current || entries.length === 0) return;

    if (
      isFollowerRole &&
      followDirectorRef.current &&
      isContinuousLiveSimpleMode(location.pathname)
    ) {
      followPipelineLog({
        action: 'route-initial-skipped',
        reason: 'continuous-live-remote-priority',
        ...getFollowAuditSnapshot('route-initial'),
      });
      routeInitialAppliedRef.current = true;
      return;
    }

    if (landing.hasPendingLanding()) {
      followIgnoreLog({
        reason: 'route initial skipped — landing pending',
        ...getFollowAuditSnapshot('route-initial'),
      });
      routeInitialAppliedRef.current = true;
      return;
    }

    if (landing.getLastAppliedIndex() != null) {
      followIgnoreLog({
        reason: 'route initial skipped — already applied',
        lastAppliedIndex: landing.getLastAppliedIndex(),
        ...getFollowAuditSnapshot('route-initial'),
      });
      routeInitialAppliedRef.current = true;
      return;
    }

    const initialId = routeState.initialSongId;
    const initialIndex = routeInitialIndex;
    if (!initialId && typeof initialIndex !== 'number') return;

    const remoteList = resolvedSongIds.length > 0 ? resolvedSongIds : songIds;

    followPipelineLog({
      action: 'route-initial',
      initialId: initialId ?? null,
      initialIndex: initialIndex ?? null,
      recoverySource: routeState.recoverySource ?? 'route',
      ...getFollowAuditSnapshot('route-initial'),
    });

    const t = window.setTimeout(() => {
      if (isFollowerRole && followDirectorRef.current) {
        const idx =
          typeof initialIndex === 'number' && initialIndex >= 0 ? initialIndex : undefined;
        const songId =
          initialId ??
          (idx != null && remoteList[idx] ? remoteList[idx] : null);
        if (!songId) {
          routeInitialAppliedRef.current = true;
          return;
        }
        void applyRemoteSongOnce(idx, songId, remoteList, null, 'route-initial');
      } else if (initialId) {
        const idx = remoteList.indexOf(initialId);
        scrollSongLocal(initialId, 'auto');
        if (isDirector && idx >= 0) {
          publishDirectorIntent('route-initial', {
            currentSongId: initialId,
            currentIndex: idx,
          });
        }
      } else if (
        typeof initialIndex === 'number' &&
        initialIndex >= 0 &&
        initialIndex < songIds.length
      ) {
        const id = songIds[initialIndex];
        scrollSongLocal(id, 'auto');
        if (isDirector) {
          publishDirectorIntent('route-initial', {
            currentSongId: id,
            currentIndex: initialIndex,
          });
        }
      }
      routeInitialAppliedRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [
    entries.length,
    routeState.initialSongId,
    routeInitialIndex,
    routeState.recoverySource,
    songIds,
    scrollSongLocal,
    isFollowerRole,
    isDirector,
    resolvedSongIds,
    applyRemoteSongOnce,
    publishDirectorIntent,
    getFollowAuditSnapshot,
    landing,
  ]);

  const handleExitContinuous = useCallback(() => {
    if (!listId) return;

    const currentIndex = visibility.currentSongIndex;
    const listSongIdsForNav =
      resolvedSongIds.length > 0 ? resolvedSongIds : songIds;
    const targetId = resolveExitContinuousSongId(
      currentSong?.id,
      visibility.currentSongId,
      listSongIdsForNav,
      currentIndex
    );

    if (!targetId) return;

    markManualExitContinuous(listId);

    const sessionCode =
      effectiveJoinCode ?? sessionConnection?.sessionCode ?? undefined;

    navigateExitToSongView(navigate, {
      listId,
      listSongIds: listSongIdsForNav,
      targetSongId: targetId,
      currentIndex,
      joinSessionCode: sessionCode,
    });
  }, [
    listId,
    sessionConnection,
    effectiveJoinCode,
    visibility.currentSongId,
    visibility.currentSongIndex,
    currentSong,
    resolvedSongIds,
    songIds,
    navigate,
    genderShift,
  ]);

  useEffect(() => {
    setDirectorSectionAnchor('');
    lastPublishedSectionRef.current = '';
    landing.reset();
    if (windowUnfreezeTimerRef.current) {
      clearTimeout(windowUnfreezeTimerRef.current);
      windowUnfreezeTimerRef.current = null;
    }
    lastPublishedSongRef.current = null;
  }, [listId]);

  useEffect(() => {
    const songId = visibility.currentSongId;
    if (!songId) return;
    songViewRenderLog({
      source: 'continuous',
      preference: songViewPreference,
      fullscreen: isFullscreen,
      songId,
    });
  }, [visibility.currentSongId, songViewPreference, isFullscreen]);

  const awaitingDirectorList =
    !!listId &&
    resolvedSongIds.length === 0 &&
    (!!joinSessionCode ||
      !!sessionConnection ||
      !!sessionCodeForFetch ||
      simpleLive?.role === 'follower');

  const followerAwaitingListOrIndex =
    (liveIsFollower || simpleLive?.role === 'follower') &&
    !!listId &&
    (resolvedSongIds.length === 0 ||
      entries.length === 0 ||
      followerAwaitingDirector ||
      (followerInLiveFollow &&
        (landing.hasPendingLanding() || landing.isLandingInProgress())));

  const wrapFollower = (node: JSX.Element) =>
    liveIsFollower || simpleLive?.role === 'follower' ? (
      <FollowerContinuousShell>{node}</FollowerContinuousShell>
    ) : (
      node
    );

  // Legacy awaiting overlays can trap simple followers forever (Spectator never sets liveIsFollower).
  if (
    !FEATURES.SIMPLE_LIVE_SYNC &&
    liveIsFollower &&
    (followerAwaitingDirector || followerAwaitingListOrIndex)
  ) {
    return wrapFollower(
      <FollowerDirectorSyncLoader sessionCode={effectiveJoinCode ?? sessionCodeForFetch} />
    );
  }

  if (!listId) {
    if (liveIsFollower) {
      return wrapFollower(
        <FollowerDirectorSyncLoader sessionCode={effectiveJoinCode ?? sessionCodeForFetch} />
      );
    }
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Setlist no encontrada</p>
        <Link to="/listas" className="text-gold hover:underline">
          Volver a listas
        </Link>
      </div>
    );
  }

  if (
    listId &&
    resolvedSongIds.length === 0 &&
    (liveIsFollower || !!sessionConnection || !!sessionCodeForFetch)
  ) {
    return wrapFollower(
      <FollowerDirectorSyncLoader sessionCode={effectiveJoinCode ?? sessionCodeForFetch} />
    );
  }

  if (!list && resolvedSongIds.length === 0) {
    if (liveIsFollower) {
      return wrapFollower(
        <FollowerDirectorSyncLoader sessionCode={effectiveJoinCode ?? sessionCodeForFetch} />
      );
    }

    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          {awaitingDirectorList
            ? 'Esperando la lista del director…'
            : 'Setlist no encontrada'}
        </p>
        {import.meta.env.DEV && (
          <p className="text-xs text-muted-foreground mb-2">
            source: {resolvedSource}
            {awaitingDirectorList ? ' · sync en curso' : ''}
            {sessionCodeForFetch ? ` · sesión ${sessionCodeForFetch}` : ''}
          </p>
        )}
        <Link to="/listas" className="text-gold hover:underline">
          Volver a listas
        </Link>
      </div>
    );
  }

  if (entries.length === 0) {
    if (liveIsFollower) {
      return wrapFollower(
        <div className="container px-4 py-12 text-center">
          <FollowerDirectorSyncLoader sessionCode={effectiveJoinCode ?? sessionCodeForFetch} />
          <p className="mt-2 text-sm text-muted-foreground">
            {resolvedSongIds.length > 0
              ? 'Esperando que las canciones estén disponibles en tu biblioteca…'
              : 'Esperando lista del director…'}
          </p>
        </div>
      );
    }
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          {resolvedSongIds.length > 0
            ? 'Las canciones de esta lista no están en tu biblioteca todavía'
            : 'Esta lista no tiene canciones'}
        </p>
        <Link to={`/lista/${listId}`} className="text-gold hover:underline">
          Editar lista
        </Link>
      </div>
    );
  }

  if (followerContinuousFrozen) {
    return wrapFollower(
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          El modo continuo no está disponible para seguir al director en esta vista.
        </p>
        <Link to="/" className="text-gold hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const rootClass = [
    'continuous-setlist-root',
    isFullscreen ? 'is-fullscreen' : '',
    settings.stageMode ? 'is-stage' : '',
    settings.ultraContrast ? 'is-ultra' : '',
    dockUiVisible ? 'has-dock' : '',
    mobileTeleprompter ? 'is-teleprompter-hidden' : '',
    // Smooth scroll only for director — followers snap instantly (less drift / lag).
    isDirector && !isFollower ? 'is-director-smooth' : '',
    FEATURES.SIMPLE_LIVE_SYNC && simpleLive && simpleLive.role !== 'idle' ? 'has-live-bar' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const continuousPage = (
    <div
      className={rootClass}
      data-continuous-setlist
    >
      <SessionOriginMismatchDialog
        open={sessionOriginMismatch.open}
        listLabel={sessionOriginMismatch.label}
        onVolver={sessionOriginMismatch.volverASesion}
        onRedirect={sessionOriginMismatch.redirectHere}
        onCerrar={sessionOriginMismatch.cerrarSesion}
        onDismiss={sessionOriginMismatch.dismiss}
      />
      <button
        type="button"
        onClick={handleExitContinuous}
        className="continuous-exit-btn"
        aria-label="Salir de continuo"
        hidden={mobileTeleprompter}
      >
        Salir de continuo
      </button>

      {isFollower && !followDirector && !mobileTeleprompter && (
        <div className="continuous-teleprompter-chrome sticky top-10 z-20 mx-auto max-w-4xl px-3 sm:px-4 py-1.5 hidden sm:block">
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200">
            Siguiendo desactivado — sigues conectado; navegación y scroll no se sincronizan hasta que lo reactives.
          </p>
        </div>
      )}

      {isFollower && !FEATURES.SIMPLE_LIVE_SYNC && !mobileTeleprompter && (
        <div className="continuous-teleprompter-chrome sticky top-10 z-20 mx-auto max-w-4xl px-3 sm:px-4 py-1.5">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs">
            <span className="font-medium text-blue-200">
              {followDirector ? 'Seguir al director' : 'Dejar de seguir al director'}
            </span>
            <input
              type="checkbox"
              checked={followDirector}
              onChange={(e) => handleFollowDirectorChange(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
          </label>
        </div>
      )}

      {!mobileTeleprompter && (
        <ContinuousSetlistToolbar
          listId={listId}
          listName={list.name}
          onBack={handleExitContinuous}
          syncMode
          hideChrome={settings.hideChrome}
          stageMode={settings.stageMode}
          ultraContrast={settings.ultraContrast}
          largeSpacing={settings.largeSpacing}
          isFullscreen={isFullscreen}
          showSession={showSession}
          onToggleStage={() => toggle('stageMode')}
          onToggleUltraContrast={() => toggle('ultraContrast')}
          onToggleLargeSpacing={() => toggle('largeSpacing')}
          onToggleHideChrome={() => toggle('hideChrome')}
          onToggleFullscreen={() => setIsFullscreen((f) => !f)}
          onToggleSession={() => setShowSession((s) => !s)}
          onFontSmaller={() => patch({ fontSize: Math.max(14, settings.fontSize - 1) })}
          onFontLarger={() => patch({ fontSize: Math.min(28, settings.fontSize + 1) })}
        />
      )}

      {!mobileTeleprompter && (
        <div
          className={
            isFullscreen
              ? 'continuous-teleprompter-chrome fixed top-12 left-3 z-[110]'
              : 'continuous-teleprompter-chrome sticky top-10 z-20 mx-auto max-w-4xl px-4 py-1.5'
          }
        >
          <SongViewPreferenceToggle
            preference={songViewPreference}
            onChange={setSongViewPreference}
          />
        </div>
      )}

      {liveNote && !mobileTeleprompter && (
        <div className="continuous-teleprompter-chrome sticky top-12 z-20 mx-auto max-w-4xl px-4 py-2">
          <p className="text-sm text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-lg px-3 py-2">
            {liveNote}
          </p>
        </div>
      )}

      {isDirector && currentSong && !isLyricsOnlyPreference && !mobileTeleprompter && (
        <SectionQuickNav
          chords={currentSong.chords}
          activeAnchorId={directorSectionAnchor || visibility.currentSection}
          onSelectAnchor={handleDirectorSectionAnchor}
        />
      )}

      <div ref={scrollRef} className="continuous-setlist-scroll">
        <ContinuousSetlistScroller
          entries={entries}
          windowStart={windowStart}
          windowEnd={windowEnd}
          settings={scrollerSettings}
          activeSongId={isDirector ? visibility.currentSongId : ''}
          activeSectionAnchor={directorSectionAnchor || visibility.currentSection}
          transposeRevision={transposeRevision}
          scrollRootRef={scrollRef}
          onSectionAnchorClick={isDirector ? handleDirectorSectionAnchor : undefined}
        />
      </div>

      <div
        className={
          (showSession || (FEATURES.SIMPLE_LIVE_SYNC && simpleLive && simpleLive.role !== 'idle'))
            ? `continuous-session-panel${
                FEATURES.SIMPLE_LIVE_SYNC && simpleLive && simpleLive.role !== 'idle'
                  ? ' is-live-bar'
                  : ''
              }`
            : FEATURES.SIMPLE_LIVE_SYNC && showSession
              ? 'continuous-session-panel'
              : 'sr-only h-0 overflow-hidden'
        }
        aria-hidden={
          !(
            showSession ||
            (FEATURES.SIMPLE_LIVE_SYNC && simpleLive && simpleLive.role !== 'idle')
          )
        }
      >
        {FEATURES.SIMPLE_LIVE_SYNC ? (
          <SimpleLiveSyncPanel
            compact={simpleLive?.role !== 'idle'}
            songId={currentSong?.id ?? visibility.currentSongId ?? ''}
            semitones={currentSong ? effectiveSemitones : 0}
            viewMode="continuous"
            genderShift={genderShift || 'original'}
            currentIndex={visibility.currentSongIndex}
            listId={listId}
            listSongIds={resolvedSongIds.length > 0 ? resolvedSongIds : songIds}
            sharedSectionAnchor={directorSectionAnchor}
            onRemoteState={handleSimpleRemoteState}
          />
        ) : (
        <DirectorSession
          songId={currentSong?.id ?? visibility.currentSongId ?? ''}
          semitones={currentSong ? effectiveSemitones : 0}
          currentKey={currentSong ? displayKey || displayOriginalKey : 'C'}
            listId={listId}
            listSongIds={resolvedSongIds.length > 0 ? resolvedSongIds : songIds}
            pageContext={pageSessionContext}
            allowAutoReconnect={sessionOriginMismatch.allowAutoReconnect}
            listName={list?.name}
            viewMode="continuous"
            genderShift={genderShift}
            currentIndex={visibility.currentSongIndex}
            sharedSectionAnchor={directorSectionAnchor}
            followDirector={followDirector}
            liveNote={liveNote}
            activeSection={visibility.currentSection}
            onSessionRecovered={handleSessionRecovered}
            onSessionUpdate={handleSessionUpdate}
            onNavigateSong={(songId) => {
              const ids = resolvedSongIds.length > 0 ? resolvedSongIds : songIds;
              const idx = Math.max(0, ids.indexOf(songId));
              scrollSongLocal(songId);
              if (sessionConnection?.role === 'director') {
                publishDirectorIntent('navigate-song', {
                  currentSongId: songId,
                  currentIndex: idx,
                });
              }
            }}
            autoJoinFollower={autoJoinFollower}
            initialJoinCode={autoJoinFollower ? effectiveJoinCode : undefined}
            onConnectionChange={(connection) => {
              if (connection) {
                continuousSyncLog('channel joined', connection);
              }
              if (connection?.role === 'director') {
                setShowSession(true);
              }
              if (sessionHydrationRef.current) {
                sessionRecoveryLog('skipped publish during hydration');
                return;
              }
              if (connection?.role === 'director' && listId) {
                queueMicrotask(() => {
                  if (sessionHydrationRef.current) {
                    sessionRecoveryLog('skipped publish during hydration');
                    return;
                  }
                  publishDirectorIntent('connection');
                });
              }
            }}
            onSharedSessionUpdate={handleSharedSessionUpdate}
            onSharedSessionEnded={handleDirectorSessionEnded}
            onFollowDirectorChange={handleFollowDirectorChange}
            showFollowDirectorToggle={isFollower}
            notifyOnSessionEnd={false}
            sessionPanelVisible={showSession}
            onDirectorSessionStarting={() => setShowSession(true)}
          onDirectorSessionEstablished={handleDirectorSessionEstablished}
          onRequestSharedSessionPublish={handleRequestSharedSessionPublish}
        />
        )}
      </div>

      <TeleprompterLivePill
        visible={mobileTeleprompter}
        role={
          (FEATURES.SIMPLE_LIVE_SYNC ? simpleLive?.role : sessionConnection?.role) ?? 'idle'
        }
        connected={
          FEATURES.SIMPLE_LIVE_SYNC
            ? simpleLive?.status === 'connected'
            : !!sessionConnection
        }
        connecting={FEATURES.SIMPLE_LIVE_SYNC && simpleLive?.status === 'connecting'}
        followDirector={followDirector}
        onTap={showControls}
      />

      <MobileControlsRestoreFab
        visible={isMobile && showDock && controlsHidden}
        onShow={showControls}
      />

      <ContinuousSetlistDock
        visible={dockUiVisible}
        controlsVisible={dockControlsVisible}
        controlsHidden={controlsHidden}
        onHideControls={hideControls}
        serviceModeInput={
          currentSong
            ? {
                songId: currentSong.id,
                semitones: effectiveSemitones,
                viewMode: 'continuous',
                genderShift:
                  genderShift === 'male' || genderShift === 'female' ? genderShift : 'original',
                currentIndex: visibility.currentSongIndex,
                listId: listId ?? null,
                listSongIds: resolvedSongIds.length > 0 ? resolvedSongIds : songIds,
                sectionAnchor: directorSectionAnchor || visibility.currentSection || null,
              }
            : null
        }
        listName={list.name}
        currentIndex={visibility.currentSongIndex}
        total={entries.length}
        currentTitle={currentSong?.title ?? ''}
        hasPrev={
          isDirector
            ? directorContinuousStateRef.current.currentIndex > 0
            : visibility.currentSongIndex > 0
        }
        hasNext={
          isDirector
            ? directorContinuousStateRef.current.currentIndex < entries.length - 1
            : visibility.currentSongIndex < entries.length - 1
        }
        isFullscreen={isFullscreen}
        displayKey={displayKey || displayOriginalKey}
        genderShift={genderShift}
        customSemitones={customSemitones}
        autoScrolling={autoScrolling}
        onTransposeDown={() => {
          if (!currentSong) return;
          applySongSemitones(currentSong.id, customSemitones - 1);
        }}
        onTransposeUp={() => {
          if (!currentSong) return;
          applySongSemitones(currentSong.id, customSemitones + 1);
        }}
        onSetCustomSemitones={(value) => {
          if (!currentSong) return;
          applySongSemitones(currentSong.id, value);
        }}
        onGenderToggle={() => {
          setGenderShift((g) => (g === 'male' ? 'female' : g === 'female' ? '' : 'male'));
        }}
        onGenderSelect={setGenderShift}
        onToggleAutoScroll={() => setAutoScrolling((a) => !a)}
        onPrev={handlePrev}
        onNext={handleNext}
        onOpenNavigator={() => setNavOpen(true)}
        onSongStart={() => {
          if (!currentSong) return;
          scrollSongStartLocal(currentSong.id);
          if (isDirector) {
            const snap = directorContinuousStateRef.current;
            publishDirectorIntent('song-start', {
              currentSongId: snap.currentSongId ?? currentSong.id,
              currentIndex: snap.currentIndex,
            });
          }
        }}
        onToggleFullscreen={() => setIsFullscreen((f) => !f)}
        onScrollToTop={handleScrollToTop}
      />

      <SetlistMiniNavigator
        open={navOpen}
        onOpenChange={setNavOpen}
        entries={entries}
        currentSongId={visibility.currentSongId}
        onJump={(songId) => {
          const idx = songIds.indexOf(songId);
          scrollSongLocal(songId);
          if (isDirector && idx >= 0) {
            publishDirectorIntent('mini-nav', {
              currentSongId: songId,
              currentIndex: idx,
            });
          }
        }}
      />
    </div>
  );

  return wrapFollower(continuousPage);
}
