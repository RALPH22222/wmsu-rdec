import { useState } from 'react';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { EvaluatorSidebar } from '../components/evaluatorComponent/EvaluatorSidebar';

export function EvaluatorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pathname === '/evaluator/reviews' ? 'Assigned Technical Reviews'
    : pathname === '/evaluator/letters' ? 'Invitation Letters'
      : pathname === '/evaluator/profile' ? 'Institutional Profile & Affiliation'
        : 'Evaluator Dashboard';

  return <div className="min-h-screen bg-slate-100 text-slate-800 lg:pl-72">
    <EvaluatorSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
    <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3.5 shadow-xs sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} aria-label="Open evaluator menu" className="p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><ChevronRight className="shrink-0 text-red-800" size={23} /><h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{title}</h1></div>
      <button type="button" aria-label="Notifications" className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Bell size={20} /></button>
    </header>
    <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
  </div>;
}
