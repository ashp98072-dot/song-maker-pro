import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import VisitedSongsRegistrar from '@/pwa/VisitedSongsRegistrar';
import { getRenderDiagStage } from '@/renderDiag';
import { FEATURES } from '@/config/features';
import { SpectatorSessionProvider } from '@/features/director-session/context/SpectatorSessionContext';
import { ActiveSessionBanner } from '@/features/director-session/components/ActiveSessionBanner';
import { SessionStatusBar } from '@/features/director-session/components/SessionStatusBar';
import { DirectorSessionConflictDialog } from '@/features/director-session/components/DirectorSessionConflictDialog';
import { JoinSessionConflictDialog } from '@/features/director-session/components/JoinSessionConflictDialog';
import { FollowerJoinAwaitingOverlay } from '@/features/director-session/components/FollowerJoinAwaitingOverlay';
import { SimpleLiveSyncProvider, SimpleLiveResumeBanner } from '@/features/simple-live-sync';

export default function AppLayout() {
  const { userName } = useApp();
  const layoutAuthBypass = (() => {
    const s = getRenderDiagStage();
    return s < 99 && s >= 2;
  })();

  if (!layoutAuthBypass && !userName) return <Navigate to="/login" replace />;

  const main = (
    <main className="min-h-screen bg-background">
      <VisitedSongsRegistrar />
      <Navbar />
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
