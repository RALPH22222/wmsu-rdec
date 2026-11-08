import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, Check, RefreshCw, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationsRead, type NotificationFeed } from '../lib/notificationApi';

const dateTime = (value: string) => new Date(value).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export function NotificationBell() {
  const { session } = useAuth();
  return session ? <NotificationInbox key={session.user.id} token={session.access_token} /> : null;
}

function NotificationInbox({ token }: { token: string }) {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(20);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const saving = useRef(false);
  const mounted = useRef(true);
  const { pathname } = useLocation();

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (saving.current) return;
    const current = ++requestId.current;
    try {
      const data = await getNotifications(token, signal);
      if (!mounted.current || signal?.aborted || current !== requestId.current) return;
      setFeed(data);
      setError('');
    } catch (cause) {
      if (!mounted.current || signal?.aborted || current !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications. Try again.');
    } finally {
      if (mounted.current && !signal?.aborted && current === requestId.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const update = () => { if (document.visibilityState === 'visible') void refresh(controller.signal); };
    const initial = window.setTimeout(() => void refresh(controller.signal), 0);
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [refresh, pathname]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  const markRead = async (ids: string[]) => {
    if (saving.current || !ids.length) return;
    saving.current = true;
    requestId.current++;
    setLoading(false);
    setBusy(true);
    setError('');
    try {
      // Mark only the displayed feed snapshot, so later arrivals stay unread.
      for (let offset = 0; offset < ids.length; offset += 200) {
        const result = await markNotificationsRead(token, ids.slice(offset, offset + 200));
        if (!mounted.current) return;
        const read = new Set(result.ids);
        setFeed((previous) => {
          if (!previous) return previous;
          const items = previous.items.map((item) => read.has(item.id) ? { ...item, readAt: item.readAt || result.readAt } : item);
          return { items, unreadCount: items.filter((item) => !item.readAt).length };
        });
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Unable to mark notifications as read. Try again.');
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const count = feed?.unreadCount ?? 0;
  return <div ref={root} className="relative shrink-0" onBlur={(event) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-label={`Notifications${feed ? `, ${count} unread` : ''}`} aria-expanded={open} aria-controls={panelId}
      onClick={() => { setOpen((value) => !value); if (!open && !saving.current) { setLoading(true); void refresh(); } }}
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${focus}`}>
      <Bell aria-hidden="true" size={20} />
      {count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand px-1 text-center text-xs font-semibold leading-5 text-white">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <section id={panelId} aria-label="Notifications" className="fixed left-3 right-3 top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-sm border border-slate-200 bg-white text-slate-900 shadow-sm sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
        <h2 className="text-base font-semibold">Notifications</h2>
        <button ref={closeButton} type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm hover:bg-slate-100 ${focus}`}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-sm">
        <span role="status">{loading ? 'Updating…' : `${count} unread`}</span>
        <button type="button" disabled={busy || !count} onClick={() => void markRead((feed?.items || []).filter((item) => !item.readAt).map((item) => item.id))}
          className={`min-h-11 rounded-sm px-2 font-semibold text-brand enabled:hover:bg-slate-100 disabled:opacity-50 ${focus}`}>{busy ? 'Saving…' : 'Mark all as read'}</button>
        <button type="button" aria-label="Refresh notifications" disabled={loading || busy} onClick={() => { setLoading(true); void refresh(); }} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm hover:bg-slate-100 disabled:opacity-50 ${focus}`}><RefreshCw size={16} aria-hidden="true" /></button>
      </div>
      {error && <p role="alert" className="border-b border-slate-200 px-4 py-3 text-sm text-red-700">{error} Use Refresh to retry.</p>}
      {!feed && loading && <p role="status" className="p-4 text-sm text-slate-600">Loading notifications…</p>}
      {feed && !feed.items.length && <p className="p-4 text-sm text-slate-600">No notifications yet.</p>}
      <ul className="divide-y divide-slate-200">
        {feed?.items.slice(0, visible).map((item) => <li key={item.id} className={`px-4 py-3 ${item.readAt ? '' : 'bg-slate-50'}`}>
          <Link to={item.href} onClick={() => { setOpen(false); if (!item.readAt) void markRead([item.id]); }} className={`block min-w-0 rounded-sm py-1 ${focus}`}>
            <span className="block break-words text-sm font-semibold text-slate-900">{item.title}</span>
            <span className="mt-1 block break-words text-sm text-slate-600">{item.message}</span>
            {item.dueAt && <span className="mt-1 block text-sm text-slate-700">Deadline: {dateTime(item.dueAt)} (Manila)</span>}
            <time dateTime={item.createdAt} className="mt-1 block text-xs text-slate-600">{dateTime(item.createdAt)} (Manila)</time>
          </Link>
          {!item.readAt && <button type="button" disabled={busy} onClick={() => void markRead([item.id])} className={`mt-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-semibold text-brand enabled:hover:bg-white disabled:opacity-50 ${focus}`}><Check size={16} aria-hidden="true" />Mark as read</button>}
        </li>)}
      </ul>
      {feed && visible < feed.items.length && <button type="button" onClick={() => setVisible((value) => value + 20)} className={`min-h-11 w-full border-t border-slate-200 px-4 py-2 text-sm font-semibold text-brand hover:bg-slate-50 ${focus}`}>Show more notifications</button>}
    </section>}
  </div>;
}
