import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './context/AuthContext';
import { CallForProposalsProvider, useCallForProposals } from './context/CallForProposalsContext';
import { ProposalPipelineProvider } from './context/ProposalPipelineContext';
import { AdminLayout } from './layouts/AdminLayout';
import { RpduLayout } from './layouts/RpduLayout';
import { EvaluatorLayout } from './layouts/EvaluatorLayout';
import Layout from './layouts/Layout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RpduDashboard } from './pages/rpdu/RpduDashboard';
import ProponentDashboard from './pages/proponents/ProponentDashboard';
import BudgetAllocationPage from './pages/proponents/BudgetAllocationPage';
import ProfilePage from './pages/proponents/ProfilePage';
import RevisionHistoryPage from './pages/proponents/RevisionHistoryPage';
import EvaluatorDashboard from './pages/evaluator/evaluatorDashboard';
import { EvaluationPortalPage } from './pages/evaluator/EvaluationPortalPage';
import { PreliminaryScreeningPage } from './pages/screening/PreliminaryScreeningPage';
import { EvaluatorAssignmentPage } from './pages/rpdu/EvaluatorAssignmentPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { Toast } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function GlobalToast() {
  const { toastMessage, hideToast } = useCallForProposals();
  if (!toastMessage) return null;
  return <Toast message={toastMessage} onClose={hideToast} />;
}

function PublicLayout({ onSignInClick }: { onSignInClick: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-[#C8102E] selection:text-white">
      <Navbar onSignInClick={onSignInClick} />
      <main className="flex-grow pt-16 lg:pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}



export function App() {
  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <AuthProvider>
      <CallForProposalsProvider>
        <ProposalPipelineProvider>
          <BrowserRouter>
            <ScrollToTop />

            <Routes>
              {/* Public Portal Layout with Navbar & Footer */}
              <Route element={<PublicLayout onSignInClick={handleSignIn} />}>
                <Route path="/" element={<HomePage onSignInClick={handleSignIn} />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Portal Routes (Requires Active Authentication) */}
              <Route element={<ProtectedRoute />}>
                {/* Proponent Dashboard Layout */}
                <Route element={<Layout />}>
                  <Route path="/proponent" element={<ProponentDashboard />} />
                  <Route path="/proponent/submit" element={<ProponentDashboard />} />
                  <Route path="/proponent/budget" element={<BudgetAllocationPage />} />
                  <Route path="/proponent/revisions" element={<RevisionHistoryPage />} />
                  <Route path="/proponent/profile" element={<ProfilePage />} />
                  <Route path="/dashboard" element={<ProponentDashboard />} />
                </Route>

                {/* Dedicated Evaluator Layout (double-blind portal) */}
                <Route element={<EvaluatorLayout />}>
                  <Route path="/evaluator" element={<EvaluatorDashboard />} />
                  <Route path="/evaluator/review/:assignmentId" element={<EvaluationPortalPage />} />
                </Route>

                {/* Dedicated Admin Layout */}
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/screening" element={<PreliminaryScreeningPage role="admin" />} />
                  <Route path="/admin/evaluations" element={<EvaluatorAssignmentPage role="admin" />} />
                </Route>

                {/* Dedicated RPDU Layout */}
                <Route element={<RpduLayout />}>
                  <Route path="/rpdu" element={<RpduDashboard />} />
                  <Route path="/rpdu/screening" element={<PreliminaryScreeningPage role="rpdu" />} />
                  <Route path="/rpdu/evaluations" element={<EvaluatorAssignmentPage role="rpdu" />} />
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            {/* Global Toast Notification (driven by the domain contexts). Rendered after the
                routes and above z-50/z-[100] overlays so it stays visible while a modal is open. */}
            <div className="relative z-[120]">
              <GlobalToast />
            </div>
          </BrowserRouter>
        </ProposalPipelineProvider>
      </CallForProposalsProvider>
    </AuthProvider>
  );
}

export default App;