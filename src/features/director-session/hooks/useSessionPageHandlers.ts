import { useEffect, useRef } from 'react';
import type { LiveSessionPageHandlers } from '../live/liveSessionTypes';

/** Keep page callbacks fresh without replaying registration on every render. */
export function useSessionPageHandlers(
  enabled: boolean,
  register: (handlers: LiveSessionPageHandlers) => () => void,
  handlers: LiveSessionPageHandlers,
) {
  const latest = useRef(handlers);
  useEffect(() => { latest.current = handlers; }, [handlers]);
  const notifyOnSessionEnd = handlers.notifyOnSessionEnd;

  useEffect(() => {
    if (!enabled) return;
    return register({
      onSessionUpdate: (state) => latest.current.onSessionUpdate?.(state),
      onSharedSessionUpdate: (state) => latest.current.onSharedSessionUpdate?.(state),
      onSharedSessionEnded: () => latest.current.onSharedSessionEnded?.(),
      onSessionRecovered: (state, meta) => latest.current.onSessionRecovered?.(state, meta),
      onDirectorSessionEstablished: (code) => latest.current.onDirectorSessionEstablished?.(code),
      onDirectorSessionStartFailed: () => latest.current.onDirectorSessionStartFailed?.(),
      onRequestSharedSessionPublish: () => latest.current.onRequestSharedSessionPublish?.(),
      notifyOnSessionEnd,
    });
  }, [enabled, register, notifyOnSessionEnd]);
}
