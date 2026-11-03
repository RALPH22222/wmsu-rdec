import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  FileSignature,
  FileText,
  FileUp,
  Handshake,
  History,
  LogOut,
  Mail,
  ScrollText,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { LogoutModal } from '../LogoutModal';

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
  const navigate = useNavigate();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isProposalActive =
    location.pathname === '/proponent' ||
    location.pathname === '/proponent/submit' ||
    location.pathname.startsWith('/proponent/proposals/') ||
    location.pathname === '/dashboard';
  const isBudgetActive = location.pathname === '/proponent/budget';
  const isDetailedProposalActive = location.pathname === '/proponent/detailed-proposals';
  const isExternalFundingActive = location.pathname === '/proponent/external-funding';
  const isMemosActive = location.pathname.startsWith('/proponent/memos');
  const isDocumentsActive =
    location.pathname.startsWith('/proponent/documents') ||
    location.pathname.startsWith('/proponent/contracts') ||
    location.pathname === '/proponent/letters';
  const isRevisionsActive = location.pathname === '/proponent/revisions';
  const isProfileActive = location.pathname === '/proponent/profile';
  const isAihrActive = location.pathname === '/proponent/aihr-invitations';

  const fullName = formatUserFullName(profile, user, 'Proponent User');

  const departmentOrRole =
    profile?.departments?.name ||
    user?.user_metadata?.department ||
    'Faculty / Student Researcher';

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { name: 'Concept Proposal', path: '/proponent', icon: FileText, active: isProposalActive },
    { name: 'Detailed Proposal', path: '/proponent/detailed-proposals', icon: FileUp, active: isDetailedProposalActive },
    { name: 'AIHR Invitations', path: '/proponent/aihr-invitations', icon: Mail, active: isAihrActive },
    { name: 'External Funding', path: '/proponent/external-funding', icon: Handshake, active: isExternalFundingActive },
    { name: 'Budget Allocation', path: '/proponent/budget', icon: DollarSign, active: isBudgetActive },
    { name: 'Memorandums', path: '/proponent/memos', icon: ScrollText, active: isMemosActive },
    { name: 'Documents & Contracts', path: '/proponent/documents', icon: FileSignature, active: isDocumentsActive },
    { name: 'Evaluation & Revisions', path: '/proponent/revisions', icon: History, active: isRevisionsActive },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close proponent menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between border-r border-slate-200 bg-white text-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Top Header / Branding */}
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex shrink-0 items-center -space-x-2">
                  <div className="relative z-10 h-9 w-9 overflow-hidden rounded-full bg-white p-0.5 shadow-2xs ring-2 ring-slate-200/80">
                    <img src="/WMSU.png" alt="WMSU" className="h-full w-full rounded-full object-contain" />
                  </div>
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white p-0.5 shadow-2xs ring-2 ring-slate-200/80">
                    <img src="/RDEC-WMSU.png" alt="RDEC" className="h-full w-full rounded-full object-contain" />
                  </div>
                </div>
                <div className="leading-tight">
                  <span className="block text-base font-extrabold uppercase tracking-tight text-slate-900 sm:text-lg">
                    WMSU <span className="text-brand">RDEC</span>
                  </span>
                  <span className="inline-block rounded-xs border border-red-200 bg-red-50 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-brand">
                    Proponent Portal
                  </span>
                </div>
              </Link>

              {/* Mobile close button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="cursor-pointer rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
                aria-label="Close Sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-4" aria-label="Proponent navigation">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Researcher Portal
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-xs font-semibold transition-all border ${
                    item.active
                      ? 'border-brand bg-brand text-white shadow-2xs'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      item.active ? 'text-white' : 'text-slate-400 group-hover:text-brand'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="border-t border-slate-100 bg-slate-50/60 p-3.5">
          <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-200/90 bg-white p-3 shadow-2xs">
            <Link
              to="/proponent/profile"
              onClick={onCloseMobile}
              className="flex min-w-0 items-center gap-3 group"
              title="Click to view and edit profile"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border font-bold text-xs transition-colors ${
                  isProfileActive
                    ? 'border-brand bg-brand text-white'
                    : 'border-red-100 bg-red-50 text-brand group-hover:border-red-300'
                }`}
              >
                <UserIcon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                {loadingProfile && !profile ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 animate-pulse rounded-xs bg-slate-100" />
                    <div className="h-2.5 w-20 animate-pulse rounded-xs bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-bold leading-snug text-slate-900" title={fullName}>
                      {fullName}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs font-normal text-slate-500"
                      title={departmentOrRole}
                    >
                      {departmentOrRole}
                    </p>
                  </>
                )}
              </div>
            </Link>

            {user && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLogoutModalOpen(true);
                }}
                className="cursor-pointer shrink-0 rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
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
