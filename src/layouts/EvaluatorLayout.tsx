import { NotificationBell } from '../components/NotificationBell';
import { useState } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { EvaluatorSidebar } from '../components/evaluatorComponent/EvaluatorSidebar';

export function EvaluatorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pathname === '/evaluator/reviews' ? 'Technical Reviews'
    : pathname.startsWith('/evaluator/reviews/') ? 'Technical Review Assessment'
    : pathname === '/evaluator/letters' ? 'Invitation Letters'
      : pathname === '/evaluator/profile' ? 'Institutional Profile & Affiliation'
        : 'Evaluator Dashboard';

  return <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-800 selection:bg-[#C8102E] selection:text-white lg:flex-row">
    <EvaluatorSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
    <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 py-3 shadow-xs backdrop-blur-md sm:px-6 sm:py-3.5 lg:px-8">
      <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open evaluator menu" className="shrink-0 cursor-pointer rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"><Menu size={20} /></button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <ChevronRight className="animate-arrow-move h-6 w-6 shrink-0 text-[#C8102E] sm:h-6.5 sm:w-6.5" strokeWidth={2.5} />
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-800 sm:text-base lg:text-lg">{title}</h1>
        </div>
      </div>
      <NotificationBell />
    </header>
    <main className="w-full max-w-full flex-1 overflow-x-clip p-3.5 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}
