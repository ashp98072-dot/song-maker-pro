import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Radio, WifiOff } from 'lucide-react';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import { sessionStatusBarLog } from '@/features/director-session/utils/followerRecoveryLog';
import { FEATURES } from '@/config/features';
import { readFollowDirector } from '@/features/director-session/utils/followDirector';
import { isFollowerContinuousEnabled } from '@/features/director-session/utils/isFollowerContinuousEnabled';
import {
  isExploringOutsideSessionScope,
  isFollowerInContinuousMode,
} from '@/features/director-session/utils/followerViewMode';
import type { LiveSessionStatus } from '@/features/director-session/utils/liveSessionStatus';

const VISIBLE_STATUSES: LiveSessionStatus[] = [
  'detected',
  'joining',
  'subscribed',
  'active',
  'passive',
  'reconnecting',
];

function statusLabel(
  status: LiveSessionStatus,
  opts: {
    showReconnecting: boolean;
    passiveListenMode: boolean;
    directorDisconnected: boolean;
  }
): string {
  if (opts.showReconnecting) return 'Reconectando...';
  if (opts.passiveListenMode || status === 'passive') return 'Seguir desactivado';
  if (opts.directorDisconnected) return 'Director desconectado';
  if (status === 'detected') return 'Sesión detectada';
  if (status === 'joining' || status === 'subscribed') return 'Conectando...';
  return 'Conectado';
}

export function SessionStatusBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    liveSessionStatus,
    liveIsFollower,
    liveIsDirector,
    sessionConnected,
    connection,
    passiveListenMode,
    directorAwayFromScope,
    directorDisconnected,
    isReconnectingUiVisible,
    directorSharedListId,
    sessionCodeDisplay,
    detectedCode,
    activeJoinCode,
    detectedRecovery,
    volverASesion,
    salirDeSesion,
    redirigirSesion,
  } = useSpectatorSession();

  const lastLogKeyRef = useRef('');

  const sessionCode =
    sessionCodeDisplay ?? detectedCode ?? activeJoinCode ?? null;

  const exploringOutside = isExploringOutsideSessionScope({
    liveIsDirector,
    liveIsFollower,
    directorAwayFromScope,
    passiveListenMode,
  });

  const showBar =
    liveSessionStatus !== 'idle' &&
    liveSessionStatus !== 'ended' &&
    VISIBLE_STATUSES.includes(liveSessionStatus) &&
    !!sessionCode &&
    (liveIsFollower ||
      liveIsDirector ||
      sessionConnected ||
      liveSessionStatus === 'detected');

  const showReconnecting =
    liveSessionStatus === 'reconnecting' && isReconnectingUiVisible;

  const label = statusLabel(liveSessionStatus, {
    showReconnecting,
    passiveListenMode,
    directorDisconnected,
  });

  const followDirectorOn = readFollowDirector();
  const followerContinuousEnabled = isFollowerContinuousEnabled(followDirectorOn);
  const showContinuousCta =
    liveIsFollower &&
    followDirectorOn &&
    followerContinuousEnabled &&
    !!directorSharedListId &&
    !isFollowerInContinuousMode(location.pathname, directorSharedListId);
  const showContinuousDisabledNote =
    liveIsFollower && followDirectorOn && !FEATURES.FOLLOW_CONTINUOUS_MODE;

  const compact = exploringOutside;

  useEffect(() => {
    if (!showBar) return;
    const key = `${liveSessionStatus}|${label}|${compact}|${sessionCode ?? ''}`;
    if (lastLogKeyRef.current === key) return;
    lastLogKeyRef.current = key;
    sessionStatusBarLog({
      status: liveSessionStatus,
      label,
      mode: compact ? 'compact' : 'in-session',
      connected: sessionConnected,
      role: liveIsDirector ? 'director' : liveIsFollower ? 'follower' : null,
      code: sessionCode,
      location: compact ? 'outside-session' : 'in-session',
      actionsVisible: [
        'reingresar',
        ...(liveIsDirector ? ['mover-sesion'] : []),
        'salir',
        ...(showContinuousCta ? ['ver-continuo'] : []),
      ],
    });
  }, [
    showBar,
    liveSessionStatus,
    label,
    compact,
    sessionConnected,
    liveIsDirector,
    liveIsFollower,
    sessionCode,
    showContinuousCta,
  ]);

  if (!showBar) return null;

  const title = sessionCode
    ? `Sesión activa: ${sessionCode}`
    : liveIsDirector
      ? 'Sesión activa (Director)'
      : 'Sesión activa';

  return (
    <div
      role="status"
      className={`sticky z-[55] border-b backdrop-blur-sm ${
        compact
          ? 'border-amber-500/25 bg-amber-500/8 py-1'
          : 'border-primary/20 bg-primary/5 py-1.5 sm:py-2'
      }`}
    >
      <div
        className={`container max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 ${
          compact ? 'px-2 sm:px-3' : 'px-3 sm:px-4'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 text-[10px] sm:text-xs">
          {showReconnecting ? (
            <Loader2 className="w-3 h-3 shrink-0 animate-spin text-amber-400" aria-hidden />
          ) : directorDisconnected ? (
            <WifiOff className="w-3 h-3 shrink-0 text-red-400" aria-hidden />
          ) : (
            <Radio className="w-3 h-3 shrink-0 text-emerald-400" aria-hidden />
          )}
          <span className="text-foreground font-medium truncate">{title}</span>
          {!compact ? (
            <span className="text-muted-foreground truncate hidden sm:inline">· {label}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
          {showContinuousCta ? (
            <button
              type="button"
              onClick={() =>
                navigate(`/setlist/${directorSharedListId}/live`, {
                  state: {
                    listId: directorSharedListId,
                    joinSessionCode: sessionCode,
                    listSongIds: detectedRecovery?.listSongIds,
                    initialSongId: detectedRecovery?.songId ?? undefined,
                    initialIndex: detectedRecovery?.currentIndex,
                  },
                })
              }
              className="px-2 py-0.5 sm:py-1 rounded-md border border-amber-400/40 text-amber-200 text-[10px] font-semibold hover:bg-amber-500/10"
            >
              Ver modo continuo
            </button>
          ) : null}
          {showContinuousDisabledNote ? (
            <span className="text-[10px] text-muted-foreground max-w-[10rem] leading-tight">
              Modo continuo temporalmente deshabilitado
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void volverASesion()}
            className="px-2 py-0.5 sm:py-1 rounded-md border border-border text-foreground text-[10px] font-medium hover:bg-muted/50"
          >
            Reingresar
          </button>
          {liveIsDirector ? (
            <button
              type="button"
              onClick={() => void redirigirSesion()}
              className="px-2 py-0.5 sm:py-1 rounded-md border border-amber-400/40 text-amber-200 text-[10px] font-semibold hover:bg-amber-500/10"
            >
              Mover sesión aquí
            </button>
          ) : null}
          <button
            type="button"
            onClick={salirDeSesion}
            className="px-2 py-0.5 sm:py-1 rounded-md border border-red-500/40 text-red-300 text-[10px] font-semibold hover:bg-red-500/10"
          >
            Salir sesión
          </button>
        </div>
      </div>
    </div>
  );
}
