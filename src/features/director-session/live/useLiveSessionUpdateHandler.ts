import { useCallback, useLayoutEffect, useRef } from 'react';
import type { SharedSessionState } from '../types';

/** Let a long-lived subscription call the latest committed handler. */
export function useLiveSessionUpdateHandler(handler: (state: SharedSessionState) => void) {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  return useCallback((state: SharedSessionState) => handlerRef.current(state), []);
}
