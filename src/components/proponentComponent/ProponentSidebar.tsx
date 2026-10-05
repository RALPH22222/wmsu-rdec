import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  X,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface ProponentSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const ProponentSidebar: React.FC<ProponentSidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const displayEmail = user?.email || 'proponent.lead@wmsu.edu.ph';

  const isProposalActive =
    location.pathname === '/proponent' ||
    location.pathname === '/proponent/submit' ||
    location.pathname === '/dashboard';
  const isBudgetActive = location.pathname === '/proponent/budget';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container - Exactly w-72 matching RPDU sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Top Header / Branding matching RPDU */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center -space-x-2 shrink-0">
                <div className="relative z-10 w-9 h-9 rounded-full bg-white ring-2 ring-slate-200/80 p-0.5 overflow-hidden shadow-2xs">
                  <img src="/WMSU.png" alt="WMSU" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="relative z-0 w-9 h-9 rounded-full bg-white ring-2 ring-slate-200/80 p-0.5 overflow-hidden shadow-2xs">
                  <img src="/RDEC-WMSU.png" alt="RDEC" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 uppercase block">
                  WMSU <span className="text-[#C8102E]">RDEC</span>
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="p-4 space-y-6">
            <div>
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Proponent Management
              </div>
              <nav className="space-y-1.5">
                <Link
                  to="/proponent"
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-sm text-left transition-colors border ${
                    isProposalActive
                      ? 'bg-[#C8102E] text-white shadow-xs border-[#C8102E]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${isProposalActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">Concept Proposal</span>
                </Link>

                <Link
                  to="/proponent/budget"
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-sm text-left transition-colors border ${
                    isBudgetActive
                      ? 'bg-[#C8102E] text-white shadow-xs border-[#C8102E]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <DollarSign className={`w-4 h-4 shrink-0 ${isBudgetActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">Budget Allocation</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-sm border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center font-bold text-xs shrink-0 border border-red-100">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate" title={displayEmail}>
                  {displayEmail.split('@')[0]}
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none truncate mt-0.5">
                  Proponent / Researcher
                </div>
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={signOut}
                className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-slate-100 rounded-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
