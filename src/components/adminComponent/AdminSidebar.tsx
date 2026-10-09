import { useState } from 'react';
import { Calendar, CalendarCheck, ClipboardCheck, LogOut, Mail, User, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { LogoutModal } from './LogoutModal';

export type AdminSidebarProps = { mobileOpen?: boolean; onCloseMobile?: () => void };

const navItems = [
  { name: 'Call for Proposals', path: '/admin', icon: Calendar },
  { name: 'Preliminary Screening', path: '/admin/screening', icon: ClipboardCheck },
  { name: 'Official Letters & Contracts', path: '/admin/letters', icon: Mail },
  { name: 'Inception Scheduling', path: '/admin/scheduling', icon: CalendarCheck },
];

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const { user, profile, loadingProfile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fullName = formatUserFullName(profile, user, 'Administrator');

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

  return <>
    {mobileOpen && <button type="button" aria-label="Close admin menu" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between border-r border-slate-200 bg-white text-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
      <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2"><div className="flex shrink-0 items-center -space-x-2"><div className="relative z-10 h-9 w-9 overflow-hidden rounded-full bg-white p-0.5 shadow-2xs ring-2 ring-slate-200/80"><img src="/WMSU.png" alt="WMSU" className="h-full w-full rounded-full object-contain" /></div><div className="relative h-9 w-9 overflow-hidden rounded-full bg-white p-0.5 shadow-2xs ring-2 ring-slate-200/80"><img src="/RDEC-WMSU.png" alt="RDEC" className="h-full w-full rounded-full object-contain" /></div></div><span className="text-lg font-extrabold uppercase tracking-tight text-slate-900 sm:text-xl">WMSU <span className="text-brand">RDEC</span></span></Link>
        <button type="button" onClick={onCloseMobile} aria-label="Close Sidebar" className="cursor-pointer rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"><X className="h-5 w-5" /></button>
      </div></div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Management</div>
        {navItems.map((item) => { const active = pathname === item.path || (item.path === '/admin/screening' && pathname.startsWith('/admin/screening/')) || (item.path === '/admin' && pathname.startsWith('/admin/calls/')); const Icon = item.icon; return <Link key={item.path} to={item.path} onClick={onCloseMobile} className={`group flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-xs font-semibold transition-all ${active ? 'bg-brand text-white shadow-sm shadow-red-900/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} /><span>{item.name}</span></Link>; })}
      </nav>
      <div className="border-t border-slate-100 bg-slate-50/60 p-3.5"><div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50/80 text-brand"><User className="h-5 w-5" strokeWidth={1.75} /></div><div className="min-w-0">{loadingProfile && !profile ? <div className="space-y-1.5 py-0.5"><div className="h-3.5 w-28 animate-pulse rounded-xs bg-slate-100" /><div className="h-2.5 w-20 animate-pulse rounded-xs bg-slate-100" /></div> : <><p className="truncate text-sm font-bold leading-snug text-slate-900" title={fullName}>{fullName}</p><p className="mt-0.5 truncate text-xs text-slate-500">System Administrator</p></>}</div></div><button type="button" onClick={() => setLogoutOpen(true)} title="Sign Out" aria-label="Sign Out" className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand"><LogOut className="h-5 w-5" /></button></div></div>
    </aside>
    <LogoutModal isOpen={logoutOpen} onClose={() => { if (!loggingOut) setLogoutOpen(false); }} onConfirm={logout} loading={loggingOut} />
  </>;
}
