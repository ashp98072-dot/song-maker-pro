import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import VisitedSongsRegistrar from '@/pwa/VisitedSongsRegistrar';
import { getRenderDiagStage } from '@/renderDiag';
import { SpectatorSessionProvider } from '@/features/director-session/context/SpectatorSessionContext';
import { ActiveSessionBanner } from '@/features/director-session/components/ActiveSessionBanner';
import { SessionStatusBar } from '@/features/director-session/components/SessionStatusBar';
import { DirectorSessionConflictDialog } from '@/features/director-session/components/DirectorSessionConflictDialog';
import { JoinSessionConflictDialog } from '@/features/director-session/components/JoinSessionConflictDialog';
import { FollowerJoinAwaitingOverlay } from '@/features/director-session/components/FollowerJoinAwaitingOverlay';

export default function AppLayout() {
  const { userName } = useApp();
  const layoutAuthBypass = (() => {
    const s = getRenderDiagStage();
    return s < 99 && s >= 2;
  })();

  if (!layoutAuthBypass && !userName) return <Navigate to="/login" replace />;
  return (
    <SpectatorSessionProvider>
      <main className="min-h-screen bg-background">
        <VisitedSongsRegistrar />
        <Navbar />
        <ActiveSessionBanner />
        <SessionStatusBar />
        <DirectorSessionConflictDialog />
        <JoinSessionConflictDialog />
        <FollowerJoinAwaitingOverlay />
        <Outlet />
      </main>
    </SpectatorSessionProvider>
  );
}
