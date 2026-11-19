import { useState } from 'react';
import {
  Archive,
  FolderArchive,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Gavel,
  Handshake,
  LogOut,
  Mail,
  Receipt,
  ScrollText,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { LogoutModal } from './LogoutModal';

export type RpduSidebarProps = { mobileOpen?: boolean; onCloseMobile?: () => void };

const navGroups = [
  {
    id: 'proposal-pipeline',
    label: 'Proposal Pipeline',
    items: [
      { name: 'Call for Proposals', path: '/rpdu', icon: Calendar },
      { name: 'Preliminary Screening', path: '/rpdu/screening', icon: ClipboardCheck },
      { name: 'Technical Evaluations', path: '/rpdu/evaluations', icon: Users },
    ],
  },
  {
    id: 'aihr-scheduling',
    label: 'AIHR & Scheduling',
    items: [
      { name: 'AIHR Invitations', path: '/rpdu/aihr-invitations', icon: Mail },
      { name: 'AIHR & En Banc', path: '/rpdu/aihr', icon: Gavel },
      { name: 'Inception Scheduling', path: '/rpdu/scheduling', icon: CalendarCheck },
    ],
  },
  {
    id: 'funding-external',
    label: 'Funding & External Projects',
    items: [
      { name: 'Budget Allocations', path: '/rpdu/budgets', icon: Receipt },
      { name: 'External Funding Requests', path: '/rpdu/external-funding', icon: Handshake },
      { name: 'Outsourced Projects', path: '/rpdu/outsourced-projects', icon: FolderArchive },
    ],
  },
  {
    id: 'documents-archive',
    label: 'Documents & Archive',
    items: [
      { name: 'Official Memorandums', path: '/rpdu/memos', icon: ScrollText },
      { name: 'Official Letters & Contracts', path: '/rpdu/letters', icon: Mail },
      { name: 'Issued Documents Archive', path: '/rpdu/archive', icon: Archive },
    ],
  },
];

export function RpduSidebar({ mobileOpen = false, onCloseMobile }: RpduSidebarProps) {
  const { user, profile, loadingProfile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Authority strictly decided by database / user profile (is_rpdu_head)
  const isHead =
    profile?.role === 'ADMIN' ||
    Boolean(profile?.is_rpdu_head || user?.user_metadata?.is_rpdu_head);

  const defaultRoleTitle = isHead ? 'RPDU Unit Head' : 'RPDU Staff';
  const fullName = formatUserFullName(profile, user, defaultRoleTitle);
  const isProfileActive = pathname === '/rpdu/profile';

  const logout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  // Keep neutral sidebar surfaces; distinguish the head with a yellow badge and profile icon.
  const roleStyles = isHead
    ? {
        sidebarBg: 'bg-slate-50',
        sidebarBorder: 'border-slate-200',
        headerBg: 'bg-white/70',
        headerBorder: 'border-slate-200/80',
        rolePillBg: 'bg-amber-100',
        rolePillBorder: 'border-amber-300',
        rolePillText: 'text-amber-900',
        rolePillLabel: 'RPDU Head',
        sectionLabelColor: 'text-slate-500',
        navActive: 'border-brand-dark bg-brand-dark text-white shadow-2xs',
        navActiveIcon: 'text-white',
        navHover: 'hover:border-slate-200 hover:bg-white/80 hover:text-slate-900',
        footerBg: 'bg-slate-100/70',
        footerBorder: 'border-slate-200',
        cardBorder: 'border-slate-200',
        cardBg: 'bg-white',
        avatarBg: 'bg-amber-100',
        avatarBorder: 'border-amber-300',
        avatarText: 'text-amber-800',
        profileSubtitle: 'text-slate-600',
      }
    : {
        sidebarBg: 'bg-slate-50',
        sidebarBorder: 'border-slate-200',
        headerBg: 'bg-white/70',
        headerBorder: 'border-slate-200/80',
        rolePillBg: 'bg-slate-200/80',
        rolePillBorder: 'border-slate-300',
        rolePillText: 'text-slate-800',
        rolePillLabel: 'RPDU Staff',
        sectionLabelColor: 'text-slate-400',
        navActive: 'border-brand bg-brand text-white shadow-2xs',
        navActiveIcon: 'text-white',
        navHover: 'hover:border-slate-200 hover:bg-white/80 hover:text-slate-900',
        footerBg: 'bg-slate-100/70',
        footerBorder: 'border-slate-200',
        cardBorder: 'border-slate-200',
        cardBg: 'bg-white',
        avatarBg: 'bg-slate-100',
        avatarBorder: 'border-slate-200',
        avatarText: 'text-slate-700',
        profileSubtitle: 'text-slate-600',
      };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close RPDU menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-r ${roleStyles.sidebarBorder} ${roleStyles.sidebarBg} text-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Top Header / Branding */}
          <div className={`shrink-0 border-b ${roleStyles.headerBorder} ${roleStyles.headerBg} p-5`}>
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
                  <span
                    className={`inline-block rounded-xs border ${roleStyles.rolePillBorder} ${roleStyles.rolePillBg} px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${roleStyles.rolePillText}`}
                  >
                    {roleStyles.rolePillLabel}
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
          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-4" aria-label="RPDU navigation">
            {navGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                role="group"
                aria-labelledby={`rpdu-nav-group-${group.id}`}
                className={groupIndex > 0 ? 'border-t border-slate-200/70 pt-3.5' : undefined}
              >
                <p
                  id={`rpdu-nav-group-${group.id}`}
                  className={`px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider ${roleStyles.sectionLabelColor}`}
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.path ||
                      (item.path === '/rpdu/budgets' && pathname.startsWith('/rpdu/budgets')) ||
                      (item.path === '/rpdu/memos' &&
                        (pathname.startsWith('/rpdu/memos') || pathname.startsWith('/rpdu/aihr-memos'))) ||
                      (item.path === '/rpdu/archive' &&
                        (pathname.startsWith('/rpdu/archive') || pathname.startsWith('/rpdu/issued-documents'))) ||
                      (item.path === '/rpdu/letters' && pathname.startsWith('/rpdu/letters/')) ||
                      (item.path === '/rpdu/outsourced-projects' && pathname.startsWith('/rpdu/outsourced-projects/')) ||
                      (item.path === '/rpdu/screening' && pathname.startsWith('/rpdu/screening/')) ||
                      (item.path === '/rpdu/evaluations' && pathname.startsWith('/rpdu/evaluations/')) ||
                      (item.path === '/rpdu' && pathname.startsWith('/rpdu/calls/'));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onCloseMobile}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-xs font-semibold transition-all border ${
                          active
                            ? roleStyles.navActive
                            : `border-transparent text-slate-700 ${roleStyles.navHover}`
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            active ? roleStyles.navActiveIcon : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className={`shrink-0 border-t ${roleStyles.footerBorder} ${roleStyles.footerBg} p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]`}>
          <div
            className={`flex items-center justify-between gap-3 rounded-sm border ${roleStyles.cardBorder} ${roleStyles.cardBg} p-3 shadow-2xs`}
          >
            <Link
              to="/rpdu/profile"
              onClick={onCloseMobile}
              aria-current={isProfileActive ? 'page' : undefined}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              title="Click to view and edit profile"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                  isProfileActive
                    ? isHead
                      ? 'border-amber-700 bg-amber-700 text-white'
                      : 'border-slate-700 bg-slate-700 text-white'
                    : isHead
                      ? `${roleStyles.avatarBorder} ${roleStyles.avatarBg} ${roleStyles.avatarText} group-hover:border-amber-400`
                      : `${roleStyles.avatarBorder} ${roleStyles.avatarBg} ${roleStyles.avatarText} group-hover:border-slate-300`
                }`}
              >
                <User aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
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
                    <p className={`mt-0.5 truncate text-xs font-medium ${roleStyles.profileSubtitle}`}>
                      {defaultRoleTitle}
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
              className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
