import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { lazy, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppLayout from "@/components/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import HomePage from "@/pages/HomePage";
import FavoritesPage from "@/pages/FavoritesPage";
import ListsPage from "@/pages/ListsPage";
import ListDetailPage from "@/pages/ListDetailPage";
import AddSongPage from "@/pages/AddSongPage";
import CommunityLibraryPage from "@/pages/CommunityLibraryPage";
import BackupPage from "@/pages/BackupPage";
import DonatePage from "@/pages/DonatePage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import NotFound from "./pages/NotFound.tsx";
import { LazyRouteBoundary } from "@/components/LazyRouteBoundary";
import { ChunkLoadErrorBoundary } from "@/components/ChunkLoadErrorBoundary";
import { AppDebugHost } from "@/debug/AppDebugHost";
import { getRenderDiagStage } from "@/renderDiag";
import { isPublicAppPath } from "@/utils/publicAppPaths";

const SongViewPage = lazy(() => import("@/pages/SongViewPage"));
const ContinuousSetlistPage = lazy(() => import("@/pages/ContinuousSetlistPage"));

const queryClient = new QueryClient();

function DiagStageBanner({ stageLabel }: { stageLabel: string }) {
  useEffect(() => {
    console.log(`[RENDER] ${stageLabel}`);
  }, [stageLabel]);
  return (
    <div style={{ padding: 24, background: "#111", color: "#fff", minHeight: 120 }}>
      <strong>{stageLabel}</strong>
      <p style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>
        VITE_RENDER_DIAG_STAGE — revisa consola por [RENDER]
      </p>
    </div>
  );
}

/** Etapa 2: mismo contenedor que layout, sin Navbar ni VisitedSongsRegistrar */
function LayoutShellNoNavbar() {
  useEffect(() => {
    console.log("[RENDER] LayoutShellNoNavbar (ETAPA 2, sin Navbar)");
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <Outlet />
    </main>
  );
}

/**
 * AuthManager
 * Coordina las redirecciones basadas en el estado de autenticación real.
 */
const AuthManager = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, userName, isGuest, loginAsGuest } = useApp();
  const [isInitializing, setIsInitializing] = useState(true);
  const diagStage = getRenderDiagStage();
  const diagRouteBypass = diagStage < 99 && diagStage >= 2;
  const onPublicPath = isPublicAppPath(location.pathname);
  const needsPublicGuest = !userName && !isGuest && onPublicPath;

  useEffect(() => {
    if (diagRouteBypass) {
      setIsInitializing(false);
      return;
    }
    const checkSession = async () => {
      try {
        await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            window.setTimeout(() => reject(new Error('getSession timeout')), 4000)
          ),
        ]);
      } catch (err) {
        console.warn('[AUTH] getSession failed or timed out', err);
      } finally {
        setIsInitializing(false);
      }
    };
    void checkSession();

    // Absolute fail-open so the app never stays on "Sincronizando sesión..." forever.
    const failOpen = window.setTimeout(() => {
      setIsInitializing(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        if (isPublicAppPath(window.location.pathname)) {
          loginAsGuest();
        } else {
          navigate("/login", { replace: true });
        }
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (location.pathname === "/login") {
          navigate("/", { replace: true });
        }
      }
    });

    return () => {
      window.clearTimeout(failOpen);
      subscription.unsubscribe();
    };
  }, [diagRouteBypass, navigate, location.pathname, loginAsGuest]);

  useEffect(() => {
    if (needsPublicGuest) loginAsGuest();
  }, [needsPublicGuest, loginAsGuest]);

  useEffect(() => {
    if (diagRouteBypass) return;
    if (isLoading || isInitializing) return;

    const currentPath = location.pathname;
    const isAuthenticated = !!(userName || isGuest);

    if (currentPath.startsWith("/auth/")) return;

    if (isAuthenticated && currentPath === "/login") {
      const from = (location.state as { from?: string } | null)?.from;
      const dest =
        typeof from === 'string' && from.startsWith('/') && from !== '/login' ? from : '/';
      navigate(dest, { replace: true });
      return;
    }

    if (!isAuthenticated && onPublicPath) {
      loginAsGuest();
      return;
    }

    if (!isAuthenticated && currentPath !== "/login") {
      navigate("/login", { replace: true, state: { from: currentPath } });
    }
  }, [
    diagRouteBypass,
    isLoading,
    isInitializing,
    userName,
    isGuest,
    navigate,
    location.pathname,
    location.state,
    onPublicPath,
    loginAsGuest,
  ]);

  useEffect(() => {
    if (diagRouteBypass) {
      console.log("[RENDER] AuthManager (diag bypass 2–6)");
    }
  }, [diagRouteBypass]);

  if (diagRouteBypass) {
    return <>{children}</>;
  }

  if (isLoading || isInitializing || needsPublicGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse font-medium">Sincronizando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function RenderDiagStage1Router() {
  useEffect(() => {
    console.log("[RENDER] ETAPA 1 BrowserRouter");
  }, []);
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="*" element={<DiagStageBanner stageLabel="ETAPA 1 BrowserRouter" />} />
      </Routes>
    </BrowserRouter>
  );
}

function RenderDiagRouter({ stage }: { stage: number }) {
  useEffect(() => {
    console.log(`[RENDER] DiagRouter mount (VITE_RENDER_DIAG_STAGE=${stage})`);
  }, [stage]);

  const LayoutComponent = stage === 2 ? LayoutShellNoNavbar : AppLayout;

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthManager>
        <Routes>
          <Route element={<LayoutComponent />}>
            {stage === 2 && (
              <Route
                path="/"
                element={<DiagStageBanner stageLabel="ETAPA 2 — shell layout, sin Navbar" />}
              />
            )}
            {stage === 3 && (
              <Route
                path="/"
                element={<DiagStageBanner stageLabel="ETAPA 3 — AppLayout + Navbar + VisitedSongsRegistrar" />}
              />
            )}
            {stage === 4 && <Route path="/" element={<HomePage />} />}
            {(stage === 5 || stage === 6) && (
              <>
                <Route
                  path="/"
                  element={
                    <DiagStageBanner
                      stageLabel={
                        stage === 6
                          ? "ETAPA 6 — Ir a /cancion/&lt;id&gt;; abrir selector YouTube (lazy)"
                          : "ETAPA 5 — Ir a /cancion/&lt;id válido&gt; para SongViewPage"
                      }
                    />
                  }
                />
                <Route
                  path="/cancion/:songIdentifier"
                  element={
                    <LazyRouteBoundary label="canción">
                      <SongViewPage />
                    </LazyRouteBoundary>
                  }
                />
              </>
            )}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthManager>
    </BrowserRouter>
  );
}

function ProductionApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <BrowserRouter>
            <AppDebugHost>
            <ScrollToTop />
            <AuthManager>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/v1/callback" element={<AuthCallback />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route
                    path="/cancion/:songIdentifier"
                    element={
                      <LazyRouteBoundary label="canción">
                        <SongViewPage />
                      </LazyRouteBoundary>
                    }
                  />
                  <Route path="/favoritos" element={<FavoritesPage />} />
                  <Route path="/listas" element={<ListsPage />} />
                  <Route path="/lista/:id" element={<ListDetailPage />} />
                  <Route
                    path="/setlist/:id/live"
                    element={
                      <LazyRouteBoundary label="setlist en vivo">
                        <ContinuousSetlistPage />
                      </LazyRouteBoundary>
                    }
                  />
                  <Route path="/agregar" element={<AddSongPage />} />
                  <Route path="/comunidad" element={<CommunityLibraryPage />} />
                  <Route path="/backup" element={<BackupPage />} />
                  <Route path="/donaciones" element={<DonatePage />} />
                  <Route path="/payment-success" element={<PaymentSuccessPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthManager>
            </AppDebugHost>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  const raw = getRenderDiagStage();
  const stage =
    raw === 0 || raw === 99 || (raw >= 1 && raw <= 6)
      ? raw
      : 99;

  if (stage === 0) {
    console.log("[RENDER] ETAPA 0 — App root only");
    return (
      <div style={{ padding: 40, color: "white", background: "black" }}>
        APP ROOT OK
      </div>
    );
  }

  if (stage === 99) {
    return (
      <ChunkLoadErrorBoundary fallbackTitle="Algo salió mal en la aplicación.">
        <ProductionApp />
      </ChunkLoadErrorBoundary>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {stage === 1 ? (
          <RenderDiagStage1Router />
        ) : (
          <AppProvider>
            <RenderDiagRouter stage={stage} />
          </AppProvider>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
