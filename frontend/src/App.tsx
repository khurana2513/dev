import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { TourProvider } from "./contexts/TourContext";
import { GuidedTourWithRef } from "./components/GuidedTour";
import { Suspense, lazy, useEffect, useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import './styles/loading.css';

import Header from "./components/Header";
import MobileTabBar from "./components/MobileTabBar";
import Footer from "./components/Footer";
import GraceBanner from "./components/GraceBanner";
import BetaBanner from "./components/BetaBanner";
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

const PaperCreate = lazy(() => import("./pages/PaperCreate"));
const PaperAttempt = lazy(() => import("./pages/PaperAttempt"));
const Mental = lazy(() => import("./pages/Mental"));
const ClassroomArena = lazy(() => import("./pages/ClassroomArena"));
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
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const GridMaster = lazy(() => import("./pages/GridMaster"));
const MagicSquarePage = lazy(() => import("./pages/MagicSquarePage"));
const SorobanAbacus = lazy(() => import("./pages/SorobanAbacus"));
const AbacusFlashCards = lazy(() => import("./pages/AbacusFlashCards"));
const Pricing = lazy(() => import("./pages/Pricing"));
const StudentRewards = lazy(() => import("./pages/StudentRewards"));
const LeaderboardComingSoon = lazy(() => import("./pages/LeaderboardComingSoon"));
const DuelMode = lazy(() => import("./pages/DuelMode"));
const NumberNinja = lazy(() => import("./pages/NumberNinja"));
const AdminExams = lazy(() => import("./pages/AdminExams"));
const ExamTake = lazy(() => import("./pages/ExamTake"));
const AdminFees = lazy(() => import("./pages/AdminFees"));
const StudentFees = lazy(() => import("./pages/StudentFees"));
const QuotationMaker = lazy(() => import("./pages/QuotationMaker"));
const AdminOrgDetail = lazy(() => import("./pages/AdminOrgDetail"));
const AdminOrgs = lazy(() => import("./pages/AdminOrgs"));
const OrgDashboard = lazy(() => import("./pages/OrgDashboard"));
const JoinOrg = lazy(() => import("./pages/JoinOrg"));
const BadgeUnlockCinematic = lazy(() => import("./components/rewards/BadgeUnlockCinematic"));
const StreakCelebrationOverlay = lazy(() => import("./components/rewards/StreakCelebrationOverlay"));
const SuperLetterCinematic = lazy(() => import("./components/rewards/SuperLetterCinematic"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

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
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreenActive(
        !!document.fullscreenElement ||
        document.documentElement.classList.contains("app-fullscreen")
      );
    };
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
    window.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
      window.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  return (
    <ErrorBoundary>
      <InactivityWarningModal 
        isOpen={showInactivityWarning} 
        onDismiss={dismissWarning} 
      />
      <div
        className="flex flex-col min-h-screen transition-colors duration-300"
        style={{
          background: '#07070F',
          minHeight: isFullscreenActive ? "100vh" : undefined,
          overflow: isFullscreenActive ? "hidden" : undefined,
        }}
      >
        <Header />
        {!isFullscreenActive && <BetaBanner />}
        {!isFullscreenActive && <GraceBanner />}
        <main className="flex-grow" style={{ paddingBottom: isFullscreenActive ? 0 : "env(safe-area-inset-bottom, 0px)", overflow: isFullscreenActive ? "hidden" : undefined }}>
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
              <Route path="/mental/classroom">
                <ProtectedRoute>
                  <ClassroomArena />
                </ProtectedRoute>
              </Route>
              <Route path="/burst">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <BurstMode />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/duel/:code">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DuelMode />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/duel">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DuelMode />
                  </ErrorBoundary>
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
                  <ErrorBoundary>
                    <StudentDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/profile">
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              </Route>
              <Route path="/admin">
                <AdminRoute>
                  <ErrorBoundary>
                    <AdminDashboard />
                  </ErrorBoundary>
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
              <Route path="/account-deletion">
                <ProtectedRoute>
                  <AccountDeletion />
                </ProtectedRoute>
              </Route>
              <Route path="/terms-of-service" component={TermsOfService} />
              <Route path="/about" component={AboutUs} />
              <Route path="/report-issue" component={ReportIssue} />
              <Route path="/tools/gridmaster" component={GridMaster} />
              <Route path="/tools/gridmaster/magic" component={MagicSquarePage} />
              <Route path="/tools/number-ninja" component={NumberNinja} />
              <Route path="/tools/soroban/flashcards" component={AbacusFlashCards} />
              <Route path="/tools/soroban" component={SorobanAbacus} />
              <Route path="/pricing">
                <ProtectedRoute>
                  <Pricing />
                </ProtectedRoute>
              </Route>
              <Route path="/paper/shared/:code">
                <ProtectedRoute>
                  <SharedPaperView />
                </ProtectedRoute>
              </Route>
              <Route path="/enter-code">
                <ProtectedRoute>
                  <EnterCode />
                </ProtectedRoute>
              </Route>
              {/* Legacy redirect: old paper/enter-code links route to unified page */}
              <Route path="/paper/enter-code">
                <ProtectedRoute>
                  <EnterCode />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/exams">
                <AdminRoute>
                  <AdminExams />
                </AdminRoute>
              </Route>
              <Route path="/exam/:code">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <ExamTake />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/admin/fees">
                <AdminRoute>
                  <AdminFees />
                </AdminRoute>
              </Route>
              <Route path="/admin/quotations">
                <AdminRoute>
                  <QuotationMaker />
                </AdminRoute>
              </Route>
              <Route path="/admin/orgs/:id">
                <AdminRoute>
                  <AdminOrgDetail />
                </AdminRoute>
              </Route>
              <Route path="/admin/orgs">
                <AdminRoute>
                  <AdminOrgs />
                </AdminRoute>
              </Route>
              <Route path="/org-dashboard">
                <ProtectedRoute>
                  <OrgDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/join">
                <ProtectedRoute>
                  <JoinOrg />
                </ProtectedRoute>
              </Route>
              <Route path="/fees">
                <ProtectedRoute>
                  <StudentFees />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
            </Suspense>
          </ErrorBoundary>
        </main>
        {!isFullscreenActive && <Footer />}
        <MobileTabBar />
      </div>
      <Suspense fallback={null}>
        <BadgeUnlockCinematic />
        <StreakCelebrationOverlay />
        <SuperLetterCinematic />
      </Suspense>
      <GuidedTourWithRef />
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
          <TourProvider>
          <NetworkGuard>
            <AppContent />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
          </NetworkGuard>
          </TourProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
