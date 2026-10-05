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
  const { user, profile, loadingProfile, signOut } = useAuth();
  const location = useLocation();

  const isProposalActive =
    location.pathname === '/proponent' ||
    location.pathname === '/proponent/submit' ||
    location.pathname === '/dashboard';
  const isBudgetActive = location.pathname === '/proponent/budget';
  const isProfileActive = location.pathname === '/proponent/profile';

  // Capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  };

  // Compute Full Name from profile or auth user metadata or fallback, with capitalized first letters
  const rawFullName = profile
    ? [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
        .filter(Boolean)
        .join(' ')
    : user?.user_metadata?.first_name
    ? [
        user.user_metadata.first_name,
        user.user_metadata.middle_name,
        user.user_metadata.last_name,
        user.user_metadata.suffix,
      ]
        .filter(Boolean)
        .join(' ')
    : user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ')
    : 'Proponent User';

  const fullName = capitalizeWords(rawFullName);

  const departmentOrRole =
    profile?.departments?.name ||
    user?.user_metadata?.department ||
    'Proponent / Researcher';

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
              <nav className="space-y-2">
                <Link
                  to="/proponent"
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-sm text-left transition-colors border ${
                    isProposalActive
                      ? 'bg-[#C8102E] text-white shadow-xs border-[#C8102E]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <FileText className={`w-5 h-5 shrink-0 ${isProposalActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">Concept Proposal</span>
                </Link>

                <Link
                  to="/proponent/budget"
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-sm text-left transition-colors border ${
                    isBudgetActive
                      ? 'bg-[#C8102E] text-white shadow-xs border-[#C8102E]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <DollarSign className={`w-5 h-5 shrink-0 ${isBudgetActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">Budget Allocation</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <Link
            to="/proponent/profile"
            onClick={onCloseMobile}
            className={`w-full flex items-center justify-between gap-2.5 p-3 rounded-sm transition-all cursor-pointer group text-left ${
              isProfileActive
                ? 'bg-red-50/80 border border-red-200 shadow-2xs'
                : 'bg-white border border-slate-200 hover:border-red-200 hover:bg-slate-50/90 shadow-2xs'
            }`}
            title="Click to view and edit profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8.5 h-8.5 rounded-sm flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isProfileActive
                    ? 'bg-[#C8102E] text-white'
                    : 'bg-red-50 text-[#C8102E] border border-red-100 group-hover:bg-[#C8102E] group-hover:text-white'
                }`}
              >
                <UserIcon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                {loadingProfile && !profile ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3 w-28 bg-slate-100 animate-pulse rounded-xs" />
                    <div className="h-2 w-16 bg-slate-100 animate-pulse rounded-xs" />
                  </div>
                ) : (
                  <>
                    <div
                      className="text-xs font-bold text-slate-900 truncate group-hover:text-[#C8102E] transition-colors"
                      title={fullName}
                    >
                      {fullName}
                    </div>
                    <div
                      className="text-[10px] text-slate-500 font-medium leading-none truncate mt-0.5"
                      title={departmentOrRole}
                    >
                      {departmentOrRole}
                    </div>
                  </>
                )}
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  signOut();
                }}
                className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-slate-100 rounded-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200 shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
};
