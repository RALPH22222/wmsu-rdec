import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  X,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatUserFullName } from '../utils/userUtils';
import { LogoutModal } from './LogoutModal';

export interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCreateCall?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
  onOpenCreateCall,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loadingProfile, signOut } = useAuth();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const isRpdu = location.pathname.startsWith('/rpdu');
  const basePath = isRpdu ? '/rpdu' : '/admin';

  const fullName = formatUserFullName(profile, user, isRpdu ? 'RPDU Staff' : 'Administrator');

  const roleTitle = isRpdu
    ? 'RPDU Staff'
    : 'System Administrator';

  const navItems = [
    {
      name: 'Call for Proposals',
      path: basePath,
      icon: Calendar,
      disabled: false,
    },
    {
      name: 'Preliminary Screening',
      path: `${basePath}/screening`,
      icon: ClipboardCheck,
      disabled: false,
    },
    {
      name: 'Evaluator Assignment',
      path: `${basePath}/evaluations`,
      icon: Users,
      disabled: false,
    },
    {
      name: 'Reports & Analytics',
      path: `${basePath}/reports`,
      icon: BarChart3,
      disabled: true,
    },

    {
      name: 'System Settings',
      path: `${basePath}/settings`,
      icon: Settings,
      disabled: true,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Top Header / Branding */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center -space-x-2 shrink-0">
                <div className="relative z-10 w-9 h-9 rounded-full bg-white ring-2 ring-slate-200/80 p-0.5 overflow-hidden shadow-2xs">
                  <img src="/WMSU.png" alt="WMSU" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="relative z-0 w-9 h-9 rounded-full bg-white ring-2 ring-slate-200/80 p-0.5 overflow-hidden shadow-2xs">
                  <img src="/RDEC-WMSU.png" alt="RDEC" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <div className="leading-none">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 uppercase">
                  WMSU <span className="text-[#C8102E]">RDEC</span>
                </span>
              </div>
            </Link>

            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isRpdu ? 'RPDU Management' : 'Admin Management'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  title="Coming soon"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed select-none bg-slate-50/50"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs font-semibold transition-all group ${isActive
                  ? 'bg-[#C8102E] text-white shadow-sm shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Quick Create Call Action */}
          {onOpenCreateCall && (
            <div className="pt-4 px-1">
              <button
                type="button"
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  onOpenCreateCall();
                }}
                className="w-full py-2.5 px-3.5 rounded-sm bg-gradient-to-r from-red-600 to-[#C8102E] hover:from-red-700 hover:to-[#990B21] text-white text-xs font-bold shadow-sm shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer: User Profile & Sign Out */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar Icon Badge */}
              <div className="w-10 h-10 rounded-xl bg-red-50/80 border border-red-100 flex items-center justify-center text-[#C8102E] shrink-0">
                <User className="w-5 h-5" strokeWidth={1.75} />
              </div>

              {/* User Details */}
              <div className="min-w-0">
                {loadingProfile && !profile ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 bg-slate-100 animate-pulse rounded-xs" />
                    <div className="h-2.5 w-20 bg-slate-100 animate-pulse rounded-xs" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-900 truncate leading-snug" title={fullName}>
                      {fullName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-normal" title={roleTitle}>
                      {roleTitle}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
