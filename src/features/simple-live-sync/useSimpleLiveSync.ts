import { createContext, useContext } from 'react';
import type { SimpleLiveSyncContextValue } from './SimpleLiveSyncContext';

export const SimpleLiveSyncContext = createContext<SimpleLiveSyncContextValue | null>(null);

export function useSimpleLiveSync(): SimpleLiveSyncContextValue {
  const ctx = useContext(SimpleLiveSyncContext);
  if (!ctx) {
    throw new Error('useSimpleLiveSync must be used within SimpleLiveSyncProvider');
  }
  return ctx;
}

export function useSimpleLiveSyncOptional(): SimpleLiveSyncContextValue | null {
  return useContext(SimpleLiveSyncContext);
}
