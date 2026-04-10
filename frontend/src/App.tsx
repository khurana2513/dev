import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { Suspense, lazy, useEffect, useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import './styles/loading.css';

import Header from "./components/Header";
import Footer from "./components/Footer";
import GraceBanner from "./components/GraceBanner";
import ErrorBoundary from "./components/ErrorBoundary";
// import Jugnu from "./components/Jugnu";
import Home from "./pages/Home";
import Login from "./components/Login";
import { ReactNode } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { useInactivityDetection } from "./hooks/useInactivityDetection";
import InactivityWarningModal from "./components/InactivityWarningModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { buildApiUrl } from "./lib/apiBase";

const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));
const PaperCreate = lazy(() => import("./pages/PaperCreate"));
const PaperAttempt = lazy(() => import("./pages/PaperAttempt"));
const Mental = lazy(() => import("./pages/Mental"));
const BurstMode = lazy(() => import("./pages/BurstMode"));
const SharedPaperView = lazy(() => import("./pages/SharedPaperView"));
const EnterCode = lazy(() => import("./pages/EnterCode"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const AdminStudentIDManagement = lazy(() => import("./pages/AdminStudentIDManagement"));
const AdminAttendance = lazy(() => import("./pages/AdminAttendance"));
const AdminStudentManagement = lazy(() => import("./pages/AdminStudentManagement"));
const StudentAttendance = lazy(() => import("./pages/StudentAttendance"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const GridMaster = lazy(() => import("./pages/GridMaster"));
const SorobanAbacus = lazy(() => import("./pages/SorobanAbacus"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AdminAccessControl = lazy(() => import("./pages/AdminAccessControl"));
const StudentRewards = lazy(() => import("./pages/StudentRewards"));
const AdminRewards = lazy(() => import("./pages/AdminRewards"));
const LeaderboardComingSoon = lazy(() => import("./pages/LeaderboardComingSoon"));
const DuelMode = lazy(() => import("./pages/DuelMode"));
const BadgeUnlockCinematic = lazy(() => import("./components/rewards/BadgeUnlockCinematic"));
const StreakCelebrationOverlay = lazy(() => import("./components/rewards/StreakCelebrationOverlay"));
const SuperLetterCinematic = lazy(() => import("./components/rewards/SuperLetterCinematic"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log("🟡 [PROTECTED] Route check - loading:", loading, "authenticated:", isAuthenticated, "user:", user?.email);
  
  if (loading) {
    console.log("🟡 [PROTECTED] Still loading, showing loading screen");
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    console.log("🟡 [PROTECTED] Not authenticated, showing login");
    return <Login />;
  }
  
  console.log("✅ [PROTECTED] Authenticated, showing protected content");
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="text-2xl font-bold  text-red-400 mb-4">Access Denied</div>
          <div className=" text-slate-300 mb-4">You do not have permission to access this page.</div>
          <a href="/dashboard" className=" text-indigo-400  hover:text-indigo-300 underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function AppContent() {
  // Handle scroll restoration based on page type
  useScrollRestoration();

  // Track user inactivity (30 minute warning)
  const { showInactivityWarning, dismissWarning } = useInactivityDetection();

  // ── Maintenance mode gate ──────────────────────────────────────────────
  const { isAdmin } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch(buildApiUrl("/public/maintenance-status"))
      .then((r) => r.json())
      .then((d) => setMaintenance(d))
      .catch(() => setMaintenance({ enabled: false, message: "" })); // fail open
  }, []);

  if (maintenance?.enabled && !isAdmin) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <MaintenancePage message={maintenance.message} />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <InactivityWarningModal 
        isOpen={showInactivityWarning} 
        onDismiss={dismissWarning} 
      />
      <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ background: '#07070F' }}>
        <Header />        <GraceBanner />        <main className="flex-grow" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={Home} />
              <Route path="/create/junior">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/create/basic">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/create/advanced">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/create">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/vedic-maths/level-1">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/vedic-maths/level-2">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/vedic-maths/level-3">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/vedic-maths/level-4">
                <ProtectedRoute>
                  <PaperCreate />
                </ProtectedRoute>
              </Route>
              <Route path="/mental">
                <ProtectedRoute>
                  <Mental />
                </ProtectedRoute>
              </Route>
              <Route path="/burst">
                <ProtectedRoute>
                  <BurstMode />
                </ProtectedRoute>
              </Route>
              <Route path="/duel/:code">
                <ProtectedRoute>
                  <DuelMode />
                </ProtectedRoute>
              </Route>
              <Route path="/duel">
                <ProtectedRoute>
                  <DuelMode />
                </ProtectedRoute>
              </Route>
              <Route path="/paper/attempt">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <PaperAttempt />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/profile">
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              </Route>
              <Route path="/admin">
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </Route>
              <Route path="/admin/student-ids">
                <AdminRoute>
                  <AdminStudentIDManagement />
                </AdminRoute>
              </Route>
              <Route path="/admin/students">
                <AdminRoute>
                  <AdminStudentManagement />
                </AdminRoute>
              </Route>
              <Route path="/admin/attendance">
                <AdminRoute>
                  <AdminAttendance />
                </AdminRoute>
              </Route>
              <Route path="/attendance">
                <ProtectedRoute>
                  <StudentAttendance />
                </ProtectedRoute>
              </Route>
              <Route path="/rewards">
                <ProtectedRoute>
                  <StudentRewardsWithUser />
                </ProtectedRoute>
              </Route>
              <Route path="/leaderboard" component={LeaderboardComingSoon} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/account-deletion" component={AccountDeletion} />
              <Route path="/terms-of-service" component={TermsOfService} />
              <Route path="/about" component={AboutUs} />
              <Route path="/tools/gridmaster" component={GridMaster} />
              <Route path="/tools/gridmaster/magic" component={GridMaster} />
              <Route path="/tools/soroban" component={SorobanAbacus} />
              <Route path="/pricing" component={Pricing} />
              <Route path="/admin/access-control">
                <AdminRoute>
                  <AdminAccessControl />
                </AdminRoute>
              </Route>
              <Route path="/admin/rewards">
                <AdminRoute>
                  <AdminRewards />
                </AdminRoute>
              </Route>
              <Route path="/paper/shared/:code" component={SharedPaperView} />
              <Route path="/paper/enter-code" component={EnterCode} />
              <Route component={NotFound} />
            </Switch>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      <Suspense fallback={null}>
        <BadgeUnlockCinematic />
        <StreakCelebrationOverlay />
        <SuperLetterCinematic />
      </Suspense>
      {/* <Jugnu /> */}
    </ErrorBoundary>
  );
}

/** Detects network loss anywhere on the site and overlays a reconnecting screen */
function NetworkGuard({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  return (
    <>
      {children}
      {isOffline && <LoadingScreen transparent context="Reconnecting" />}
    </>
  );
}

/** Wrapper that passes currentUserId to StudentRewards */
function StudentRewardsWithUser() {
  const { user } = useAuth();
  return <StudentRewards currentUserId={user?.id} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <NetworkGuard>
            <AppContent />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
          </NetworkGuard>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
