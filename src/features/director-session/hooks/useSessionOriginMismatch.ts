import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  fetchActiveDirectorSession,
  type ActiveDirectorSession,
} from '@/features/director-session/utils/detectActiveDirectorSession';
import {
  inferSessionOriginFromRecovery,
  isPageInSessionScope,
  sessionOriginLabel,
  type PageSessionContext,
  type SessionOrigin,
} from '@/features/director-session/utils/sessionOrigin';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';

const DISMISS_KEY = 'worship-session-origin-mismatch-dismiss';

function dismissKeyFor(pathname: string, origin: SessionOrigin): string {
  const anchor =
    origin.type === 'setlist' ? `list:${origin.listId}` : `song:${origin.songId}`;
  return `${DISMISS_KEY}:${pathname}:${anchor}`;
}

export function useSessionOriginMismatch(
  page: PageSessionContext & { listName?: string }
) {
  const location = useLocation();
  const {
    continuarSesionDirector,
    cerrarSesionDirector,
    redirectSessionHere,
    sessionConnected,
  } = useSpectatorSession();

  const [active, setActive] = useState<ActiveDirectorSession | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const director = await fetchActiveDirectorSession();
      if (!cancelled) setActive(director);
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.key, page.songId, page.listId]);

  const origin = useMemo(
    () => (active ? inferSessionOriginFromRecovery(active.recovery) : null),
    [active]
  );

  const inScope = useMemo(
    () => (origin ? isPageInSessionScope(origin, page) : true),
    [origin, page]
  );

  const open = !!active && !!origin && !inScope && !dismissed && !sessionConnected;

  const label = origin ? sessionOriginLabel(origin) : '';

  useEffect(() => {
    setDismissed(false);
  }, [location.pathname, location.key, page.songId, page.listId, origin?.listId, origin?.songId]);

  const dismiss = useCallback(() => {
    if (origin) {
      try {
        sessionStorage.setItem(dismissKeyFor(location.pathname, origin), '1');
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  }, [location.pathname, origin]);

  useEffect(() => {
    if (!origin || inScope) return;
    try {
      if (sessionStorage.getItem(dismissKeyFor(location.pathname, origin)) === '1') {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [location.pathname, origin, inScope]);

  const volverASesion = useCallback(() => {
    continuarSesionDirector();
  }, [continuarSesionDirector]);

  const redirectHere = useCallback(() => {
    if (!active || !page.songId) return;
    void redirectSessionHere({
      songId: page.songId,
      listId: page.listId,
      listSongIds: page.listSongIds,
      listName: page.listName,
    });
    setDismissed(true);
  }, [active, page, redirectSessionHere]);

  const cerrarSesion = useCallback(() => {
    void cerrarSesionDirector();
    setDismissed(true);
  }, [cerrarSesionDirector]);

  const allowAutoReconnect = !open && (origin ? inScope : true);

  return {
    open,
    origin,
    label,
    activeCode: active?.code ?? null,
    volverASesion,
    redirectHere,
    cerrarSesion,
    dismiss,
    allowAutoReconnect,
  };
}
