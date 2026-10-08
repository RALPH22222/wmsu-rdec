import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route Guard Component:
 * Prevents unauthenticated users from accessing protected portal routes.
 * If a user logs out and attempts to return via browser history or direct URL,
 * they are immediately redirected to the login page.
 */
export const ProtectedRoute: React.FC = () => {
  const { session, user, profile, loading, loadingProfile, authError } = useAuth();
  const location = useLocation();

  if (loading || (loadingProfile && profile?.id !== user?.id)) {
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
  if (!session || !user || profile?.id !== user.id || !profile?.portal_access?.allowed) {
    return <Navigate to="/login" state={{ from: location, error: authError }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
