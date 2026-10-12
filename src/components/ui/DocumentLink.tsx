import { ArrowUpRight, FileText } from 'lucide-react';

interface DocumentLinkProps { href: string | null | undefined; label: string; muted?: boolean }

const safeUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

export function DocumentLink({ href, label, muted = false }: DocumentLinkProps) {
  const url = safeUrl(href);
  if (!url) return <span className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-slate-100 px-3 text-sm text-slate-500"><FileText className="h-4 w-4" />{label} unavailable</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold ${muted ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-[#C8102E] text-white hover:bg-[#A00D26]'}`}>
      <FileText className="h-4 w-4" />{label}<ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}
