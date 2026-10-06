import { useEffect, useLayoutEffect, useRef } from 'react';
import { installDebugLiveSession, type DebugLiveSessionSnapshot } from '../utils/debugLiveSession';

/** Keep the development console reader current without reinstalling it on every render. */
export function useDebugLiveSession(getSnapshot: () => DebugLiveSessionSnapshot): void {
  const snapshotRef = useRef(getSnapshot);
  useLayoutEffect(() => {
    snapshotRef.current = getSnapshot;
  }, [getSnapshot]);
  useEffect(() => installDebugLiveSession(() => snapshotRef.current()), []);
}
