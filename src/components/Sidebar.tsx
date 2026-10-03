import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  X
} from 'lucide-react';
import { useCallForProposals } from '../context/CallForProposalsContext';

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
  const { currentUser, activeCall } = useCallForProposals();

  const isRpdu = location.pathname.startsWith('/rpdu');
  const basePath = isRpdu ? '/rpdu' : '/admin';

  const navItems = [
    {
      name: 'Call for Proposals',
      path: basePath,
      icon: Calendar,
      badge: activeCall ? 'Active' : undefined,
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
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
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed select-none bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200/60">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${isActive
                  ? 'bg-[#C8102E] text-white shadow-sm shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : item.badgeColor
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
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
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-[#C8102E] hover:from-red-700 hover:to-[#990B21] text-white text-xs font-bold shadow-sm shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer: Merged User Profile & Sign Out */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatarUrl || '/RDEC-WMSU.png'}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.title}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Logged out from ${isRpdu ? 'RPDU' : 'Admin'} Portal`)}
              className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border border-red-100 bg-white shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
