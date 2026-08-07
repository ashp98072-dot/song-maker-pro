import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import MobileBottomTabBar, {
  shouldShowMobileTabBar,
} from '@/components/MobileBottomTabBar';
import VisitedSongsRegistrar from '@/pwa/VisitedSongsRegistrar';
import SetlistOfflinePrefetcher from '@/pwa/SetlistOfflinePrefetcher';
import { PwaInstallBanner } from '@/pwa/PwaInstallBanner';
import { getRenderDiagStage } from '@/renderDiag';
import { FEATURES } from '@/config/features';
import { SpectatorSessionProvider } from '@/features/director-session/context/SpectatorSessionContext';
import { ActiveSessionBanner } from '@/features/director-session/components/ActiveSessionBanner';
import { SessionStatusBar } from '@/features/director-session/components/SessionStatusBar';
import { DirectorSessionConflictDialog } from '@/features/director-session/components/DirectorSessionConflictDialog';
import { JoinSessionConflictDialog } from '@/features/director-session/components/JoinSessionConflictDialog';
import { FollowerJoinAwaitingOverlay } from '@/features/director-session/components/FollowerJoinAwaitingOverlay';
import { SimpleLiveSyncProvider, SimpleLiveResumeBanner } from '@/features/simple-live-sync';
import { isPublicAppPath } from '@/utils/publicAppPaths';

export default function AppLayout() {
  const { userName } = useApp();
  const location = useLocation();
  const layoutAuthBypass = (() => {
    const s = getRenderDiagStage();
    return s < 99 && s >= 2;
  })();
  const showTabPad = shouldShowMobileTabBar(location.pathname);

  if (!layoutAuthBypass && !userName && !isPublicAppPath(location.pathname)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const main = (
    <main
      className="min-h-screen bg-background app-shell-with-tabs lg:!pb-0"
      data-hide-tab-pad={showTabPad ? undefined : 'true'}
    >
      <VisitedSongsRegistrar />
      <SetlistOfflinePrefetcher />
      <Navbar />
      <PwaInstallBanner />
      {FEATURES.SIMPLE_LIVE_SYNC ? (
        <SimpleLiveResumeBanner />
      ) : (
        <>
          <ActiveSessionBanner />
          <SessionStatusBar />
          <DirectorSessionConflictDialog />
          <JoinSessionConflictDialog />
          <FollowerJoinAwaitingOverlay />
        </>
      )}
      <Outlet />
      <MobileBottomTabBar />
    </main>
  );

  // Keep SpectatorSessionProvider for pages that still call useSpectatorSession;
  // SIMPLE_LIVE_SYNC disables its restore / channel side effects.
  const withSpectator = <SpectatorSessionProvider>{main}</SpectatorSessionProvider>;

  if (FEATURES.SIMPLE_LIVE_SYNC) {
    return <SimpleLiveSyncProvider>{withSpectator}</SimpleLiveSyncProvider>;
  }

  return withSpectator;
}
