import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Development only: VITE_AUTH_BYPASS=true opens portal routes without a Supabase session.
const devBypass = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true';

/**
 * Route Guard Component:
 * Prevents unauthenticated users from accessing protected portal routes.
 * If a user logs out and attempts to return via browser history or direct URL,
 * they are immediately redirected to the login page.
 */
export const ProtectedRoute: React.FC = () => {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="space-y-4 max-w-xs w-full text-center">
          <div className="h-4 w-32 bg-slate-200 animate-pulse rounded-sm mx-auto" />
          <div className="h-3 w-48 bg-slate-100 animate-pulse rounded-sm mx-auto" />
        </div>
      </div>
    );
  }

  // Not authenticated -> Immediately redirect to /login and replace history
  if (!devBypass && (!session || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
