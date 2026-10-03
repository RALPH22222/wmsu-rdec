import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CallForProposalsProvider, AdminDashboard, RpduDashboard, AdminLayout, RpduLayout } from './users';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function PublicLayout({ onSignInClick }: { onSignInClick: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-[#C8102E] selection:text-white">
      {/* Public Top Navbar */}
      <Navbar onSignInClick={onSignInClick} />

      {/* Public Page Content */}
      <main className="flex-grow pt-16 lg:pt-20">
        <Outlet />
      </main>

      {/* Public Footer */}
      <Footer />
    </div>
  );
}

export function App() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSignIn = () => {
    showToast('Redirecting to WMSU Proposal Portal Login...');
  };

  return (
    <CallForProposalsProvider>
      <BrowserRouter>
        <ScrollToTop />

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-fade-in-down">
            <div className="w-8 h-8 rounded-xl bg-[#C8102E] flex items-center justify-center text-white shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Portal Authentication</p>
              <p className="text-xs text-gray-300">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <Routes>
          {/* Public Portal Layout with Navbar & Footer */}
          <Route element={<PublicLayout onSignInClick={handleSignIn} />}>
            <Route path="/" element={<HomePage onSignInClick={handleSignIn} />} />
          </Route>

          {/* Dedicated Admin Layout */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Dedicated RPDU Layout */}
          <Route element={<RpduLayout />}>
            <Route path="/rpdu" element={<RpduDashboard />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CallForProposalsProvider>
  );
}

export default App;
