import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export default function Layout() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8 flex flex-col gap-6">
        <div className="h-16 w-full bg-slate-200 animate-pulse rounded-sm"></div>
        <div className="flex-1 flex gap-6">
          <div className="w-64 bg-slate-200 animate-pulse rounded-sm h-full min-h-[500px]"></div>
          <div className="flex-1 bg-slate-200 animate-pulse rounded-sm h-full min-h-[500px]"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-red-800 tracking-tight">WMSU RPDS</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserIcon className="w-4 h-4" />
            <span className="font-medium">{user.email}</span>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-slate-600 hover:text-red-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
