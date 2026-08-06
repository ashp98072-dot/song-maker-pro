import { createContext, useContext } from 'react';
import type { LiveSessionChannelContextValue } from '@/features/director-session/live/liveSessionTypes';

export const LiveSessionChannelContext = createContext<LiveSessionChannelContextValue | null>(
  null
);

export function useLiveSessionChannel(): LiveSessionChannelContextValue {
  const ctx = useContext(LiveSessionChannelContext);
  if (!ctx) {
    throw new Error('useLiveSessionChannel must be used within SpectatorSessionProvider');
  }
  return ctx;
}

export function useLiveSessionChannelOptional(): LiveSessionChannelContextValue | null {
  return useContext(LiveSessionChannelContext);
}
