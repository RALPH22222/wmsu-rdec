import { useState } from 'react';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  User,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { LogoutModal } from '../LogoutModal';

export type EvaluatorSidebarProps = { mobileOpen?: boolean; onCloseMobile?: () => void };

const navItems = [
  { name: 'Evaluator Dashboard', path: '/evaluator', icon: LayoutDashboard },
  { name: 'Assigned Reviews', path: '/evaluator/reviews', icon: ClipboardList },
  { name: 'Invitation Letters', path: '/evaluator/letters', icon: FileText },
];

export function EvaluatorSidebar({ mobileOpen = false, onCloseMobile }: EvaluatorSidebarProps) {
  const { user, profile, loadingProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fullName = formatUserFullName(profile, user, 'Technical Evaluator');

  const logout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setLogoutOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close evaluator menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between border-r border-slate-200 bg-slate-50 text-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Top Header / Branding */}
          <div className="border-b border-slate-200/80 bg-white/70 p-5">
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
                  <span className="inline-block rounded-xs border border-slate-300 bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-slate-800">
                    Evaluator Desk
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close Sidebar"
                className="cursor-pointer rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-4" aria-label="Evaluator navigation">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Evaluator Workspace
            </div>
            {navItems.map((item) => {
              const active = location.pathname === item.path || (item.path !== '/evaluator' && location.pathname.startsWith(`${item.path}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-xs font-semibold transition-all border ${
                    active
                      ? 'border-[#C8102E] bg-[#C8102E] text-white shadow-2xs'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-[#C8102E]'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="border-t border-slate-200 bg-slate-100/70 p-3.5">
          <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white p-3 shadow-2xs">
            <Link
              to="/evaluator/profile"
              onClick={onCloseMobile}
              className="flex min-w-0 items-center gap-3 group"
              title="View and edit evaluator profile"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border font-bold text-xs transition-colors ${
                  location.pathname === '/evaluator/profile'
                    ? 'border-[#C8102E] bg-[#C8102E] text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-700 group-hover:border-red-200'
                }`}
              >
                <User className="h-5 w-5" strokeWidth={1.75} />
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
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                      Technical Evaluator
                    </p>
                  </>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              title="Sign Out"
              aria-label="Sign Out"
              className="shrink-0 cursor-pointer rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <LogoutModal
        isOpen={logoutOpen}
        onClose={() => {
          if (!loggingOut) setLogoutOpen(false);
        }}
        onConfirm={logout}
        loading={loggingOut}
      />
    </>
  );
}
