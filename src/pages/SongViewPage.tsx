import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { Heart, Plus, ChevronUp, Play, Pause, Share2, X, Maximize, Minimize, Printer, Edit2, Save, Mic, User, Users as UsersIcon, ListMusic, Type } from 'lucide-react';
import { encodeShareConfig, decodeShareConfig } from '@/utils/transpose';
import { clearUserSemitones } from '@/utils/userTranspositions';
import { EMPTY_SONG_SETTINGS, useSongSettings } from '@/hooks/useSongSettings';
import { convertLineToLatin } from '@/utils/notation';
import { useTransposeEngine } from '@/features/transpose/hooks/useTransposeEngine';
import { generateSongPdf } from '@/utils/pdfExport';
import { VOCAL_REGISTERS, getOptimalSemitonesForRegister, type VocalRegister } from '@/utils/vocalRange';
import { toast } from 'sonner';
import ChordSheet from '@/features/song-view/components/ChordSheet';
import { SongViewPreferenceToggle } from '@/features/song-view/components/SongViewPreferenceToggle';
import {
  songViewRenderLog,
  useSongViewPreference,
} from '@/features/song-view/preferences/songViewPreference';
import TransposePanel from '@/features/song-view/components/TransposePanel';
import {
  RehearsalTools,
  RehearsalAutoScrollToolbar,
  RehearsalAutoScrollStopFab,
} from '@/features/rehearsal/components/RehearsalTools';
import { useMetronome } from '@/features/rehearsal/hooks/useMetronome';
import { useYouTubePlayer } from '@/features/rehearsal/hooks/useYouTubePlayer';
import { useAutoScroll } from '@/features/rehearsal/hooks/useAutoScroll';
import DirectorSession from '@/components/DirectorSession';
import SetlistNav from '@/components/SetlistNav';
import type { DirectorSessionConnection, SharedSessionState } from '@/features/director-session/types';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { FollowerDirectorSyncLoader } from '@/features/director-session/components/FollowerDirectorSyncLoader';
import { shouldApplyRemoteSectionAnchor } from '@/features/director-session/utils/shouldApplyRemoteSectionAnchor';
import { useSessionOriginMismatch } from '@/features/director-session/hooks/useSessionOriginMismatch';
import { useReportSessionPageContext } from '@/features/director-session/hooks/useReportSessionPageContext';
import { SessionOriginMismatchDialog } from '@/features/director-session/components/SessionOriginMismatchDialog';
import {
  clearManualExitContinuous,
  hasManualExitContinuous,
  markManualExitContinuous,
} from '@/features/director-session/utils/continuousExitGuard';
import { buildExitContinuousNavState } from '@/features/director-session/utils/exitContinuousNavigation';
import {
  fromSharedGenderShift,
  readFollowDirector,
  writeFollowDirector,
  followDirectorLog,
  sessionSyncLog,
  isPassiveSpectatorMode,
  toSharedGenderShift,
  continuousSyncLog,
  logContinuousPublish,
  isContinuousRecoveryReady,
  localGenderFromRecovery,
  sessionRecoveryLog,
  type SessionRecoveryMeta,
  type SessionRecoveryState,
} from '@/features/director-session';
import { followViewmodeLog } from '@/features/director-session/utils/followerRecoveryLog';
import { auditEventLog } from '@/features/director-session/utils/auditEventLog';
import { followTrace } from '@/features/director-session/utils/followTrace';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';
import { navigateFollowerSongViewOnly } from '@/features/director-session/utils/navigateFollowerSongViewOnly';
import { FEATURES } from '@/config/features';
import { useDirectorFollowV3 } from '@/features/director-session/follow-v3/useDirectorFollowV3';
import {
  isFollowV3SpectatorActive,
  resolveFollowV3SongById,
  shouldDisableLegacyFollowPipeline,
  useFollowV3Song,
  getFollowV3State,
} from '@/features/director-session/follow-v3/isFollowV3Active';
import {
  blockSongViewScrollEffects,
  followSongviewBlockLog,
  followSongviewLockLog,
  followViewLog,
  getFollowerSongViewSyncGuard,
  isFollowerInContinuousMode,
  isFollowerSongViewOnlySync,
} from '@/features/director-session/utils/followerViewMode';
import { persistContinuousListSync } from '@/features/continuous-setlist/utils/continuousListSyncCache';
import { fetchLiveSessionList } from '@/features/continuous-setlist/utils/fetchLiveSessionList';
import { resolveRemoteListSongIds } from '@/features/continuous-setlist/utils/resolveRemoteListSongIds';
import {
  isContinuousModeAvailable,
  isContinuousTeleprompterView,
  resolveSharedViewMode,
  showChordsForViewMode,
  showMusicianNotesForViewMode,
  teleprompterFontBoost,
  type SessionState,
  type Song,
  type ViewMode,
} from '@/types/music';
import { supabase } from '@/integrations/supabase/client';
import { MobileStageLayout } from '@/features/mobile-stage/components/MobileStageLayout';
import { MobileStageToggle } from '@/features/mobile-stage/components/MobileStageToggle';
import { MobileStageDock } from '@/features/mobile-stage/components/MobileStageDock';
import { MobileStageYouTubePeek } from '@/features/mobile-stage/components/MobileStageYouTubePeek';
import { useMobileStageSettings } from '@/features/mobile-stage/hooks/useMobileStageSettings';
import {
  useIsMobileViewport,
  useIsLandscape,
  useSongRouteViewportBurst,
} from '@/features/mobile-stage/hooks/useIsMobileViewport';
import { readViewportSnapshot } from '@/features/mobile-stage/hooks/mobileViewportSync';
import { useAutoHideControls } from '@/features/mobile-stage/hooks/useAutoHideControls';
import { useWakeLock } from '@/features/mobile-stage/hooks/useWakeLock';
import type { YouTubeVideoResult } from '@/features/youtube-search/types';
import {
  getYtDiagStage,
  ytDiagDockEnabled,
  ytDiagPeekEnabled,
  isYoutubeQuickPickerAvailable,
  ytDiagLog,
} from '@/features/youtube-search/ytDiagnostic';
import { anchorIdForSectionLabel, listChordSections } from '@/utils/chordSections';
import { scrollToSectionAnchor } from '@/utils/sectionAnchorScroll';
import { SectionQuickNav } from '@/features/song-view/components/SectionQuickNav';
import { useSongPageSeo } from '@/features/seo/useSongPageSeo';
import {
  getSongFromSlugOrId,
  getSongPath,
  getSongPathById,
  isNumericSongId,
  resolveSongIdFromRouteParam,
} from '@/utils/songSlug';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChunkLoadErrorBoundary } from '@/components/ChunkLoadErrorBoundary';
import { WorshipFloatingDock } from '@/features/mobile-worship';
import { useMobileControlsChrome } from '@/features/mobile-worship/hooks/useMobileControlsChrome';
import { MobileControlsRestoreFab } from '@/features/mobile-worship/components/MobileControlsRestoreFab';
import { getRenderDiagStage } from '@/renderDiag';

const YouTubeQuickPicker = lazy(() => {
  if (import.meta.env.DEV) console.log('[YT] loading chunk');
  return import('@/features/youtube-search/components/YouTubeQuickPicker').then((mod) => {
    const Component = mod.YouTubeQuickPicker ?? mod.default;
    if (!Component) {
      throw new Error('[YT] YouTubeQuickPicker export missing');
    }
    if (import.meta.env.DEV) console.log('[YT] chunk loaded');
    return { default: Component };
  });
});

console.log('[BOOT_IMPORT]', 'SongViewPage');

export default function SongViewPage() {
  useEffect(() => {
    const s = getRenderDiagStage();
    if (s >= 5 && s <= 6) console.log('[RENDER] SongViewPage');
  }, []);

  const { songIdentifier } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { songs, toggleFavorite, isFavorite, lists, addSongToList, createList, updateSong, isAdmin } = useApp();
  const [fetchedSong, setFetchedSong] = useState<Song | null>(null);
  const routeSongId = resolveSongIdFromRouteParam(songIdentifier, songs);
  const spectator = useSpectatorSession();
  const {
    connection: sessionConnection,
    publishSharedSessionIfDirector,
    liveIsDirector,
    liveIsFollower,
    followerAwaitingDirector,
    setFollowDirectorPreference,
  } = spectator;
  const isFollowerSpectator = sessionConnection?.role === 'follower';
  /** Store-driven song id only while spectator is actively following (V3). */
  const isFollowOwner = isFollowV3SpectatorActive(liveIsFollower);
  const followSongId = useFollowV3Song();
  const followV3Resolve = useMemo(
    () =>
      isFollowOwner
        ? resolveFollowV3SongById(followSongId, songs)
        : null,
    [isFollowOwner, followSongId, songs]
  );
  const effectiveSongId = isFollowOwner
    ? followV3Resolve?.resolvedSongId ?? null
    : routeSongId ?? fetchedSong?.id ?? null;
  /** Canonical song id for session/sync logic (legacy name kept across page). */
  const id = effectiveSongId ?? undefined;
  const song = effectiveSongId
    ? songs.find((s) => s.id === effectiveSongId) ??
      (fetchedSong?.id === effectiveSongId ? fetchedSong : undefined)
    : undefined;

  const songPath = useCallback(
    (songId: string) => getSongPathById(songId, songs),
    [songs]
  );

  useSongPageSeo(song, songs);

  useEffect(() => {
    if (!songIdentifier) return;
    let cancelled = false;
    void getSongFromSlugOrId(songIdentifier, songs).then((resolved) => {
      if (!cancelled) setFetchedSong(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [songIdentifier, songs]);

  useEffect(() => {
    if (!song || !songIdentifier || !isNumericSongId(songIdentifier)) return;
    const slugPath = getSongPath(song, songs);
    const target = `${slugPath}${location.search}`;
    if (`${location.pathname}${location.search}` !== target) {
      navigate(target, { replace: true, state: location.state });
    }
  }, [song, songIdentifier, songs, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!songIdentifier || songs.length === 0) return;
    if (isNumericSongId(songIdentifier)) return;
    if (routeSongId) return;
    console.warn('[SONG_ROUTE]', { songIdentifier, message: 'slug not found in library' });
  }, [songIdentifier, routeSongId, songs.length]);

  useEffect(() => {
    console.log('[SONG_OWNER]', {
      isFollowOwner,
      routeSongId: routeSongId ?? null,
      followSongId,
      effectiveSongId: effectiveSongId ?? null,
    });
  }, [isFollowOwner, routeSongId, followSongId, effectiveSongId]);

  useEffect(() => {
    if (!isFollowOwner || !followV3Resolve) return;
    console.log('[FOLLOW_V3_SONG_RESOLVE]', followV3Resolve);
  }, [isFollowOwner, followV3Resolve]);

  useEffect(() => {
    if (!isFollowOwner || !followSongId) return;
    if (routeSongId === followSongId) return;
    if (!location.pathname.startsWith('/cancion/')) return;

    const followPath = getSongPathById(followSongId, songs);
    navigate(followPath, { replace: true });
  }, [isFollowOwner, followSongId, routeSongId, location.pathname, songs, navigate]);

  const routeNavState = (location.state ?? {}) as {
    joinSessionCode?: string;
    listId?: string;
    listSongIds?: string[];
    currentIndex?: number;
    fromContinuous?: boolean;
  };
  const joinSessionCode = routeNavState.joinSessionCode;
  const autoJoinFollower = spectator.sessionConnected;
  const effectiveJoinCode = spectator.activeJoinCode ?? joinSessionCode;
  const incomingListId = routeNavState.listId;
  const stateListSongIds = routeNavState.listSongIds;
  const fromContinuous = routeNavState.fromContinuous === true;
  // Local override que refleja en tiempo real las canciones añadidas in-session.
  // Lo derivamos también de `lists` (AppContext) para que cualquier addSongToList
  // se vea reflejado al instante en setlist y broadcast.
  const liveList = useMemo(
    () => (incomingListId ? lists.find(l => l.id === incomingListId) : undefined),
    [lists, incomingListId]
  );
  const incomingListSongIds = liveList?.songIds ?? stateListSongIds;
  const continuousModeAvailable = useMemo(
    () => isContinuousModeAvailable(incomingListId, incomingListSongIds),
    [incomingListId, incomingListSongIds]
  );

  const isDirectorSession =
    liveIsDirector && sessionConnection?.role === 'director' && !!sessionConnection?.sessionCode;

  const directorFollowV3Source = useMemo(() => {
    if (!isDirectorSession) return null;
    const currentSongId = effectiveSongId ?? routeSongId ?? null;
    if (!currentSongId) return null;
    const ids = incomingListSongIds ?? [];
    const idx = ids.indexOf(currentSongId);
    return {
      currentIndex: idx >= 0 ? idx : null,
      renderedIndex: idx >= 0 ? idx : null,
      visibleIndex: null as number | null,
      setlistSongId: idx >= 0 ? ids[idx] : null,
      routeSongId: routeSongId ?? null,
    };
  }, [isDirectorSession, effectiveSongId, routeSongId, incomingListSongIds]);

  useDirectorFollowV3({
    followEnabled: FEATURES.USE_FOLLOW_V3 && isDirectorSession,
    currentSongId: effectiveSongId ?? null,
    sessionCode: sessionConnection?.sessionCode,
    listId: incomingListId ?? null,
    mode: 'song',
    sourceContext: directorFollowV3Source,
  });

  useEffect(() => {
    if (!isFollowOwner || !followSongId) return;
    const incomingIndex = incomingListSongIds?.indexOf(followSongId) ?? -1;
    const renderedIndex =
      effectiveSongId && incomingListSongIds
        ? incomingListSongIds.indexOf(effectiveSongId)
        : -1;
    console.log('[FOLLOW_V3_RECEIVE_COMPARE]', {
      incomingSongId: followSongId,
      incomingIndex: incomingIndex >= 0 ? incomingIndex : null,
      renderedSongId: effectiveSongId ?? null,
      renderedIndex: renderedIndex >= 0 ? renderedIndex : null,
      incomingSeq: getFollowV3State().seq,
      indexParity: incomingIndex >= 0 ? incomingIndex % 2 : null,
      seqParity: getFollowV3State().seq % 2,
    });
  }, [isFollowOwner, followSongId, effectiveSongId, incomingListSongIds]);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(song?.chords || '');

  useEffect(() => { if (song) setEditedContent(song.chords); }, [song]);

  const handleSaveCorrection = () => {
    if (song) {
      updateSong(song.id, { chords: editedContent });
      setIsEditing(false);
      toast.success("Letra y notas actualizadas");
    }
  };

  const sharedConfig = useMemo(() => {
    const sc = searchParams.get('sc');
    return sc ? decodeShareConfig(sc) : null;
  }, [searchParams]);

  // Parámetros explícitos de deep-link: ?transpose=+2&vocal=soprano
  const sharedTranspose = useMemo(() => {
    const t = searchParams.get('transpose');
    if (t === null) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const sharedVocal = useMemo(() => searchParams.get('vocal') || null, [searchParams]);

  // Settings sincronizados con la nube (autosave + botón guardar)
  const { settings, setSettings, saveNow, isSaving, lastSavedAt, isLoaded: settingsLoaded } = useSongSettings(effectiveSongId ?? undefined);
  const safeSettings = settings ?? EMPTY_SONG_SETTINGS;
  const vocalRegister = safeSettings.vocalRegister as VocalRegister | '';
  const setVocalRegister = (v: VocalRegister | '') => setSettings(s => ({ ...s, vocalRegister: v }));
  const genderShift = safeSettings.genderShift as '' | 'male' | 'female';
  const setGenderShift = (g: '' | 'male' | 'female' | ((p: any) => any)) => {
    if (typeof g === 'function') setSettings(s => ({ ...s, genderShift: (g as any)(s.genderShift) }));
    else setSettings(s => ({ ...s, genderShift: g }));
  };
  const customSemitones = safeSettings.customSemitones;
  const setCustomSemitones = (v: number | ((prev: number) => number)) => {
    setSettings(s => ({ ...s, customSemitones: typeof v === 'function' ? (v as any)(s.customSemitones) : v }));
  };
  const fontSize = safeSettings.fontSize;
  const setFontSize = (v: number | ((prev: number) => number)) => {
    setSettings(s => ({ ...s, fontSize: typeof v === 'function' ? (v as any)(s.fontSize) : v }));
  };
  const ytDelayMs = safeSettings.ytDelayMs;
  const setYtDelayMs = (v: number | ((prev: number) => number)) => {
    setSettings(s => ({ ...s, ytDelayMs: typeof v === 'function' ? (v as any)(s.ytDelayMs) : v }));
  };

  // Si llega ?sc=... (compartido), aplicamos esa transposición una sola vez al cargar
  useEffect(() => {
    if (sharedConfig?.semitones != null && settingsLoaded && settings) {
      setCustomSemitones(sharedConfig.semitones);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, sharedConfig?.semitones]);

  // Aplicar deep-link de transposición / registro vocal una vez cargado
  useEffect(() => {
    if (!settingsLoaded || !settings) return;
    if (sharedTranspose !== null) setCustomSemitones(sharedTranspose);
    if (sharedVocal) setVocalRegister(sharedVocal as VocalRegister);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, sharedTranspose, sharedVocal]);

  const [useAmerican, setUseAmerican] = useState(true);
  const [showAddToList, setShowAddToList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [modeSwapped, setModeSwapped] = useState(false);
  const [youtubePeekVisible, setYoutubePeekVisible] = useState(false);
  const [youtubePickerOpen, setYoutubePickerOpen] = useState(false);
  const [sectionsPickerOpen, setSectionsPickerOpen] = useState(false);

  const isMobileViewport = useIsMobileViewport();
  const { controlsHidden, hideControls, showControls } = useMobileControlsChrome();
  useSongRouteViewportBurst();
  const isLandscape = useIsLandscape();
  const {
    mobileStageMode,
    setMobileStageMode,
    autoHideControls,
    setAutoHideControls,
  } = useMobileStageSettings();
  const isMobileStageActive = mobileStageMode && isMobileViewport;

  const {
    registerSemitones,
    genderSemitones,
    effectiveSemitones,
    displayKey,
    displayOriginalKey,
    useFlats,
    capoInfo,
    displayCapoPlayAs,
  } = useTransposeEngine({
    song,
    vocalRegister,
    genderShift,
    customSemitones,
    modeSwapped,
    useAmerican,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('musician');
  const [songViewPreference, setSongViewPreference] = useSongViewPreference();
  const isLyricsOnlyPreference = songViewPreference === 'lyrics-only';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenFontSize, setFullscreenFontSize] = useState(20);

  const { controlsVisible, bumpControls } = useAutoHideControls(
    isMobileStageActive && autoHideControls && !isEditing
  );
  useWakeLock(isMobileStageActive || (isFullscreen && isMobileViewport));

  const [activeSectionAnchor, setActiveSectionAnchor] = useState('');
  const [followDirector, setFollowDirector] = useState(() => readFollowDirector());
  const followDirectorRef = useRef(followDirector);
  useEffect(() => {
    followDirectorRef.current = followDirector;
  }, [followDirector]);
  const [liveNote, setLiveNote] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingSectionAnchorRef = useRef<string | null>(null);
  const lastSongOnlySyncKeyRef = useRef<string | null>(null);

  const getSongViewFollowGuard = useCallback(
    (listId?: string | null) =>
      getFollowerSongViewSyncGuard(location.pathname, {
        role: sessionConnection?.role ?? null,
        followDirector: followDirectorRef.current,
        listId: listId ?? incomingListId ?? null,
      }),
    [location.pathname, sessionConnection?.role, incomingListId]
  );

  const logSongviewBlock = useCallback(
    (
      reason: string,
      detail: { listId?: string | null; remoteIndex?: number | null; songId?: string | null }
    ) => {
      const guard = getSongViewFollowGuard(detail.listId);
      if (!blockSongViewScrollEffects(guard)) return;
      followTrace('FOLLOW_SONGVIEW_GUARD', {
        actor: 'spectator',
        page: 'song-view',
        currentRoute: location.pathname,
        remoteSongId: detail.songId ?? undefined,
        remoteIndex: detail.remoteIndex ?? undefined,
        localSongId: id ?? undefined,
        reason,
        extra: {
          blockedScroll: guard.disableScrollSync,
          disableSectionSync: guard.disableSectionSync,
        },
      });
      followSongviewLockLog({
        reason,
        pathname: location.pathname,
        remoteIndex: detail.remoteIndex ?? null,
        songId: detail.songId ?? id ?? null,
      });
      followSongviewBlockLog({
        reason,
        pathname: location.pathname,
        remoteIndex: detail.remoteIndex ?? null,
        songId: detail.songId ?? id ?? null,
        disableSectionSync: guard.disableSectionSync,
        disableAnchorRestore: guard.disableAnchorRestore,
        disableScrollSync: guard.disableScrollSync,
      });
      pendingSectionAnchorRef.current = null;
    },
    [getSongViewFollowGuard, location.pathname, id]
  );

  const navigateFollowerSongOnly = useCallback(
    (
      songId: string,
      navState: object,
      opts: { listId?: string | null; remoteIndex?: number | null; reason: string }
    ) => {
      if (shouldDisableLegacyFollowPipeline('follower')) return;
      const guard = getSongViewFollowGuard(opts.listId);
      followTrace('FOLLOW_SONGVIEW_GUARD', {
        actor: 'spectator',
        page: 'song-view',
        currentRoute: location.pathname,
        targetRoute: songPath(songId),
        remoteSongId: songId,
        remoteIndex: opts.remoteIndex ?? undefined,
        localSongId: id ?? undefined,
        reason: opts.reason,
        extra: {
          blockedScroll: guard.disableScrollSync,
          guardActive: guard.active,
        },
      });
      if (!guard.active) {
        followTrace('FOLLOW_ROUTE_DECISION', {
          actor: 'spectator',
          page: 'song-view',
          currentRoute: location.pathname,
          targetRoute: songPath(songId),
          source: 'navigateFollowerSongOnly',
          reason: 'guard-inactive-navigate',
          extra: { blocked: false },
        });
        navigate(songPath(songId), { state: navState });
        return;
      }
      const key = `${songId}|${opts.remoteIndex ?? ''}`;
      followTrace('FOLLOW_ROUTE_DECISION', {
        actor: 'spectator',
        page: 'song-view',
        currentRoute: location.pathname,
        targetRoute: songPath(songId),
        source: 'navigateFollowerSongOnly',
        reason: 'song-only-sync',
        extra: { blocked: false, retainLive: false },
      });
      logSongviewBlock(opts.reason, {
        listId: opts.listId,
        remoteIndex: opts.remoteIndex,
        songId,
      });
      if (id === songId || lastSongOnlySyncKeyRef.current === key) {
        return;
      }
      lastSongOnlySyncKeyRef.current = key;
      navigate(songPath(songId), { state: navState });
    },
    [getSongViewFollowGuard, id, navigate, logSongviewBlock]
  );
  const lastSeqRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const sessionHydrationRef = useRef(false);
  const lastPublishedSongRef = useRef<string | null>(null);

  const getChordScrollRoot = useCallback(() => {
    return (isFullscreen ? fullscreenScrollRef.current : scrollRef.current) ?? document;
  }, [isFullscreen]);

  const directorListSongIds = useMemo(() => {
    if (incomingListSongIds?.length) return incomingListSongIds;
    if (incomingListId) {
      return lists.find((l) => l.id === incomingListId)?.songIds ?? [];
    }
    return [];
  }, [incomingListId, incomingListSongIds, lists]);

  const pageSessionContext = useMemo(
    () => ({
      songId: song?.id,
      listId: incomingListId,
      listSongIds: directorListSongIds,
      listName: liveList?.name,
    }),
    [song?.id, incomingListId, directorListSongIds, liveList?.name]
  );

  const sessionOriginMismatch = useSessionOriginMismatch(pageSessionContext);
  useReportSessionPageContext(pageSessionContext);

  const publishDirectorSharedState = useCallback(
    (opts?: { immediate?: boolean; sectionAnchor?: string; navigationRedirect?: boolean }) => {
      if (!liveIsDirector || !sessionConnection || sessionConnection.role !== 'director' || !song?.id) {
        return;
      }

      const publishViewMode = resolveSharedViewMode(
        viewMode,
        incomingListId,
        directorListSongIds
      );
      const listIndex =
        directorListSongIds.length > 0 ? directorListSongIds.indexOf(song.id) : -1;
      const anchor = opts?.sectionAnchor ?? activeSectionAnchor;

      const payload = {
        sessionId: sessionConnection.sessionCode,
        currentSongId: song.id,
        ...(listIndex >= 0 ? { currentIndex: listIndex } : {}),
        listId: incomingListId ?? null,
        ...(directorListSongIds.length > 0 ? { listSongIds: directorListSongIds } : {}),
        customSemitones,
        genderShift: toSharedGenderShift(genderShift),
        viewMode: publishViewMode,
        ...(anchor ? { sharedSectionAnchor: anchor } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (publishViewMode === 'continuous') {
        logContinuousPublish(payload);
      }
      publishSharedSessionIfDirector(sessionConnection.sessionCode, payload, {
        immediate: opts?.immediate,
        navigationRedirect: opts?.navigationRedirect,
      });
    },
    [
      liveIsDirector,
      sessionConnection,
      publishSharedSessionIfDirector,
      song?.id,
      viewMode,
      incomingListId,
      directorListSongIds,
      customSemitones,
      genderShift,
      activeSectionAnchor,
    ]
  );

  const handleDirectorSessionEstablished = useCallback(
    (code: string) => {
      toast.success(`Sesión iniciada: ${code}`);
      publishDirectorSharedState({ immediate: true });
    },
    [publishDirectorSharedState]
  );

  const handleRequestSharedSessionPublish = useCallback(() => {
    publishDirectorSharedState({ immediate: true });
  }, [publishDirectorSharedState]);

  const handleDirectorSectionAnchor = useCallback(
    (anchorId: string) => {
      if (!anchorId) return;
      setActiveSectionAnchor(anchorId);
      scrollToSectionAnchor(anchorId, getChordScrollRoot());
      publishDirectorSharedState({ immediate: true, sectionAnchor: anchorId });
    },
    [getChordScrollRoot, publishDirectorSharedState]
  );

  const handleSectionClick = useCallback(
    (anchorId: string, _sectionKey: string) => {
      if (sessionConnection?.role === 'director') {
        handleDirectorSectionAnchor(anchorId);
        return;
      }
      const guard = getSongViewFollowGuard(incomingListId);
      if (blockSongViewScrollEffects(guard)) {
        logSongviewBlock('section-click', { listId: incomingListId, songId: id ?? null });
        return;
      }
      setActiveSectionAnchor(anchorId);
      scrollToSectionAnchor(anchorId, getChordScrollRoot());
    },
    [
      sessionConnection?.role,
      handleDirectorSectionAnchor,
      getChordScrollRoot,
      getSongViewFollowGuard,
      incomingListId,
      logSongviewBlock,
      id,
    ]
  );

  const handleSectionRef = useCallback((anchorId: string, _sectionKey: string, el: HTMLDivElement | null) => {
    sectionRefs.current[anchorId] = el;
  }, []);

  const [tips, setTips] = useState(sharedConfig?.tips || '');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);

  const {
    metronomeBpm,
    setMetronomeBpm,
    metronomeActive,
    beatCount,
    bpmFlash,
    setBpmFlash,
    startMetronome,
    stopMetronome,
  } = useMetronome();

  const {
    youtubeUrl,
    setYoutubeUrl,
    showYoutube,
    setShowYoutube,
    youtubePlaying,
    setYoutubePlaying,
    youtubeSeek,
    setYoutubeSeek,
    youtubeDuration,
    youtubeIframeRef,
    youtubeEmbedId,
    ytPostMessage,
  } = useYouTubePlayer({
    ytDelayMs,
    onVideoPlay: startMetronome,
    onVideoPause: stopMetronome,
  });

  const {
    autoScrolling,
    setAutoScrolling,
    scrollSpeed,
    setScrollSpeed,
    smartScroll,
    setSmartScroll,
  } = useAutoScroll({ isFullscreen, fullscreenScrollRef, youtubeDuration });

  const lastSongIdForYoutubeRef = useRef<string | undefined>();
  const youtubePersistTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Hidratar YouTube persistido al abrir/cambiar de canción (canciones antiguas: sin URL)
  useEffect(() => {
    if (!song) return;
    const persisted = song.youtubeUrl?.trim() ?? '';
    const songChanged = lastSongIdForYoutubeRef.current !== song.id;
    lastSongIdForYoutubeRef.current = song.id;

    if (songChanged) {
      setYoutubeUrl(persisted);
      setShowYoutube(!!persisted);
      return;
    }
    if (persisted) {
      setYoutubeUrl((prev) => {
        if (!prev) {
          setShowYoutube(true);
          return persisted;
        }
        return prev;
      });
    }
  }, [song?.id, song?.youtubeUrl, setYoutubeUrl, setShowYoutube]);

  useEffect(() => {
    return () => {
      if (youtubePersistTimerRef.current) clearTimeout(youtubePersistTimerRef.current);
    };
  }, []);

  const handleYoutubeUrlChange = useCallback(
    (url: string) => {
      setYoutubeUrl(url);
      if (!song?.id) return;
      if (youtubePersistTimerRef.current) clearTimeout(youtubePersistTimerRef.current);
      youtubePersistTimerRef.current = setTimeout(() => {
        const trimmed = url.trim();
        updateSong(song.id, { youtubeUrl: trimmed || undefined });
      }, 700);
    },
    [song?.id, setYoutubeUrl, updateSong]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
      if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(f => !f); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const handleResetOriginal = useCallback(() => {
    setVocalRegister('');
    setGenderShift('');
    setCustomSemitones(0);
    setModeSwapped(false);
    if (id) clearUserSemitones(id);
    toast.success('Tono original restaurado');
  }, [id, setVocalRegister, setGenderShift, setCustomSemitones]);

  const handleVocalRegisterChange = useCallback(
    (register: VocalRegister | '') => {
      setVocalRegister(register);
      setCustomSemitones(0);
      if (register && song) {
        const opt = getOptimalSemitonesForRegister(song.originalKey, register);
        toast.success(`${VOCAL_REGISTERS.find((r) => r.id === register)?.label ?? register}: ${opt > 0 ? '+' : ''}${opt} semitonos`);
      }
    },
    [song, setVocalRegister, setCustomSemitones]
  );

  const handleGenderShiftToggle = useCallback(
    (gender: 'male' | 'female') => {
      setGenderShift((g) => (g === gender ? '' : gender));
    },
    [setGenderShift]
  );

  const handleWorshipGenderToggle = useCallback(() => {
    setGenderShift((g) => (g === 'male' ? 'female' : 'male'));
  }, [setGenderShift]);

  const handleWorshipGenderSelect = useCallback(
    (g: '' | 'male' | 'female') => {
      if (g === '') handleResetOriginal();
      else setGenderShift(g);
    },
    [handleResetOriginal, setGenderShift]
  );

  const handleAdminSetOriginalGender = useCallback(
    async (g: 'male' | 'female') => {
      if (!song) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return toast.error('Sesión requerida');
        const { error } = await supabase
          .from('app_songs')
          .upsert(
            {
              song_id: song.id,
              original_gender: g,
              original_key: song.originalKey,
              scale_mode: song.scaleMode,
              updated_by: session.user.id,
            },
            { onConflict: 'song_id' }
          );
        if (error) {
          console.error('app_songs upsert:', error);
          toast.error(`No se pudo guardar: ${error.message}`);
        } else {
          updateSong(song.id, { originalGender: g });
          toast.success(`Género original guardado: ${g === 'male' ? 'Hombre' : 'Mujer'}`);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error');
      }
    },
    [song, updateSong]
  );

  const handleToggleMetronome = useCallback(() => {
    if (metronomeActive) stopMetronome();
    else startMetronome();
  }, [metronomeActive, startMetronome, stopMetronome]);

  const handleBpmChange = useCallback(
    (bpm: number) => {
      setMetronomeBpm(bpm);
      if (metronomeActive) stopMetronome();
    },
    [metronomeActive, setMetronomeBpm, stopMetronome]
  );

  const handleYoutubePlayPause = useCallback(() => {
    const next = !youtubePlaying;
    setYoutubePlaying(next);
    ytPostMessage(next ? 'playVideo' : 'pauseVideo');
  }, [youtubePlaying, setYoutubePlaying, ytPostMessage]);

  const handleOpenYoutubePlayer = useCallback(() => {
    if (!youtubeEmbedId) return;
    setShowYoutube(true);
    if (isMobileStageActive) {
      setYoutubePeekVisible((v) => !v);
    }
  }, [youtubeEmbedId, isMobileStageActive, setShowYoutube]);

  const handleSmartYoutubeClick = useCallback(() => {
    try {
      ytDiagLog('open picker click', { hasEmbed: !!youtubeEmbedId });
      if (youtubeEmbedId) {
        handleOpenYoutubePlayer();
        return;
      }
      if (!isYoutubeQuickPickerAvailable()) {
        ytDiagLog('picker blocked (diag stage)', getYtDiagStage());
        toast.info(
          'Selector YouTube desactivado en esta etapa de diagnóstico. Usa VITE_YT_DIAG_STAGE ≥ 3 o quita la variable.'
        );
        return;
      }
      setYoutubePickerOpen(true);
    } catch (e) {
      console.error('[YT] handleSmartYoutubeClick', e);
      toast.error('No se pudo abrir el selector de YouTube');
    }
  }, [youtubeEmbedId, handleOpenYoutubePlayer]);

  const handleYoutubeVideoSelected = useCallback(
    (video: YouTubeVideoResult) => {
      if (youtubePersistTimerRef.current) clearTimeout(youtubePersistTimerRef.current);
      const url = (video?.url ?? '').trim();
      if (!url) {
        toast.error('El video seleccionado no tiene URL válida');
        return;
      }
      ytDiagLog('video selected', video.id, url);
      setYoutubeUrl(url);
      setShowYoutube(true);
      setYoutubePickerOpen(false);
      if (song?.id) updateSong(song.id, { youtubeUrl: url });
      if (isMobileStageActive) setYoutubePeekVisible(true);
      toast.success('Video de YouTube vinculado');
    },
    [song?.id, setYoutubeUrl, setShowYoutube, updateSong, isMobileStageActive]
  );

  const handleMobileYoutubeToggle = useCallback(() => {
    bumpControls();
    handleSmartYoutubeClick();
  }, [bumpControls, handleSmartYoutubeClick]);

  const songSections = useMemo(() => listChordSections(song?.chords), [song?.chords]);

  const handleScrollToTop = useCallback(() => {
    bumpControls();
    const root = isFullscreen ? fullscreenScrollRef.current : scrollRef.current;
    root?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isFullscreen, bumpControls]);

  const handleJumpSection = useCallback(
    (label: string, occurrence = 0) => {
      bumpControls();
      const anchorId =
        anchorIdForSectionLabel(label, song?.chords, occurrence) ?? label;
      if (sessionConnection?.role === 'director') {
        handleDirectorSectionAnchor(anchorId);
      } else {
        const guard = getSongViewFollowGuard(incomingListId);
        if (blockSongViewScrollEffects(guard)) {
          logSongviewBlock('jump-section', { listId: incomingListId, songId: id ?? null });
        } else {
          setActiveSectionAnchor(anchorId);
          scrollToSectionAnchor(anchorId, getChordScrollRoot());
        }
      }
      setSectionsPickerOpen(false);
    },
    [
      bumpControls,
      song?.chords,
      sessionConnection?.role,
      handleDirectorSectionAnchor,
      getChordScrollRoot,
      getSongViewFollowGuard,
      incomingListId,
      logSongviewBlock,
      id,
    ]
  );

  const handleFollowDirectorChange = useCallback(
    (value: boolean) => {
      setFollowDirector(value);
      setFollowDirectorPreference(value);
      if (isPassiveSpectatorMode(value)) {
        followDirectorLog('passive mode enabled');
      } else {
        followDirectorLog('passive mode disabled');
      }
    },
    [setFollowDirectorPreference]
  );

  const handleSessionRecovered = useCallback(
    (state: SessionRecoveryState, meta: SessionRecoveryMeta) => {
      sessionHydrationRef.current = true;
      applyingRemoteRef.current = true;
      try {
        sessionRecoveryLog('hydrate session', { code: meta.code, role: meta.role });

        if (meta.role === 'director') {
          if (state.listId && state.listSongIds.length > 0) {
            persistContinuousListSync(state.listId, state.listSongIds);
          }
          if (settingsLoaded && state.songId) {
            setCustomSemitones(state.semitones);
          }
          const localGender = localGenderFromRecovery(state);
          if (localGender !== genderShift) {
            setGenderShift(localGender);
          }
          sessionRecoveryLog('director recovery: local state only, no navigation');
          return;
        }

        if (meta.role === 'follower' && shouldDisableLegacyFollowPipeline('follower')) {
          return;
        }

        const shouldFollowNavigation = readFollowDirector();

        if (shouldFollowNavigation && state.listId && state.listSongIds.length > 0) {
          persistContinuousListSync(state.listId, state.listSongIds);
        }

        if (settingsLoaded && state.songId) {
          setCustomSemitones(state.semitones);
          sessionRecoveryLog('restore transpose', {
            songId: state.songId,
            semitones: state.semitones,
          });
        }

        const localGender = localGenderFromRecovery(state);
        if (localGender !== genderShift) {
          setGenderShift(localGender);
        }

        if (!shouldFollowNavigation) {
          followDirectorLog('passive mode enabled');
          followDirectorLog('skipping navigation sync');
          followDirectorLog('applying transpose only', {
            songId: state.songId,
            semitones: state.semitones,
          });
          return;
        }

        if (state.bpm != null) {
          setMetronomeBpm(state.bpm);
        }

        const wantsContinuous = isContinuousRecoveryReady(state);

        if (wantsContinuous && state.listId && hasManualExitContinuous(state.listId)) {
          sessionRecoveryLog('skipped continuous restore (manual exit)', {
            listId: state.listId,
          });
          if (meta.role === 'director') {
            setViewMode('musician');
          }
        } else if (wantsContinuous && state.listId && meta.role === 'follower' && state.songId) {
          followViewmodeLog({
            reason: 'follower retained preferred mode',
            context: 'session-recovered',
            songId: state.songId,
          });
          sessionRecoveryLog('navigate song (follower, director continuous)', {
            songId: state.songId,
          });
          followViewLog({ reason: 'songview-song-only-sync', mode: 'song', action: 'sync-song-only' });
          navigateFollowerSongOnly(
            state.songId,
            {
              listId: state.listId,
              listSongIds: state.listSongIds,
              joinSessionCode: meta.code,
              currentIndex: state.currentIndex,
              fromContinuous: true,
            },
            {
              listId: state.listId,
              remoteIndex: state.currentIndex ?? null,
              reason: 'session-recovered:director-continuous',
            }
          );
          return;
        } else if (
          wantsContinuous &&
          state.listId &&
          meta.role === 'follower' &&
          !isFollowerContinuousEnabled(shouldFollowNavigation)
        ) {
          if (state.songId) {
            navigateFollowerSongViewOnly({
              navigate,
              followDirector: shouldFollowNavigation,
              songId: state.songId,
              remoteIndex: state.currentIndex,
              listId: state.listId,
              listSongIds: state.listSongIds,
              joinSessionCode: meta.code,
            });
          }
          return;
        } else if (wantsContinuous && state.listId) {
          sessionRecoveryLog('navigate live', { listId: state.listId });
          navigate(`/setlist/${state.listId}/live`, {
            state: {
              listId: state.listId,
              listSongIds: state.listSongIds,
              joinSessionCode: meta.code,
              initialSongId: state.songId ?? undefined,
              initialIndex: state.currentIndex,
            },
          });
          return;
        }

        {
          const resolvedView = resolveSharedViewMode(
            state.viewMode,
            state.listId,
            state.listSongIds
          );

          if (resolvedView !== viewMode) {
            setViewMode(resolvedView);
          }

          if (state.songId && state.songId !== id) {
            sessionRecoveryLog('navigate song', { songId: state.songId });
            const songViewOnly =
              meta.role === 'follower' &&
              isFollowerSongViewOnlySync(location.pathname, state.listId);
            if (songViewOnly) {
              followViewLog({ reason: 'songview-song-only-sync', mode: 'song' });
              navigateFollowerSongOnly(
                state.songId,
                state.listId
                  ? { listId: state.listId, listSongIds: state.listSongIds, joinSessionCode: meta.code }
                  : { joinSessionCode: meta.code },
                {
                  listId: state.listId,
                  remoteIndex: state.currentIndex ?? null,
                  reason: 'session-recovered:song-change',
                }
              );
            } else {
              navigate(songPath(state.songId), {
                state: state.listId
                  ? { listId: state.listId, listSongIds: state.listSongIds, joinSessionCode: meta.code }
                  : { joinSessionCode: meta.code },
              });
            }
            return;
          }

          if (
            state.viewMode === 'continuous'
          ) {
            pendingSectionAnchorRef.current = null;
            if (state.sharedSectionAnchor) {
              sessionRecoveryLog('skip continuous section restore', state.sharedSectionAnchor);
            }
          } else if (
            shouldApplyRemoteSectionAnchor(
              followDirectorRef.current,
              state.viewMode
            ) &&
            state.sharedSectionAnchor &&
            !getSongViewFollowGuard(state.listId).disableSectionSync
          ) {
            setActiveSectionAnchor(state.sharedSectionAnchor);
            pendingSectionAnchorRef.current = state.sharedSectionAnchor;
            sessionRecoveryLog('restore anchor', state.sharedSectionAnchor);
          }
        }
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false;
          sessionHydrationRef.current = false;
        });
      }
    },
    [
      settingsLoaded,
      genderShift,
      followDirector,
      viewMode,
      id,
      navigate,
      setCustomSemitones,
      setMetronomeBpm,
      location.pathname,
      navigateFollowerSongOnly,
      getSongViewFollowGuard,
      logSongviewBlock,
    ]
  );

  const handleSharedSessionUpdate = useCallback(
    (state: SharedSessionState) => {
      if (shouldDisableLegacyFollowPipeline('follower')) return;

      const following = followDirectorRef.current;
      followTrace('FOLLOW_SHARED_RECEIVE', {
        actor: 'spectator',
        page: 'song-view',
        sessionCode: state.sessionId ?? sessionConnection?.sessionCode ?? undefined,
        currentRoute: location.pathname,
        remoteSongId: state.currentSongId ?? undefined,
        remoteIndex: state.currentIndex ?? undefined,
        localSongId: id ?? undefined,
        source: 'handleSharedSessionUpdate',
        extra: {
          viewMode: state.viewMode,
          followDirector: following,
          sectionAnchor: state.sharedSectionAnchor ?? null,
        },
      });
      auditEventLog({
        source: 'SongViewPage',
        action: 'shared-session-receive',
        sessionCode: state.sessionId ?? sessionConnection?.sessionCode ?? null,
        songId: state.currentSongId ?? null,
        remoteIndex: state.currentIndex ?? null,
        pathname: location.pathname,
        extra: {
          followDirector: following,
          viewMode: state.viewMode,
          sectionAnchor: state.sharedSectionAnchor ?? null,
        },
      });
      sessionSyncLog('payload received', {
        currentSongId: state.currentSongId,
        viewMode: state.viewMode,
        currentIndex: state.currentIndex,
        listId: state.listId,
      });
      sessionSyncLog('followDirector state', { followDirector: following });

      if (settingsLoaded && state.customSemitones !== customSemitones) {
        setCustomSemitones(state.customSemitones);
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
        followDirectorLog('applying transpose only', {
          songId: state.currentSongId,
          semitones: state.customSemitones,
          genderShift: state.genderShift,
        });
        followDirectorLog('skipping navigation sync');
        return;
      }

      if (shouldDisableLegacyFollowPipeline('follower')) return;

      applyingRemoteRef.current = true;
      try {
        const remoteListSongIds = resolveRemoteListSongIds(state, lists);
        const resolvedViewMode = resolveSharedViewMode(
          state.viewMode,
          state.listId,
          remoteListSongIds
        );

        const wantsContinuous =
          resolvedViewMode === 'continuous' &&
          !!state.listId &&
          remoteListSongIds.length > 1;

        const navigateFollowerToLive = (ids: string[]) => {
          if (!state.listId) return;
          persistContinuousListSync(state.listId, ids);
          const livePath = `/setlist/${state.listId}/live`;
          const sessionCode =
            sessionConnection?.sessionCode ?? joinSessionCode ?? undefined;
          if (location.pathname !== livePath) {
            continuousSyncLog('navigate follower to live', {
              listId: state.listId,
              currentIndex: state.currentIndex,
              currentSongId: state.currentSongId,
              listSongIds: ids,
            });
            sessionRecoveryLog('navigate live', { listId: state.listId, count: ids.length });
            sessionSyncLog('navigation applied', {
              type: 'continuous',
              listId: state.listId,
              currentSongId: state.currentSongId,
            });
            navigate(livePath, {
              state: {
                listId: state.listId,
                listSongIds: ids,
                joinSessionCode: sessionCode,
                initialSongId: state.currentSongId ?? undefined,
                initialIndex: state.currentIndex,
                currentIndex: state.currentIndex,
              },
            });
          }
        };

        if (wantsContinuous && hasManualExitContinuous(state.listId)) {
          sessionRecoveryLog('skipped continuous sync (manual exit)', { listId: state.listId });
          if (sessionConnection?.role === 'director') {
            setViewMode('musician');
          }
          return;
        }

        if (wantsContinuous && sessionConnection?.role === 'follower') {
          followViewmodeLog({
            reason: 'follower preferred view retained',
            context: 'shared-session-update',
            songId: state.currentSongId,
            listId: state.listId,
          });
          if (isFollowerInContinuousMode(location.pathname, state.listId)) {
            followViewLog({ mode: 'continuous', action: 'sync-inside-live' });
            return;
          }
          followViewLog({ reason: 'songview-song-only-sync', mode: 'song', action: 'sync-song-only' });
          if (state.listId && remoteListSongIds.length > 0) {
            persistContinuousListSync(state.listId, remoteListSongIds);
          }
          if (state.currentSongId && state.currentSongId !== id) {
            sessionSyncLog('navigation applied', {
              type: 'song',
              songId: state.currentSongId,
              currentIndex: state.currentIndex,
            });
            navigateFollowerSongOnly(
              state.currentSongId,
              {
                ...(state.listId ? { listId: state.listId } : {}),
                listSongIds: remoteListSongIds.length > 0 ? remoteListSongIds : state.listSongIds,
                ...(typeof state.currentIndex === 'number'
                  ? { currentIndex: state.currentIndex }
                  : {}),
                joinSessionCode:
                  sessionConnection?.sessionCode ?? effectiveJoinCode ?? undefined,
                fromContinuous: true,
              },
              {
                listId: state.listId,
                remoteIndex: state.currentIndex ?? null,
                reason: 'shared-session:director-continuous-song-only',
              }
            );
            return;
          }
          logSongviewBlock('shared-session:director-continuous-hold', {
            listId: state.listId,
            remoteIndex: state.currentIndex ?? null,
            songId: state.currentSongId ?? id ?? null,
          });
          return;
        }

        if (
          wantsContinuous &&
          sessionConnection?.role === 'follower' &&
          !isFollowerContinuousEnabled(following)
        ) {
          if (state.currentSongId) {
            navigateFollowerSongViewOnly({
              navigate,
              followDirector: following,
              songId: state.currentSongId,
              remoteIndex: state.currentIndex,
              listId: state.listId,
              listSongIds: remoteListSongIds,
              joinSessionCode:
                sessionConnection?.sessionCode ?? effectiveJoinCode ?? undefined,
            });
          }
          return;
        }

        if (wantsContinuous) {
          if (remoteListSongIds.length > 1) {
            navigateFollowerToLive(remoteListSongIds);
            return;
          }
          const sessionCode = sessionConnection?.sessionCode ?? joinSessionCode;
          if (sessionCode && state.listId) {
            void fetchLiveSessionList(sessionCode).then((payload) => {
              if (payload?.listSongIds && payload.listSongIds.length > 1) {
                navigateFollowerToLive(payload.listSongIds);
              }
            });
          }
          return;
        }

        if (
          resolvedViewMode !== viewMode &&
          sessionConnection?.role !== 'follower'
        ) {
          setViewMode(resolvedViewMode);
        }

        const songViewGuard = getSongViewFollowGuard(state.listId);

        if (state.currentSongId && state.currentSongId !== id) {
          const navListIds =
            remoteListSongIds.length > 0
              ? remoteListSongIds
              : state.listSongIds?.length
                ? state.listSongIds
                : undefined;
          sessionSyncLog('navigation applied', {
            type: 'song',
            songId: state.currentSongId,
            currentIndex: state.currentIndex,
          });
          if (songViewGuard.active) {
            followViewLog({ reason: 'songview-song-only-sync', mode: 'song', action: 'sync-song-only' });
            navigateFollowerSongOnly(
              state.currentSongId,
              {
                ...(state.listId ? { listId: state.listId } : {}),
                ...(navListIds ? { listSongIds: navListIds } : {}),
                ...(typeof state.currentIndex === 'number'
                  ? { currentIndex: state.currentIndex }
                  : {}),
                joinSessionCode:
                  sessionConnection?.sessionCode ?? effectiveJoinCode ?? undefined,
              },
              {
                listId: state.listId,
                remoteIndex: state.currentIndex ?? null,
                reason: 'shared-session:song-change',
              }
            );
          } else {
            navigate(songPath(state.currentSongId), {
              state: {
                ...(state.listId ? { listId: state.listId } : {}),
                ...(navListIds ? { listSongIds: navListIds } : {}),
                ...(typeof state.currentIndex === 'number'
                  ? { currentIndex: state.currentIndex }
                  : {}),
                joinSessionCode:
                  sessionConnection?.sessionCode ?? effectiveJoinCode ?? undefined,
              },
            });
          }
          return;
        }

        if (resolvedViewMode === 'continuous') {
          pendingSectionAnchorRef.current = null;
          if (state.sharedSectionAnchor) {
            logSongviewBlock('director-continuous-section-hard-disable', {
              listId: state.listId,
              remoteIndex: state.currentIndex ?? null,
              songId: state.currentSongId ?? id ?? null,
              anchor: state.sharedSectionAnchor,
              viewMode: resolvedViewMode,
              following,
            });
          }
        } else if (
          shouldApplyRemoteSectionAnchor(following, resolvedViewMode) &&
          state.sharedSectionAnchor &&
          !blockSongViewScrollEffects(songViewGuard)
        ) {
          sessionSyncLog('navigation applied', {
            type: 'section',
            anchor: state.sharedSectionAnchor,
          });
          setActiveSectionAnchor(state.sharedSectionAnchor);
          if (!scrollToSectionAnchor(state.sharedSectionAnchor, getChordScrollRoot())) {
            pendingSectionAnchorRef.current = state.sharedSectionAnchor;
          } else {
            pendingSectionAnchorRef.current = null;
          }
        } else if (state.sharedSectionAnchor) {
          logSongviewBlock('shared-session:section-anchor-skipped', {
            listId: state.listId,
            remoteIndex: state.currentIndex ?? null,
            songId: state.currentSongId ?? id ?? null,
            anchor: state.sharedSectionAnchor,
            viewMode: resolvedViewMode,
            following,
          });
        }
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false;
        });
      }
    },
    [
      settingsLoaded,
      customSemitones,
      genderShift,
      viewMode,
      id,
      location.pathname,
      lists,
      navigate,
      setCustomSemitones,
      setGenderShift,
      joinSessionCode,
      effectiveJoinCode,
      sessionConnection?.sessionCode,
      sessionConnection?.role,
      getChordScrollRoot,
      getSongViewFollowGuard,
      navigateFollowerSongOnly,
      logSongviewBlock,
    ]
  );

  useEffect(() => {
    const pending = pendingSectionAnchorRef.current;
    if (!pending || !followDirector || !song?.chords) return;
    if (
      !shouldApplyRemoteSectionAnchor(
        followDirector,
        spectator.directorSharedViewMode ?? viewMode
      )
    ) {
      pendingSectionAnchorRef.current = null;
      logSongviewBlock('pending-anchor-director-continuous', {
        listId: incomingListId,
        songId: id ?? null,
        viewMode: spectator.directorSharedViewMode ?? viewMode,
      });
      return;
    }
    const guard = getSongViewFollowGuard(incomingListId);
    if (blockSongViewScrollEffects(guard)) {
      logSongviewBlock('pending-anchor-restore', {
        listId: incomingListId,
        songId: id ?? null,
      });
      return;
    }
    const t = window.setTimeout(() => {
      setActiveSectionAnchor(pending);
      if (scrollToSectionAnchor(pending, getChordScrollRoot())) {
        pendingSectionAnchorRef.current = null;
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [
    id,
    followDirector,
    song?.chords,
    getChordScrollRoot,
    getSongViewFollowGuard,
    incomingListId,
    logSongviewBlock,
    spectator.directorSharedViewMode,
    viewMode,
  ]);

  const handleSessionUpdate = useCallback((state: SessionState) => {
    if (shouldDisableLegacyFollowPipeline('follower')) return;

    sessionSyncLog('legacy sync handler', {
      songId: state.songId,
      seq: state.seq,
      followDirector: followDirectorRef.current,
    });

    if (state.seq != null) {
      if (state.seq <= lastSeqRef.current) return;
      lastSeqRef.current = state.seq;
    }

    if (settingsLoaded && settings && settings.customSemitones !== state.semitones) {
      setCustomSemitones(state.semitones);
      sessionSyncLog('transpose applied', { songId: state.songId, semitones: state.semitones });
    }

    if (followDirectorRef.current && state.songId && state.songId !== id) {
      sessionSyncLog('navigation applied', { type: 'legacy-song', songId: state.songId });
      const guard = getSongViewFollowGuard(state.listId ?? incomingListId);
      if (guard.active) {
        navigateFollowerSongOnly(
          state.songId,
          incomingListSongIds || state.listSongIds
            ? { listId: state.listId, listSongIds: state.listSongIds || incomingListSongIds }
            : {},
          {
            listId: state.listId ?? incomingListId,
            remoteIndex: null,
            reason: 'legacy-session:song-change',
          }
        );
      } else {
        navigate(songPath(state.songId), {
          state: incomingListSongIds || state.listSongIds
            ? { listId: state.listId, listSongIds: state.listSongIds || incomingListSongIds }
            : undefined,
        });
      }
      return;
    }
    if (typeof state.bpm === 'number' && state.bpm !== metronomeBpm) {
      setMetronomeBpm(state.bpm);
      setBpmFlash(true);
      setTimeout(() => setBpmFlash(false), 600);
    }
    if (followDirectorRef.current && state.activeSection) {
      const guard = getSongViewFollowGuard(state.listId ?? incomingListId);
      if (blockSongViewScrollEffects(guard)) {
        logSongviewBlock('legacy-session:active-section', {
          listId: state.listId ?? incomingListId,
          songId: state.songId ?? id ?? null,
        });
      } else {
        sessionSyncLog('navigation applied', { type: 'legacy-section', section: state.activeSection });
        const anchor =
          anchorIdForSectionLabel(state.activeSection, song?.chords) ?? state.activeSection;
        if (anchor !== activeSectionAnchor) {
          setActiveSectionAnchor(anchor);
          const el = sectionRefs.current[anchor];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    if (typeof state.liveNote === 'string' && state.liveNote !== liveNote) {
      setLiveNote(state.liveNote);
    }
    if (typeof state.youtubeUrl === 'string' && state.youtubeUrl !== youtubeUrl) {
      setYoutubeUrl(state.youtubeUrl);
      if (state.youtubeUrl) setShowYoutube(true);
    }
    if (typeof state.youtubePlaying === 'boolean' && state.youtubePlaying !== youtubePlaying) {
      setYoutubePlaying(state.youtubePlaying);
      ytPostMessage(state.youtubePlaying ? 'playVideo' : 'pauseVideo');
    }
    if (typeof state.youtubeSeek === 'number' && Math.abs(state.youtubeSeek - youtubeSeek) > 1.5) {
      setYoutubeSeek(state.youtubeSeek);
      ytPostMessage('seekTo', [state.youtubeSeek, true]);
    }
  }, [
    id,
    navigate,
    followDirector,
    metronomeBpm,
    activeSectionAnchor,
    song?.chords,
    incomingListSongIds,
    incomingListId,
    youtubeUrl,
    youtubePlaying,
    youtubeSeek,
    liveNote,
    ytPostMessage,
    settingsLoaded,
    settings,
    setCustomSemitones,
    setMetronomeBpm,
    setBpmFlash,
    setShowYoutube,
    setYoutubeUrl,
    setYoutubePlaying,
    setYoutubeSeek,
    getSongViewFollowGuard,
    navigateFollowerSongOnly,
    logSongviewBlock,
  ]);


  useEffect(() => {
    console.log('[SongViewPage] mounted');
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && song) {
      console.log('[SongViewPage] montado', song.id);
    }
  }, [song?.id]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      ytDiagLog('SongViewPage stage', getYtDiagStage());
    }
  }, []);

  const handleNavigateSong = useCallback((newSongId: string) => {
    const listIndex =
      incomingListSongIds?.indexOf(newSongId) ?? -1;
    navigate(songPath(newSongId), {
      state: {
        listId: incomingListId,
        listSongIds: incomingListSongIds,
        ...(listIndex >= 0 ? { currentIndex: listIndex } : {}),
        joinSessionCode: effectiveJoinCode ?? joinSessionCode,
        ...(fromContinuous ? { fromContinuous: true } : {}),
      },
    });
  }, [
    navigate,
    incomingListId,
    incomingListSongIds,
    effectiveJoinCode,
    joinSessionCode,
    fromContinuous,
  ]);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (applyingRemoteRef.current) {
        setViewMode(mode);
        return;
      }
      if (mode === 'continuous') {
        if (!continuousModeAvailable) return;
        clearManualExitContinuous();
        if (incomingListId && song?.id) {
          navigate(`/setlist/${incomingListId}/live`, {
            state: {
              listId: incomingListId,
              listSongIds: directorListSongIds,
              joinSessionCode: sessionConnection?.sessionCode ?? joinSessionCode,
            },
          });
          return;
        }
      }
      setViewMode(mode);
    },
    [
      continuousModeAvailable,
      incomingListId,
      directorListSongIds,
      joinSessionCode,
      navigate,
      liveIsDirector,
      publishSharedSessionIfDirector,
      sessionConnection,
      song?.id,
      customSemitones,
      genderShift,
    ]
  );

  const handleExitContinuous = useCallback(() => {
    if (!song?.id) return;

    const listIndex =
      incomingListSongIds && song.id
        ? incomingListSongIds.indexOf(song.id)
        : routeNavState.currentIndex ?? -1;

    if (incomingListId) {
      markManualExitContinuous(incomingListId);
    }

    const sessionCode =
      effectiveJoinCode ?? sessionConnection?.sessionCode ?? joinSessionCode;

    setViewMode('musician');

    if (incomingListId && incomingListSongIds?.length) {
      navigate(getSongPath(song, songs), {
        replace: true,
        state: buildExitContinuousNavState({
          listId: incomingListId,
          listSongIds: incomingListSongIds,
          targetSongId: song.id,
          currentIndex: listIndex >= 0 ? listIndex : undefined,
          joinSessionCode: sessionCode,
        }),
      });
    }
  }, [
    navigate,
    liveIsDirector,
    publishSharedSessionIfDirector,
    sessionConnection,
    song?.id,
    incomingListId,
    incomingListSongIds,
    routeNavState.currentIndex,
    customSemitones,
    genderShift,
    effectiveJoinCode,
    joinSessionCode,
  ]);

  useEffect(() => {
    if (fromContinuous) {
      setViewMode('musician');
    }
  }, [fromContinuous, id]);

  useEffect(() => {
    if (viewMode === 'continuous' && !continuousModeAvailable) {
      setViewMode('musician');
    }
  }, [viewMode, continuousModeAvailable]);

  useEffect(() => {
    if (!sessionConnection || sessionConnection.role !== 'director' || !song?.id) return;
    if (applyingRemoteRef.current || sessionHydrationRef.current) {
      if (sessionHydrationRef.current) {
        sessionRecoveryLog('skipped publish during hydration');
      }
      return;
    }

    const songChanged = lastPublishedSongRef.current !== song.id;
    lastPublishedSongRef.current = song.id;
    publishDirectorSharedState({ immediate: songChanged });
  }, [
    sessionConnection,
    song?.id,
    incomingListId,
    incomingListSongIds,
    customSemitones,
    genderShift,
    viewMode,
    activeSectionAnchor,
    publishDirectorSharedState,
  ]);

  useEffect(() => {
    setActiveSectionAnchor('');
    pendingSectionAnchorRef.current = null;
  }, [song?.id]);

  // ====== SMART FONT FIT ======
  // Reduce automáticamente el tamaño visual si la línea más larga no cabe en pantalla
  // (sobre todo en móvil), evitando scroll horizontal. NO modifica el fontSize guardado.
  const longestLineChars = useMemo(() => {
    return (song?.chords || '').split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  }, [song?.chords]);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const onR = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  const computeFitted = useCallback((requested: number) => {
    if (!longestLineChars) return requested;
    // Padding del card (p-4 sm:p-6) + container px-4 → ~64px en móvil, ~104px en desktop
    const padding = viewportWidth < 640 ? 64 : 104;
    const available = Math.max(220, viewportWidth - padding);
    // Courier monospace: ancho de carácter ≈ fontSize * 0.6
    const maxByWidth = Math.floor(available / (longestLineChars * 0.6));
    // Mantén legibilidad: nunca por debajo de 12px y solo reduce si excede el ancho.
    const MIN_LEGIBLE = 12;
    return Math.max(MIN_LEGIBLE, Math.min(requested, maxByWidth));
  }, [longestLineChars, viewportWidth]);

  const worshipDockVisible =
    !!song && isMobileViewport && !isMobileStageActive && !isEditing;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const blockers: string[] = [];
    if (!song) blockers.push('no-song');
    if (!isMobileViewport) blockers.push('isMobileViewport=false');
    if (isMobileStageActive) blockers.push('mobileStageActive');
    if (isEditing) blockers.push('isEditing');
    console.log('[MobileDock] SongViewPage', {
      worshipDockVisible,
      visibilityReason: worshipDockVisible ? 'shown' : blockers.join(', ') || 'hidden',
      isMobileViewport,
      isMobileStageActive,
      mobileStageMode,
      isEditing,
      isFullscreen,
      songId: song?.id,
      snapshot: readViewportSnapshot(),
    });
  }, [
    song?.id,
    worshipDockVisible,
    isMobileViewport,
    isMobileStageActive,
    mobileStageMode,
    isEditing,
    isFullscreen,
  ]);

  useEffect(() => {
    if (!song?.id) return;
    songViewRenderLog({
      source: 'song-view',
      preference: songViewPreference,
      fullscreen: isFullscreen,
      songId: song.id,
    });
  }, [song?.id, songViewPreference, isFullscreen]);

  if (!song) {
    if (liveIsFollower && followerAwaitingDirector) {
      return <FollowerDirectorSyncLoader />;
    }

    const awaitingDirector =
      liveIsFollower && isFollowOwner && (!followSongId || !effectiveSongId);

    if (awaitingDirector) {
      return <FollowerDirectorSyncLoader />;
    }

    // Follower landed on a missing/private song — do not spin forever.
    if (liveIsFollower) {
      return (
        <div className="container px-4 py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            No se pudo cargar la canción del director (puede ser local o aún no sincronizada).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => spectator.requestFollowerCurrentState()}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Reintentar sincronización
            </button>
            <button
              type="button"
              onClick={() => spectator.cancelFollowerConnection()}
              className="rounded-lg bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground"
            >
              Cancelar conexión
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-gold hover:underline text-sm"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground">Canción no encontrada</p>
        <button onClick={() => navigate('/')} className="mt-4 text-gold hover:underline">Volver al inicio</button>
      </div>
    );
  }

  const effectiveShowChords =
    !isLyricsOnlyPreference && showChordsForViewMode(viewMode);
  const effectiveShowMusicianNotes =
    !isLyricsOnlyPreference && showMusicianNotesForViewMode(viewMode);
  const isTeleprompter = isContinuousTeleprompterView(viewMode);
  const teleprompterSheet = isTeleprompter || isMobileStageActive;

  const handleShare = () => {
    const params = new URLSearchParams();
    if (customSemitones !== 0) {
      params.set('transpose', customSemitones > 0 ? `+${customSemitones}` : String(customSemitones));
    }
    if (vocalRegister) params.set('vocal', vocalRegister);
    const qs = params.toString();
    const url = `${window.location.origin}${getSongPath(song, songs)}${qs ? `?${qs}` : ''}`;
    navigator.clipboard.writeText(url).then(() => toast.success('¡Enlace copiado!'));
  };

  const handlePdf = () => {
    generateSongPdf(
      song,
      displayKey || displayOriginalKey,
      effectiveSemitones,
      effectiveShowChords,
      useFlats
    );
  };

  const lyricFontBoost = teleprompterFontBoost(viewMode);
  // ========== FULLSCREEN OVERLAY ==========
  // IMPORTANTE: NO retornamos temprano — renderizamos el overlay junto al árbol normal
  // para que DirectorSession (Realtime) permanezca montado al entrar/salir de pantalla completa.
  const fsMobileStage = isFullscreen && isMobileViewport && isMobileStageActive;

  const listSongIndex =
    incomingListSongIds && song ? incomingListSongIds.indexOf(song.id) : -1;

  const fullscreenOverlay = isFullscreen ? (
    <div
      ref={fullscreenScrollRef}
      className={`fixed inset-0 z-[100] overflow-auto ${
        teleprompterSheet
          ? 'stage-surface bg-background text-foreground p-4 sm:p-8'
          : 'bg-background text-foreground p-8'
      } ${fsMobileStage ? 'mobile-stage-fullscreen p-2' : ''}`}
    >
      <div className={`max-w-4xl mx-auto ${fsMobileStage ? 'mobile-stage-fullscreen-inner' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold font-display ${teleprompterSheet ? 'text-stage' : 'text-foreground'}`}>{song.title}</h1>
            <p className={teleprompterSheet ? 'text-stage-muted' : 'text-muted-foreground'}>{song.artist} • {displayKey || displayOriginalKey}</p>
          </div>
          <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-lg bg-secondary text-foreground" title="Salir de pantalla completa (Esc)">
            <Minimize className="w-5 h-5" />
          </button>
        </div>

        {/* Floating controls desktop / tablet sin modo escenario */}
        <div
          data-song-fullscreen-bar
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-4 py-2 rounded-2xl bg-secondary/90 backdrop-blur border border-border shadow-lg max-lg:ios-safe-fixed-bottom-center ${fsMobileStage ? 'hidden' : ''}`}
        >
          {incomingListSongIds && incomingListSongIds.length > 1 && (
            <>
              <button
                onClick={() => {
                  const idx = incomingListSongIds.indexOf(song.id);
                  if (idx > 0) handleNavigateSong(incomingListSongIds[idx - 1]);
                }}
                disabled={incomingListSongIds.indexOf(song.id) <= 0}
                className="px-2 py-1 rounded text-xs border border-border text-muted-foreground hover:text-gold hover:border-gold disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border flex items-center gap-1"
                title="Canción anterior"
              >
                <ChevronUp className="w-3 h-3 -rotate-90" /> Ant
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">
                {incomingListSongIds.indexOf(song.id) + 1}/{incomingListSongIds.length}
              </span>
              <button
                onClick={() => {
                  const idx = incomingListSongIds.indexOf(song.id);
                  if (idx >= 0 && idx < incomingListSongIds.length - 1) handleNavigateSong(incomingListSongIds[idx + 1]);
                }}
                disabled={(() => { const i = incomingListSongIds.indexOf(song.id); return i < 0 || i >= incomingListSongIds.length - 1; })()}
                className="px-2 py-1 rounded text-xs border border-border text-muted-foreground hover:text-gold hover:border-gold disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border flex items-center gap-1"
                title="Canción siguiente"
              >
                Sig <ChevronUp className="w-3 h-3 rotate-90" />
              </button>
              <div className="w-px h-5 bg-border" />
            </>
          )}
          <button onClick={() => setFullscreenFontSize(s => Math.max(12, s - 2))} className="px-2 py-1 rounded text-xs border border-border text-muted-foreground">A-</button>
          <span className="text-xs text-foreground font-mono">{fullscreenFontSize}px</span>
          <button onClick={() => setFullscreenFontSize(s => Math.min(40, s + 2))} className="px-2 py-1 rounded text-xs border border-border text-muted-foreground">A+</button>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => setModeSwapped(m => !m)} className={`px-2 py-1 rounded text-xs border ${modeSwapped ? 'border-gold text-gold' : 'border-border text-muted-foreground'}`}>
            {modeSwapped ? 'Menor' : 'Mayor'}
          </button>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => setAutoScrolling(a => !a)} className={`px-2 py-1 rounded text-xs border ${autoScrolling ? 'border-gold text-gold' : 'border-border text-muted-foreground'}`}>
            {autoScrolling ? <Pause className="w-3 h-3 inline" /> : <Play className="w-3 h-3 inline" />} Scroll
          </button>
          {autoScrolling && (
            <input type="range" min={0.5} max={5} step={0.5} value={scrollSpeed}
              onChange={e => setScrollSpeed(Number(e.target.value))}
              className="w-16 accent-gold" />
          )}
        </div>

        <div
          className="leading-loose pb-20 overflow-x-auto"
          style={{
            fontSize: computeFitted(fullscreenFontSize),
            fontFamily: "'Courier New', Courier, monospace",
            whiteSpace: 'pre',
            WebkitOverflowScrolling: 'touch' as any,
          }}
        >
          <ChordSheet
            chords={song.chords}
            semitones={effectiveSemitones}
            useFlats={useFlats}
            showChords={effectiveShowChords}
            showMusicianNotes={effectiveShowMusicianNotes}
            useAmerican={useAmerican}
            activeSectionAnchor={activeSectionAnchor}
            onSectionClick={handleSectionClick}
            onSectionRef={handleSectionRef}
            lineFontSize={computeFitted(fullscreenFontSize)}
          />
        </div>
      </div>
    </div>
  ) : null;

  // ========== NORMAL MODE ==========
  return (
    <MobileStageLayout active={isMobileStageActive} isLandscape={isLandscape}>
    <>
    <SessionOriginMismatchDialog
      open={sessionOriginMismatch.open}
      listLabel={sessionOriginMismatch.label}
      onVolver={sessionOriginMismatch.volverASesion}
      onRedirect={sessionOriginMismatch.redirectHere}
      onCerrar={sessionOriginMismatch.cerrarSesion}
      onDismiss={sessionOriginMismatch.dismiss}
    />
    {fullscreenOverlay}
    <RehearsalAutoScrollStopFab
      visible={autoScrolling && !isMobileStageActive}
      onStop={() => setAutoScrolling(false)}
    />
    {youtubePickerOpen && song ? (
      <ChunkLoadErrorBoundary fallbackTitle="No se pudo cargar el selector de YouTube.">
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[129] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground rounded-xl bg-background px-4 py-3 border border-border">
                Cargando selector…
              </p>
            </div>
          }
        >
          <YouTubeQuickPicker
            open={youtubePickerOpen}
            onOpenChange={setYoutubePickerOpen}
            songTitle={song.title ?? ''}
            songArtist={song.artist ?? ''}
            onSelect={handleYoutubeVideoSelected}
          />
        </Suspense>
      </ChunkLoadErrorBoundary>
    ) : null}
    {ytDiagPeekEnabled() ? (
      <MobileStageYouTubePeek
        visible={isMobileStageActive && youtubePeekVisible}
        youtubeEmbedId={youtubeEmbedId}
        youtubeIframeRef={youtubeIframeRef}
        youtubePlaying={youtubePlaying}
        onPlayPause={handleYoutubePlayPause}
        onClose={() => setYoutubePeekVisible(false)}
      />
    ) : null}
    <div
      className={`container px-3 sm:px-4 pt-3 max-w-6xl mobile-stage-content ${
        worshipDockVisible && !controlsHidden
          ? 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-6'
          : 'pb-6 sm:py-6'
      } ${teleprompterSheet ? 'stage-surface bg-background text-foreground' : ''} ${isFullscreen ? 'invisible h-0 overflow-hidden' : ''}`}
      ref={scrollRef}
      onPointerDown={isMobileStageActive ? bumpControls : undefined}
    >
      {/* Banner liveNote del Director */}
      {viewMode === 'continuous' && (
        <button
          type="button"
          onClick={handleExitContinuous}
          className="stage-exit-btn fixed z-[45] px-3 py-2 rounded-lg text-xs font-semibold max-lg:ios-safe-fixed-top-right"
        >
          Salir de continuo
        </button>
      )}

      {sessionConnection && (
        <div
          className={`sticky top-2 z-40 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-semibold uppercase tracking-wider ${
            sessionConnection.role === 'director'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
          {sessionConnection.role === 'director'
            ? 'Sincronizando asistentes'
            : followDirector
              ? 'Siguiendo al director'
              : 'Siguiendo desactivado'}
          {sessionConnection.role === 'follower' && (
            <label className="normal-case ml-auto flex items-center gap-2 font-normal text-[10px] cursor-pointer">
              <span className="text-muted-foreground">Seguir director</span>
              <input
                type="checkbox"
                checked={followDirector}
                onChange={(e) => handleFollowDirectorChange(e.target.checked)}
                className="h-3.5 w-3.5 accent-gold"
              />
            </label>
          )}
        </div>
      )}

      {liveNote && (
        <div className="sticky top-2 z-40 mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 backdrop-blur animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-amber-300">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">📢 Director</span>
            <p className="text-sm font-semibold">{liveNote}</p>
          </div>
          <button onClick={() => setLiveNote('')} className="text-amber-300/60 hover:text-amber-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN — Song content */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-4">
          {isMobileViewport && (
            <MobileStageToggle
              active={mobileStageMode}
              onToggle={() => setMobileStageMode(!mobileStageMode)}
            />
          )}
          <SongViewPreferenceToggle
            preference={songViewPreference}
            onChange={setSongViewPreference}
          />

          {/* Selector de Modos de Visión */}
          <div className="mobile-stage-hide flex items-center gap-2 p-1 rounded-xl bg-secondary/50 border border-border w-fit">
            <button onClick={() => handleViewModeChange('singer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'singer' ? 'bg-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Cantantes: solo letra grande">
              <User className="w-3.5 h-3.5" /> Cantante
            </button>
            <button onClick={() => handleViewModeChange('musician')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'musician' ? 'bg-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Músicos: letra con acordes y diagramas">
              <UsersIcon className="w-3.5 h-3.5" /> Músico
            </button>
            {continuousModeAvailable && (
            <button onClick={() => handleViewModeChange('continuous')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'continuous' ? 'bg-amber-500 text-black' : 'text-muted-foreground hover:text-foreground'}`}
              title="Setlist continuo en vivo">
              <ListMusic className="w-3.5 h-3.5" /> Continuo
            </button>
            )}
          </div>
          </div>

          {/* Navegación de setlist — ARRIBA */}
          {incomingListSongIds && (
            <SetlistNav
              currentSongId={song.id}
              listSongIds={incomingListSongIds}
              listId={incomingListId}
              onNavigate={handleNavigateSong}
              position="top"
            />
          )}

              <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold font-display text-foreground">{song.title}</h1>
                <p className="text-muted-foreground">{song.artist}</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg border border-border text-red-500 hover:bg-red-50 transition-colors"><X className="w-5 h-5" /></button>
                    <button onClick={handleSaveCorrection} className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"><Save className="w-5 h-5" /></button>
                  </>
                ) : isAdmin ? (
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-gold transition-colors" title="Corregir letra/notas"><Edit2 className="w-5 h-5" /></button>
                ) : null}
                <button onClick={() => toggleFavorite(song.id)} className={`p-2 rounded-lg border border-border ${isFavorite(song.id) ? 'text-gold bg-gold/10' : 'text-muted-foreground'}`}>
                  <Heart className="w-5 h-5" fill={isFavorite(song.id) ? 'currentColor' : 'none'} />
                </button>
                <button onClick={handleShare} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"><Share2 className="w-5 h-5" /></button>
                <button onClick={handlePdf} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground" title="Exportar PDF"><Printer className="w-5 h-5" /></button>
              </div>
            </div>
          </div>

          {/* Editor or Chord View */}
          {isEditing ? (
            <div className="glass-card p-4 space-y-4 float-in">
              <p className="text-xs text-amber-500 font-medium">Modo Edición: Escribe los acordes en una línea y la letra en la siguiente.</p>
              <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[500px] p-4 bg-secondary/50 border border-border rounded-xl font-mono text-sm leading-relaxed focus:ring-2 focus:ring-gold outline-none" />
            </div>
          ) : (
            <>
              {!isTeleprompter && (
              <div className="mobile-stage-hide flex items-center gap-2 mb-4 flex-wrap">
                {/* Tamaño de fuente — vista normal */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border" title="Tamaño de letra">
                  <Type className="w-3.5 h-3.5 text-muted-foreground" />
                  <button onClick={() => setFontSize(s => Math.max(12, s - 1))} className="px-1.5 text-xs text-muted-foreground hover:text-foreground">A-</button>
                  <span className="text-[10px] font-mono text-foreground w-7 text-center">{fontSize}px</span>
                  <button onClick={() => setFontSize(s => Math.min(32, s + 1))} className="px-1.5 text-xs text-muted-foreground hover:text-foreground">A+</button>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={useAmerican ? 'text-gold font-semibold' : ''}>AMERICAN</span>
                  <button onClick={() => setUseAmerican(!useAmerican)} className={`w-10 h-5 rounded-full transition-colors ${useAmerican ? 'bg-muted' : 'bg-gold'}`}>
                    <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${useAmerican ? 'translate-x-0.5' : 'translate-x-5'}`} />
                  </button>
                  <span className={!useAmerican ? 'text-gold font-semibold' : ''}>LATÍN</span>
                </div>
              </div>
              )}
              {sessionConnection?.role === 'director' && song && !isLyricsOnlyPreference && (
                <SectionQuickNav
                  chords={song.chords}
                  activeAnchorId={activeSectionAnchor}
                  onSelectAnchor={handleDirectorSectionAnchor}
                />
              )}
              <div
                className={`p-4 sm:p-6 leading-relaxed overflow-x-auto overflow-y-visible rounded-xl border transition-colors mobile-stage-chord-area chord-sheet-scroll ${
                  teleprompterSheet
                    ? 'mobile-stage-sheet stage-sheet bg-card text-card-foreground border border-border rounded-xl'
                    : 'glass-card'
                } ${viewMode === 'singer' || isTeleprompter ? 'leading-loose' : ''}`}
                style={{
                  fontSize: computeFitted(fontSize + lyricFontBoost),
                  fontFamily: "'Courier New', Courier, monospace",
                  whiteSpace: 'pre',
                  WebkitOverflowScrolling: 'touch' as any,
                }}
              >
                <ChordSheet
                  chords={song.chords}
                  semitones={effectiveSemitones}
                  useFlats={useFlats}
                  showChords={effectiveShowChords}
                  showMusicianNotes={effectiveShowMusicianNotes}
                  useAmerican={useAmerican}
                  activeSectionAnchor={activeSectionAnchor}
                  onSectionClick={handleSectionClick}
                  onSectionRef={handleSectionRef}
                  lineFontSize={computeFitted(fontSize + lyricFontBoost)}
                />
              </div>

              {/* Navegación de setlist — JUSTO DEBAJO de letra/acordes para acceso rápido del director */}
              {incomingListSongIds && (
                <div className="mt-4">
                  <SetlistNav
                    currentSongId={song.id}
                    listSongIds={incomingListSongIds}
                    listId={incomingListId}
                    onNavigate={handleNavigateSong}
                    position="bottom"
                  />
                </div>
              )}
            </>
          )}

          {/* Bottom toolbar */}
          {!isEditing && (
            <div className="mobile-stage-hide flex flex-wrap items-center gap-3 mt-4">
              <RehearsalAutoScrollToolbar
                autoScrolling={autoScrolling}
                smartScroll={smartScroll}
                scrollSpeed={scrollSpeed}
                youtubeDuration={youtubeDuration}
                onToggleAutoScroll={() => setAutoScrolling((a) => !a)}
                onToggleSmartScroll={() => setSmartScroll((s) => !s)}
                onScrollSpeedChange={setScrollSpeed}
              />
              <button onClick={() => setIsFullscreen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground ml-auto">
                <Maximize className="w-3 h-3" /> Pantalla Completa
              </button>
            </div>
          )}

          {!isEditing && !isTeleprompter && (
            <div className="mobile-stage-hide">
            <RehearsalTools
              songId={song.id}
              metronomeBpm={metronomeBpm}
              metronomeActive={metronomeActive}
              beatCount={beatCount}
              bpmFlash={bpmFlash}
              onToggleMetronome={handleToggleMetronome}
              onBpmChange={handleBpmChange}
              youtubeUrl={youtubeUrl}
              onYoutubeUrlChange={handleYoutubeUrlChange}
              showYoutube={showYoutube}
              onToggleShowYoutube={() => setShowYoutube((s) => !s)}
              youtubeEmbedId={youtubeEmbedId}
              youtubeIframeRef={youtubeIframeRef}
              youtubePlaying={youtubePlaying}
              onYoutubePlayPause={handleYoutubePlayPause}
              youtubeDuration={youtubeDuration}
              ytDelayMs={ytDelayMs}
              onYtDelayMsChange={(ms) => setYtDelayMs(ms)}
              onSmartYoutubeClick={handleSmartYoutubeClick}
            />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Transpose panel (oculto en teleprompter / solo letra local) */}
        {!isTeleprompter && !isLyricsOnlyPreference && (
        <div className="mobile-stage-hide lg:w-80 shrink-0">
          <div className="glass-card p-5 sticky top-20 space-y-4">
            <TransposePanel
              song={song}
              displayKey={displayKey}
              displayOriginalKey={displayOriginalKey}
              effectiveSemitones={effectiveSemitones}
              customSemitones={customSemitones}
              registerSemitones={registerSemitones}
              genderSemitones={genderSemitones}
              vocalRegister={vocalRegister}
              genderShift={genderShift}
              modeSwapped={modeSwapped}
              capoInfo={capoInfo}
              displayCapoPlayAs={displayCapoPlayAs}
              isAdmin={isAdmin}
              isSaving={isSaving}
              lastSavedAt={lastSavedAt}
              onSaveNow={saveNow}
              onVocalRegisterChange={handleVocalRegisterChange}
              onGenderShiftToggle={handleGenderShiftToggle}
              onAdminSetOriginalGender={handleAdminSetOriginalGender}
              onDecreaseSemitone={() => setCustomSemitones((prev) => prev - 1)}
              onIncreaseSemitone={() => setCustomSemitones((prev) => prev + 1)}
              onResetTranspose={handleResetOriginal}
              onToggleModeSwap={() => setModeSwapped((m) => !m)}
            />

            {/* Add to list */}
            <div className="border-t border-border pt-4">
              <button onClick={() => setShowAddToList(!showAddToList)}
                className="w-full py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar a lista
              </button>
              {showAddToList && (
                <div className="mt-2 space-y-2">
                  {lists.map(list => (
                    <button key={list.id} onClick={() => { addSongToList(list.id, song.id); toast.success(`Agregada a "${list.name}"`); setShowAddToList(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80">
                      {list.name}
                    </button>
                  ))}
                  <div className="flex gap-2">
                    <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Nueva lista..."
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
                    <button onClick={() => { if (newListName.trim()) { createList(newListName.trim()); setNewListName(''); toast.success(`Lista "${newListName.trim()}" creada`); } }}
                      className="px-3 py-2 rounded-lg bg-gold text-primary-foreground text-sm">Crear</button>
                  </div>
                </div>
              )}
            </div>
            
            <DirectorSession
              songId={song.id}
              semitones={effectiveSemitones}
              currentKey={displayKey || displayOriginalKey}
              bpm={metronomeBpm}
              activeSection={activeSectionAnchor}
              liveNote={liveNote}
              listId={incomingListId}
              listSongIds={incomingListSongIds}
              pageContext={pageSessionContext}
              allowAutoReconnect={sessionOriginMismatch.allowAutoReconnect}
              listName={liveList?.name}
              viewMode={viewMode}
              genderShift={genderShift}
              currentIndex={listSongIndex >= 0 ? listSongIndex : 0}
              sharedSectionAnchor={activeSectionAnchor}
              followDirector={followDirector}
              youtubeUrl={youtubeUrl}
              youtubePlaying={youtubePlaying}
              youtubeSeek={youtubeSeek}
              onSessionRecovered={handleSessionRecovered}
              onSessionUpdate={handleSessionUpdate}
              onNavigateSong={handleNavigateSong}
              autoJoinFollower={autoJoinFollower}
              initialJoinCode={autoJoinFollower ? effectiveJoinCode : undefined}
              onAddSongToList={incomingListId ? (sid) => addSongToList(incomingListId, sid) : undefined}
              onConnectionChange={() => {}}
              onDirectorSessionEstablished={handleDirectorSessionEstablished}
              onRequestSharedSessionPublish={handleRequestSharedSessionPublish}
              sessionPanelVisible
              onSharedSessionUpdate={handleSharedSessionUpdate}
              onSharedSessionEnded={() => {}}
              onFollowDirectorChange={handleFollowDirectorChange}
              showFollowDirectorToggle={sessionConnection?.role === 'follower'}
            />
          </div>
        </div>
        )}
      </div>
    </div>
    <MobileControlsRestoreFab
      visible={worshipDockVisible && controlsHidden}
      onShow={showControls}
    />
    <WorshipFloatingDock
      visible={worshipDockVisible}
      mobileViewport={isMobileViewport}
      scrollRef={scrollRef}
      controlsHidden={controlsHidden}
      onHideControls={hideControls}
      displayKey={displayKey || displayOriginalKey}
      genderShift={genderShift}
      customSemitones={customSemitones}
      autoScrolling={autoScrolling}
      isFullscreen={isFullscreen}
      onTransposeDown={() => setCustomSemitones((prev) => prev - 1)}
      onTransposeUp={() => setCustomSemitones((prev) => prev + 1)}
      onSetCustomSemitones={setCustomSemitones}
      onGenderToggle={handleWorshipGenderToggle}
      onGenderSelect={handleWorshipGenderSelect}
      onResetTranspose={handleResetOriginal}
      onToggleAutoScroll={() => setAutoScrolling((a) => !a)}
      sheet={{
        song,
        displayKey: displayKey || displayOriginalKey,
        displayOriginalKey,
        effectiveSemitones,
        customSemitones,
        genderShift,
        modeSwapped,
        capoInfo,
        displayCapoPlayAs,
        vocalRegister,
        fontSize,
        viewMode,
        autoScrolling,
        scrollSpeed,
        smartScroll,
        youtubeDuration,
        isFullscreen,
        onResetTranspose: handleResetOriginal,
        onToggleModeSwap: () => setModeSwapped((m) => !m),
        onDecreaseSemitone: () => setCustomSemitones((prev) => prev - 1),
        onIncreaseSemitone: () => setCustomSemitones((prev) => prev + 1),
        onVocalRegisterChange: handleVocalRegisterChange,
        onGenderShiftToggle: handleGenderShiftToggle,
        onGenderSelect: handleWorshipGenderSelect,
        onSetCustomSemitones: setCustomSemitones,
        onFontSizeChange: setFontSize,
        onViewModeChange: handleViewModeChange,
        onToggleAutoScroll: () => setAutoScrolling((a) => !a),
        onToggleSmartScroll: () => setSmartScroll((s) => !s),
        onScrollSpeedChange: setScrollSpeed,
        onToggleFullscreen: () => setIsFullscreen((f) => !f),
        onYouTube: handleSmartYoutubeClick,
        tools: {
          onShare: handleShare,
          onToggleFavorite: () => toggleFavorite(song.id),
          isFavorite: isFavorite(song.id),
          onToggleMobileStage: () => setMobileStageMode(!mobileStageMode),
          mobileStageActive: mobileStageMode,
          onToggleFullscreen: () => setIsFullscreen((f) => !f),
          isFullscreen,
          hasListNav: !!(incomingListSongIds && incomingListSongIds.length > 1),
          canNavigatePrev: listSongIndex > 0,
          canNavigateNext:
            listSongIndex >= 0 &&
            listSongIndex < (incomingListSongIds?.length ?? 0) - 1,
          onNavigatePrev:
            listSongIndex > 0 && incomingListSongIds
              ? () => handleNavigateSong(incomingListSongIds[listSongIndex - 1])
              : undefined,
          onNavigateNext:
            incomingListSongIds &&
            listSongIndex >= 0 &&
            listSongIndex < incomingListSongIds.length - 1
              ? () => handleNavigateSong(incomingListSongIds[listSongIndex + 1])
              : undefined,
          fontSize,
          onFontSizeChange: setFontSize,
          viewMode,
          onViewModeChange: handleViewModeChange,
          continuousModeAvailable,
          onYouTube: handleSmartYoutubeClick,
        },
        rehearsal: {
          songId: song.id,
          metronomeBpm,
          metronomeActive,
          beatCount,
          bpmFlash,
          onToggleMetronome: handleToggleMetronome,
          onBpmChange: handleBpmChange,
          youtubeUrl,
          onYoutubeUrlChange: handleYoutubeUrlChange,
          showYoutube,
          onToggleShowYoutube: () => setShowYoutube((s) => !s),
          youtubeEmbedId,
          youtubeIframeRef,
          youtubePlaying,
          onYoutubePlayPause: handleYoutubePlayPause,
          youtubeDuration,
          ytDelayMs,
          onYtDelayMsChange: (ms) => setYtDelayMs(ms),
          onSmartYoutubeClick: handleSmartYoutubeClick,
        },
      }}
    />
    {ytDiagDockEnabled() ? (
      <MobileStageDock
        visible={isMobileStageActive && !isEditing}
        controlsVisible={controlsVisible}
        isLandscape={isLandscape}
        isFullscreen={isFullscreen}
        displayKey={displayKey || displayOriginalKey}
        metronomeActive={metronomeActive}
        metronomeBpm={metronomeBpm}
        autoScrolling={autoScrolling}
        scrollSpeed={scrollSpeed}
        autoHideControls={autoHideControls}
        youtubeActive={youtubePeekVisible}
        onToggleMetronome={() => {
          bumpControls();
          handleToggleMetronome();
        }}
        onBpmChange={(bpm) => {
          bumpControls();
          handleBpmChange(bpm);
        }}
        onToggleAutoScroll={() => {
          bumpControls();
          setAutoScrolling((a) => !a);
        }}
        onScrollSpeedChange={(speed) => {
          bumpControls();
          setScrollSpeed(speed);
        }}
        onTransposeDown={() => {
          bumpControls();
          setCustomSemitones((prev) => prev - 1);
        }}
        onTransposeUp={() => {
          bumpControls();
          setCustomSemitones((prev) => prev + 1);
        }}
        onToggleFullscreen={() => {
          bumpControls();
          setIsFullscreen((f) => !f);
        }}
        onToggleYoutube={handleMobileYoutubeToggle}
        onToggleAutoHide={() => setAutoHideControls(!autoHideControls)}
        onBumpControls={bumpControls}
        sections={songSections}
        onScrollToTop={handleScrollToTop}
        onOpenSections={() => {
          bumpControls();
          setSectionsPickerOpen(true);
        }}
      />
    ) : null}
    <Dialog open={sectionsPickerOpen} onOpenChange={setSectionsPickerOpen}>
      <DialogContent className="max-w-sm z-[130]">
        <DialogHeader>
          <DialogTitle className="text-base">Ir a sección</DialogTitle>
          <DialogDescription className="sr-only">
            Elije una etiqueta de sección para desplazar la partitura.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[40vh] overflow-y-auto space-y-1">
          {songSections.map((label, index) => {
            const occurrence = songSections.slice(0, index).filter((l) => l === label).length;
            const anchor =
              anchorIdForSectionLabel(label, song?.chords, occurrence) ?? label;
            return (
            <li key={`${label}-${index}`}>
              <button
                type="button"
                onClick={() => handleJumpSection(label, occurrence)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary ${
                  activeSectionAnchor === anchor ? 'bg-gold/10 text-gold' : ''
                }`}
              >
                {label}
              </button>
            </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
    </>
    </MobileStageLayout>
  );
}
