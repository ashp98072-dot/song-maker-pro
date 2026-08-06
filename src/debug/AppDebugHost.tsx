import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isAppDebugEnabled, isDebugPanelVisible } from '@/debug/appDebugMode';
import { attachAppDebugGlobals, refreshAppDebugSnapshot } from '@/debug/initAppDebug';
import { AppDebugPanel } from '@/debug/AppDebugPanel';

/**
 * Monta observabilidad post-deploy sin afectar UX (solo DEV o ?debug=1).
 */
export function AppDebugHost({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    if (!isAppDebugEnabled()) return;
    return attachAppDebugGlobals();
  }, []);

  useEffect(() => {
    if (!isAppDebugEnabled()) return;
    void refreshAppDebugSnapshot({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash]);

  return (
    <>
      {children}
      {isDebugPanelVisible() ? <AppDebugPanel /> : null}
    </>
  );
}
