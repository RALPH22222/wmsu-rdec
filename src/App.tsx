import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CallForProposalsProvider, AdminDashboard, RpduDashboard, AdminLayout, RpduLayout } from './users';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { Toast } from './components/Toast';

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
      <Navbar onSignInClick={onSignInClick} />
      <main className="flex-grow pt-16 lg:pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Dashboard() {
  return (
    <div className="bg-white p-12 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Proponent Dashboard</h2>
      <p className="text-slate-600">Welcome to the Research Project Development System.</p>
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

            {/* Proponent Dashboard Layout (Requires Auth) */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CallForProposalsProvider>
    </AuthProvider>
  );
}

export default App;