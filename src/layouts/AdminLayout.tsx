import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronRight } from 'lucide-react';
import { AdminSidebar } from '../components/adminComponent/AdminSidebar';

export const AdminLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/admin/letters')) return 'Official Letters';
    if (location.pathname.startsWith('/admin/screening')) return 'Preliminary Screening — Concept Proposals';
    if (location.pathname.startsWith('/admin/clearance')) return 'Technical Review Clearance (COTR)';
    if (location.pathname.startsWith('/admin/contracts')) return 'Contracts & Notarization (PSC)';
    if (location.pathname.startsWith('/admin/scheduling') || location.pathname.startsWith('/admin/notarization')) return 'Inception Meetings & Special Order Scheduling';
    if (location.pathname.startsWith('/admin/proposals')) return 'Proposals Queue';
    if (location.pathname.startsWith('/admin/evaluators')) return 'Evaluators Panel';
    return 'Call for Proposals & Grants Management';
  };


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-800 font-sans selection:bg-brand selection:text-white">
      {/* Shared Sidebar */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Scoped Arrow Animation */}
        <style>{`
          @keyframes arrowMove {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(6px);
            }
          }
          .animate-arrow-move {
            animation: arrowMove 1.1s ease-in-out infinite;
          }
        `}</style>

        {/* Admin Header / Navbar (Clean White, Fully Responsive) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 mr-2">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Page Indicator with Animated Moving Arrow ">" */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <ChevronRight className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-brand animate-arrow-move shrink-0" strokeWidth={2.5} />
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-800 tracking-tight truncate">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right Header: Notifications Only */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
            </button>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
