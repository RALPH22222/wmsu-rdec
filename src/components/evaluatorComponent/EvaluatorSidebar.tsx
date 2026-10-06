import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, LogOut, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LogoutModal } from '../LogoutModal';

export interface EvaluatorSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const FOOTER_SUBTITLE = 'Technical Evaluator · Double-blind';

/** Evaluator portal sidebar (same structure as ProponentSidebar). */
export const EvaluatorSidebar: React.FC<EvaluatorSidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user, profile, loadingProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAssignedActive = location.pathname === '/evaluator' || location.pathname.startsWith('/evaluator/');

  // Capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  };

  // Full name from the profile, then auth user metadata, then the email local part (same as ProponentSidebar)
  const rawFullName = profile?.first_name
    ? [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ')
    : user?.user_metadata?.first_name
      ? [
          user.user_metadata.first_name,
          user.user_metadata.middle_name,
          user.user_metadata.last_name,
          user.user_metadata.suffix,
        ]
          .filter(Boolean)
          .join(' ')
      : user?.user_metadata?.firstName
        ? [
            user.user_metadata.firstName,
            user.user_metadata.middleName,
            user.user_metadata.lastName,
            user.user_metadata.suffix,
          ]
            .filter(Boolean)
            .join(' ')
        : user?.user_metadata?.full_name || user?.user_metadata?.name || '';

  const fullName = rawFullName.trim()
    ? capitalizeWords(rawFullName.trim())
    : user?.email
      ? capitalizeWords(user.email.split('@')[0].replace(/[._-]/g, ' '))
      : 'Evaluator';

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden" onClick={onCloseMobile} />
      )}

      {/* Sidebar Container - w-72 matching the other portals */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Top Header / Branding */}
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
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Evaluator Panel</div>
              <nav className="space-y-2">
                <Link
                  to="/evaluator"
                  onClick={onCloseMobile}
                  aria-current={isAssignedActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-sm text-left transition-colors border ${
                    isAssignedActive
                      ? 'bg-[#C8102E] text-white shadow-xs border-[#C8102E]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <ClipboardList className={`w-5 h-5 shrink-0 ${isAssignedActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">Assigned Proposals</span>
                </Link>

                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-sm text-left border border-transparent text-slate-400 cursor-not-allowed"
                >
                  <BookOpen className="w-5 h-5 shrink-0 text-slate-300" />
                  <span className="truncate flex-1">Evaluation Guidelines</span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Soon
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom User Section */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
          <div className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-red-50/80 text-[#C8102E] border border-red-100">
                <UserIcon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                {loadingProfile && !profile ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 bg-slate-100 animate-pulse rounded-xs" />
                    <div className="h-2.5 w-20 bg-slate-100 animate-pulse rounded-xs" />
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-bold text-slate-900 truncate leading-snug" title={fullName}>
                      {fullName}
                    </div>
                    <div className="text-xs text-slate-500 font-normal leading-snug mt-0.5">
                      {FOOTER_SUBTITLE}
                    </div>
                  </>
                )}
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* SweetAlert-Style Sign Out Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutModalOpen(false);
        }}
        onConfirm={handleConfirmLogout}
        loading={isLoggingOut}
      />
    </>
  );
};

export default EvaluatorSidebar;
