import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MODERATION_CHANGED } from './moderationApi';

/** Shared screens recheck server visibility on return and while actively browsing. */
export function useCommunityRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'hidden' && navigator.onLine !== false) setRevision(value => value + 1);
    };
    window.addEventListener(MODERATION_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60_000);
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') refresh(); });
    return () => {
      window.clearInterval(timer); data.subscription.unsubscribe();
      window.removeEventListener(MODERATION_CHANGED, refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return revision;
}
