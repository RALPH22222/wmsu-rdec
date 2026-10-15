import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './context/AuthContext';
import { CallForProposalsProvider, useCallForProposals } from './context/CallForProposalsContext';
import { AdminLayout } from './layouts/AdminLayout';
import { RpduLayout } from './layouts/RpduLayout';
import { EvaluatorLayout } from './layouts/EvaluatorLayout';
import Layout from './layouts/Layout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPreliminaryScreeningPage } from './pages/admin/AdminPreliminaryScreeningPage';
import { AdminInceptionSchedulingPage } from './pages/admin/AdminInceptionSchedulingPage';
import { AdminLetterDeskPage } from './pages/admin/AdminLetterDeskPage';
import { RpduDashboard } from './pages/rpdu/RpduDashboard';
import { CallFormPage } from './pages/CallFormPage';
import { EvaluatorAssignmentPage } from './pages/rpdu/EvaluatorAssignmentPage';
import { AihrDeliberationPage } from './pages/rpdu/AihrDeliberationPage';
import { MemoPage } from './pages/rpdu/MemoPage';
import ProponentDashboard from './pages/proponents/ProponentDashboard';
import { ConceptProposalDetailsPage } from './pages/proponents/ConceptProposalDetailsPage';
import BudgetAllocationPage from './pages/proponents/BudgetAllocationPage';
import { ProponentMemosPage } from './pages/proponents/ProponentMemosPage';
import ProfilePage from './pages/proponents/ProfilePage';
import ProponentDocumentsPage from './pages/proponents/ProponentDocumentsPage';
import ContractPreviewPage from './pages/proponents/ContractPreviewPage';
import { LetterPreviewPage } from './pages/proponents/LetterPreviewPage';
import { MemoPreviewPage } from './pages/proponents/MemoPreviewPage';
import { RevisionHistoryPage } from './pages/proponents/RevisionHistoryPage';
import { DetailedProposalSubmissionPage } from './pages/proponents/DetailedProposalSubmissionPage';
import { PipelineProposalDetailPage } from './pages/rpdu/PipelineProposalDetailPage';
import EvaluatorDashboard from './pages/evaluator/evaluatorDashboard';
import { EvaluatorReviewsPage } from './pages/evaluator/EvaluatorReviewsPage';
import { EvaluatorLettersPage } from './pages/evaluator/EvaluatorLettersPage';
import { EvaluationPortalPage } from './pages/evaluator/EvaluationPortalPage';
import { PreliminaryScreeningPage } from './pages/screening/PreliminaryScreeningPage';
import { ScreeningReviewPage } from './pages/screening/ScreeningReviewPage';
import { ScreeningDispatchPage } from './pages/screening/ScreeningDispatchPage';
import { InceptionSchedulingPage } from './pages/rpdu/InceptionSchedulingPage';
import { LetterDeskPage } from './pages/rpdu/LetterDeskPage';
import { DocumentArchivePage } from './pages/rpdu/DocumentArchivePage';
import { ArchivedDocumentPreviewPage } from './pages/rpdu/ArchivedDocumentPreviewPage';
import { AdminDocumentArchivePage } from './pages/admin/AdminDocumentArchivePage';
import { RpduBudgetAllocationPage } from './pages/rpdu/RpduBudgetAllocationPage';
import { RpduBudgetAllocationReviewPage } from './pages/rpdu/RpduBudgetAllocationReviewPage';
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



function GlobalToast() {
  const { toastMessage, hideToast } = useCallForProposals();
  if (!toastMessage) return null;
  return <Toast message={toastMessage} onClose={hideToast} />;
}

export function App() {
  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <AuthProvider>
      <CallForProposalsProvider>
        <BrowserRouter>
          <ScrollToTop />

          {/* Global Toast Notification */}
          <GlobalToast />

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
                <Route path="/proponent/proposals/:proposalId" element={<ConceptProposalDetailsPage />} />
                <Route path="/proponent/detailed-proposals" element={<DetailedProposalSubmissionPage />} />
                <Route path="/proponent/budget" element={<BudgetAllocationPage />} />
                <Route path="/proponent/memos" element={<ProponentMemosPage />} />
                <Route path="/proponent/memos/preview/:memoId" element={<MemoPreviewPage />} />
                <Route path="/proponent/memos/:memoId/preview" element={<MemoPreviewPage />} />
                <Route path="/proponent/documents" element={<ProponentDocumentsPage />} />
                <Route path="/proponent/documents/letter-preview/:letterId" element={<LetterPreviewPage />} />
                <Route path="/proponent/documents/contract-preview/:conceptId" element={<ContractPreviewPage />} />
                <Route path="/proponent/letters" element={<ProponentDocumentsPage />} />
                <Route path="/proponent/letters/:letterId/preview" element={<LetterPreviewPage />} />
                <Route path="/proponent/contracts" element={<ProponentDocumentsPage />} />
                <Route path="/proponent/contracts/:conceptId/preview" element={<ContractPreviewPage />} />
                <Route path="/proponent/revisions" element={<RevisionHistoryPage />} />
                <Route path="/proponent/profile" element={<ProfilePage />} />
                <Route path="/dashboard" element={<ProponentDashboard />} />
              </Route>

              {/* Dedicated Evaluator Layout */}
              <Route element={<EvaluatorLayout />}>
                <Route path="/evaluator" element={<EvaluatorDashboard />} />
                <Route path="/evaluator/reviews" element={<EvaluatorReviewsPage />} />
                <Route path="/evaluator/reviews/:reviewId" element={<EvaluationPortalPage />} />
                <Route path="/evaluator/letters" element={<EvaluatorLettersPage />} />
                <Route path="/evaluator/profile" element={<ProfilePage />} />
              </Route>

              {/* Dedicated Admin Layout */}
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/calls/new" element={<CallFormPage role="admin" mode="create" />} />
                <Route path="/admin/calls/:callId/edit" element={<CallFormPage role="admin" />} />
                <Route path="/admin/screening" element={<AdminPreliminaryScreeningPage />} />
                <Route path="/admin/screening/consolidation" element={<PreliminaryScreeningPage role="admin" view="consolidation" />} />
                <Route path="/admin/screening/:proposalId" element={<ScreeningReviewPage role="admin" />} />
                <Route path="/admin/aihr" element={<AihrDeliberationPage role="admin" />} />
                <Route path="/admin/memos" element={<MemoPage role="admin" />} />
                <Route path="/admin/letters">
                  <Route index element={<AdminLetterDeskPage />} />
                  <Route path="screening-results" element={<ScreeningDispatchPage role="admin" />} />
                </Route>
                <Route path="/admin/archive" element={<AdminDocumentArchivePage />} />
                <Route path="/admin/archive/preview/:id" element={<ArchivedDocumentPreviewPage role="admin" />} />
                <Route path="/admin/archive/:id/preview" element={<ArchivedDocumentPreviewPage role="admin" />} />
                <Route path="/admin/issued-documents" element={<Navigate to="/admin/archive" replace />} />
                <Route path="/admin/clearance" element={<Navigate to="/admin/archive?filter=CERTIFICATE" replace />} />
                <Route path="/admin/contracts" element={<Navigate to="/admin/archive?filter=CONTRACT" replace />} />
                <Route path="/admin/scheduling" element={<AdminInceptionSchedulingPage />} />
                <Route path="/admin/evaluations" element={<EvaluatorAssignmentPage role="admin" />} />
                <Route path="/admin/evaluations/:id" element={<PipelineProposalDetailPage role="admin" />} />
                <Route path="/admin/notarization" element={<Navigate to="/admin/archive?filter=CONTRACT" replace />} />
              </Route>

              {/* Dedicated RPDU Layout */}
              <Route element={<RpduLayout />}>
                <Route path="/rpdu" element={<RpduDashboard />} />
                <Route path="/rpdu/calls/new" element={<CallFormPage role="rpdu" mode="create" />} />
                <Route path="/rpdu/calls/:callId/edit" element={<CallFormPage role="rpdu" />} />
                <Route path="/rpdu/screening" element={<PreliminaryScreeningPage role="rpdu" />} />
                <Route path="/rpdu/screening/consolidation" element={<PreliminaryScreeningPage role="rpdu" view="consolidation" />} />
                <Route path="/rpdu/screening/:proposalId" element={<ScreeningReviewPage role="rpdu" />} />
                <Route path="/rpdu/passed-proposals" element={<Navigate to="/rpdu/screening" replace />} />
                <Route path="/rpdu/aihr" element={<AihrDeliberationPage role="rpdu" />} />
                <Route path="/rpdu/memos" element={<MemoPage role="rpdu" />} />
                <Route path="/rpdu/letters">
                  <Route index element={<LetterDeskPage />} />
                  <Route path="screening-results" element={<ScreeningDispatchPage role="rpdu" />} />
                </Route>
                <Route path="/rpdu/archive" element={<DocumentArchivePage role="rpdu" />} />
                <Route path="/rpdu/archive/preview/:id" element={<ArchivedDocumentPreviewPage role="rpdu" />} />
                <Route path="/rpdu/archive/:id/preview" element={<ArchivedDocumentPreviewPage role="rpdu" />} />
                <Route path="/rpdu/issued-documents" element={<Navigate to="/rpdu/archive" replace />} />
                <Route path="/rpdu/clearance" element={<Navigate to="/rpdu/archive?filter=CERTIFICATE" replace />} />
                <Route path="/rpdu/contracts" element={<Navigate to="/rpdu/archive?filter=CONTRACT" replace />} />
                <Route path="/rpdu/scheduling" element={<InceptionSchedulingPage />} />
                <Route path="/rpdu/evaluations" element={<EvaluatorAssignmentPage role="rpdu" />} />
                <Route path="/rpdu/evaluations/:id" element={<PipelineProposalDetailPage role="rpdu" />} />
                <Route path="/rpdu/budgets" element={<RpduBudgetAllocationPage />} />
                <Route path="/rpdu/budgets/:allocationId" element={<RpduBudgetAllocationReviewPage />} />
                <Route path="/rpdu/notarization" element={<Navigate to="/rpdu/archive?filter=CONTRACT" replace />} />
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
