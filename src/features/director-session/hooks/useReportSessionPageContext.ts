import { useEffect, useRef } from 'react';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';
import type { PageSessionContext } from '@/features/director-session/utils/sessionOrigin';

function pageContextKey(page: PageSessionContext): string {
  const ids = page.listSongIds?.join(',') ?? '';
  return `${page.songId ?? ''}|${page.listId ?? ''}|${ids}`;
}

/** Reports current route page context to SessionProvider (passive listen / scope). */
export function useReportSessionPageContext(page: PageSessionContext): void {
  const { reportPageContext } = useSpectatorSession();
  const lastKeyRef = useRef('');

  useEffect(() => {
    const key = pageContextKey(page);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    reportPageContext(page);
  }, [page, reportPageContext]);
}
