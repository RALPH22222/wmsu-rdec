import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './context/AuthContext';
import { CallForProposalsProvider } from './context/CallForProposalsContext';
import { AdminLayout } from './layouts/AdminLayout';
import { RpduLayout } from './layouts/RpduLayout';
import { EvaluatorLayout } from './layouts/EvaluatorLayout';
import Layout from './layouts/Layout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPreliminaryScreeningPage } from './pages/admin/AdminPreliminaryScreeningPage';
import { AdminClearanceContractsPage } from './pages/admin/AdminClearanceContractsPage';
import { AdminNotarizationSchedulingPage } from './pages/admin/AdminNotarizationSchedulingPage';
import { AdminLetterDeskPage } from './pages/admin/AdminLetterDeskPage';
import { RpduDashboard } from './pages/rpdu/RpduDashboard';
import ProponentDashboard from './pages/proponents/ProponentDashboard';
import BudgetAllocationPage from './pages/proponents/BudgetAllocationPage';
import ProfilePage from './pages/proponents/ProfilePage';
import ScreeningLettersPage from './pages/proponents/ScreeningLettersPage';
import EvaluatorDashboard from './pages/evaluator/evaluatorDashboard';
import { EvaluatorReviewsPage } from './pages/evaluator/EvaluatorReviewsPage';
import { EvaluatorLettersPage } from './pages/evaluator/EvaluatorLettersPage';
import { PreliminaryScreeningPage } from './pages/screening/PreliminaryScreeningPage';
import { ClearanceContractsPage } from './pages/rpdu/ClearanceContractsPage';
import { NotarizationSchedulingPage } from './pages/rpdu/NotarizationSchedulingPage';
import { LetterDeskPage } from './pages/rpdu/LetterDeskPage';
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

function PublicLayout({ onSignInClick }: { onSignInClick: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-brand selection:text-white">
      <Navbar onSignInClick={onSignInClick} />
      <main className="grow pt-16 lg:pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}



export function App() {
  const [toast, setToast] = useState<string | null>(null);

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <AuthProvider>
      <CallForProposalsProvider>
        <BrowserRouter>
          <ScrollToTop />

          {/* Global Toast Notification */}
          {toast && <Toast message={toast} onClose={() => setToast(null)} />}

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
                <Route path="/proponent/letters" element={<ScreeningLettersPage />} />
                <Route path="/proponent/profile" element={<ProfilePage />} />
                <Route path="/dashboard" element={<ProponentDashboard />} />
              </Route>

              {/* Dedicated Evaluator Layout */}
              <Route element={<EvaluatorLayout />}>
                <Route path="/evaluator" element={<EvaluatorDashboard />} />
                <Route path="/evaluator/reviews" element={<EvaluatorReviewsPage />} />
                <Route path="/evaluator/letters" element={<EvaluatorLettersPage />} />
                <Route path="/evaluator/profile" element={<ProfilePage />} />
              </Route>

              {/* Dedicated Admin Layout */}
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/screening" element={<AdminPreliminaryScreeningPage />} />
                <Route path="/admin/letters" element={<AdminLetterDeskPage />} />
                <Route path="/admin/contracts" element={<AdminClearanceContractsPage />} />
                <Route path="/admin/notarization" element={<AdminNotarizationSchedulingPage />} />
              </Route>

              {/* Dedicated RPDU Layout */}
              <Route element={<RpduLayout />}>
                <Route path="/rpdu" element={<RpduDashboard />} />
                <Route path="/rpdu/screening" element={<PreliminaryScreeningPage role="rpdu" />} />
                <Route path="/rpdu/letters" element={<LetterDeskPage />} />
                <Route path="/rpdu/contracts" element={<ClearanceContractsPage />} />
                <Route path="/rpdu/notarization" element={<NotarizationSchedulingPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CallForProposalsProvider>
    </AuthProvider>
  );
}

export default App;
