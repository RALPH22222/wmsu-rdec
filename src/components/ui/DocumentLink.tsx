import { ArrowUpRight, FileText } from 'lucide-react';

interface DocumentLinkProps { href: string | null | undefined; label: string; muted?: boolean; size?: 'sm' | 'md' }

const safeUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

export function DocumentLink({ href, label, muted = false, size = 'sm' }: DocumentLinkProps) {
  const url = safeUrl(href);
  const sizing = size === 'md' ? 'min-h-12 gap-2 px-4 py-2.5 text-base' : 'min-h-11 gap-1.5 px-3 text-sm';
  const iconSize = size === 'md' ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0';
  if (!url) return <span className={`inline-flex max-w-full items-center rounded-sm bg-slate-100 text-slate-500 ${sizing}`}><FileText className={iconSize} /><span className="min-w-0 break-words">{label} unavailable</span></span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex max-w-full items-center rounded-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${sizing} ${muted ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-[#C8102E] text-white hover:bg-[#A00D26]'}`}>
      <FileText className={iconSize} /><span className="min-w-0 break-words">{label}</span><ArrowUpRight className={iconSize} />
    </a>
  );
}
