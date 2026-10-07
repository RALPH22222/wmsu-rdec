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
import { AdminTechnicalClearancePage } from './pages/admin/AdminTechnicalClearancePage';
import { AdminContractsNotarizationPage } from './pages/admin/AdminContractsNotarizationPage';
import { AdminInceptionSchedulingPage } from './pages/admin/AdminInceptionSchedulingPage';
import { AdminLetterDeskPage } from './pages/admin/AdminLetterDeskPage';
import { RpduDashboard } from './pages/rpdu/RpduDashboard';
import { CallFormPage } from './pages/CallFormPage';
import { PassedProposalsPage } from './pages/rpdu/PassedProposalsPage';
import ProponentDashboard from './pages/proponents/ProponentDashboard';
import BudgetAllocationPage from './pages/proponents/BudgetAllocationPage';
import ProfilePage from './pages/proponents/ProfilePage';
import ScreeningLettersPage from './pages/proponents/ScreeningLettersPage';
import EvaluatorDashboard from './pages/evaluator/evaluatorDashboard';
import { EvaluatorReviewsPage } from './pages/evaluator/EvaluatorReviewsPage';
import { EvaluatorLettersPage } from './pages/evaluator/EvaluatorLettersPage';
import { PreliminaryScreeningPage } from './pages/screening/PreliminaryScreeningPage';
import { TechnicalClearancePage } from './pages/rpdu/TechnicalClearancePage';
import { ContractsNotarizationPage } from './pages/rpdu/ContractsNotarizationPage';
import { InceptionSchedulingPage } from './pages/rpdu/InceptionSchedulingPage';
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
                <Route path="/admin/calls/new" element={<CallFormPage role="admin" mode="create" />} />
                <Route path="/admin/calls/:callId/edit" element={<CallFormPage role="admin" />} />
                <Route path="/admin/screening" element={<AdminPreliminaryScreeningPage />} />
                <Route path="/admin/letters" element={<AdminLetterDeskPage />} />
                <Route path="/admin/clearance" element={<AdminTechnicalClearancePage />} />
                <Route path="/admin/contracts" element={<AdminContractsNotarizationPage />} />
                <Route path="/admin/scheduling" element={<AdminInceptionSchedulingPage />} />
                <Route path="/admin/notarization" element={<AdminInceptionSchedulingPage />} />
              </Route>

              {/* Dedicated RPDU Layout */}
              <Route element={<RpduLayout />}>
                <Route path="/rpdu" element={<RpduDashboard />} />
                <Route path="/rpdu/calls/new" element={<CallFormPage role="rpdu" mode="create" />} />
                <Route path="/rpdu/calls/:callId/edit" element={<CallFormPage role="rpdu" />} />
                <Route path="/rpdu/screening" element={<PreliminaryScreeningPage role="rpdu" />} />
                <Route path="/rpdu/passed-proposals" element={<PassedProposalsPage />} />
                <Route path="/rpdu/letters" element={<LetterDeskPage />} />
                <Route path="/rpdu/clearance" element={<TechnicalClearancePage />} />
                <Route path="/rpdu/contracts" element={<ContractsNotarizationPage />} />
                <Route path="/rpdu/scheduling" element={<InceptionSchedulingPage />} />
                <Route path="/rpdu/notarization" element={<InceptionSchedulingPage />} />
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
