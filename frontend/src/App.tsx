import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { Suspense, useEffect, useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import './styles/loading.css';

import MaintenancePage from "./pages/MaintenancePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import GraceBanner from "./components/GraceBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import Jugnu from "./components/Jugnu";
import Home from "./pages/Home";
import PaperCreate from "./pages/PaperCreate";
import PaperAttempt from "./pages/PaperAttempt";
import Mental from "./pages/Mental";
import BurstMode from "./pages/BurstMode";
import NotFound from "./pages/NotFound";
import Login from "./components/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StudentProfile from "./pages/StudentProfile";
import AdminStudentIDManagement from "./pages/AdminStudentIDManagement";
import AdminAttendance from "./pages/AdminAttendance";
import AdminStudentManagement from "./pages/AdminStudentManagement";
import StudentAttendance from "./pages/StudentAttendance";
import AbacusCourse from "./pages/AbacusCourse";
import VedicMathsCourse from "./pages/VedicMathsCourse";
import HandwritingCourse from "./pages/HandwritingCourse";
import STEMCourse from "./pages/STEMCourse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AboutUs from "./pages/AboutUs";
import GridMaster from "./pages/GridMaster";
import SorobanAbacus from "./pages/SorobanAbacus";
import Pricing from "./pages/Pricing";
import AdminAccessControl from "./pages/AdminAccessControl";
import StudentRewards from "./pages/StudentRewards";
import AdminRewards from "./pages/AdminRewards";
import LeaderboardComingSoon from "./pages/LeaderboardComingSoon";
import BadgeUnlockCinematic from "./components/rewards/BadgeUnlockCinematic";
import StreakCelebrationOverlay from "./components/rewards/StreakCelebrationOverlay";
import SuperLetterCinematic from "./components/rewards/SuperLetterCinematic";
import { ReactNode } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { useInactivityDetection } from "./hooks/useInactivityDetection";
import InactivityWarningModal from "./components/InactivityWarningModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";


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
    const apiBase = import.meta.env.VITE_API_BASE || "/api";
    fetch(`${apiBase}/public/maintenance-status`)
      .then((r) => r.json())
      .then((d) => setMaintenance(d))
      .catch(() => setMaintenance({ enabled: false, message: "" })); // fail open
  }, []);

  if (maintenance?.enabled && !isAdmin) {
    return <MaintenancePage message={maintenance.message} />;
  }

  return (
    <ErrorBoundary>
      <InactivityWarningModal 
        isOpen={showInactivityWarning} 
        onDismiss={dismissWarning} 
      />
      <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ background: '#07070F' }}>
        <Header />        <GraceBanner />        <main className="flex-grow">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={Home} />
              <Route path="/create/junior" component={PaperCreate} />
              <Route path="/create/basic" component={PaperCreate} />
              <Route path="/create/advanced" component={PaperCreate} />
              <Route path="/create" component={PaperCreate} />
              <Route path="/vedic-maths/level-1" component={PaperCreate} />
              <Route path="/vedic-maths/level-2" component={PaperCreate} />
              <Route path="/vedic-maths/level-3" component={PaperCreate} />
              <Route path="/vedic-maths/level-4" component={PaperCreate} />
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
              <Route path="/courses/abacus" component={AbacusCourse} />
              <Route path="/courses/vedic-maths" component={VedicMathsCourse} />
              <Route path="/courses/handwriting" component={HandwritingCourse} />
              <Route path="/courses/stem" component={STEMCourse} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
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
              <Route component={NotFound} />
            </Switch>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      <BadgeUnlockCinematic />
      <StreakCelebrationOverlay />
      <SuperLetterCinematic />
      <Jugnu />
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

