import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TONE_CLASSES } from '../../ui/toneClasses';
import type { DocumentTone } from './types';

interface DocumentRowProps {
  icon: LucideIcon;
  iconClassName?: string;
  code: string;
  title: string;
  meta?: ReactNode;
  status: { label: string; tone: DocumentTone };
  actions: ReactNode;
}

/** Tone chip in the same shape as StatusBadge, for document states that are not pipeline statuses. */
export function DocumentStatusChip({ label, tone }: { label: string; tone: DocumentTone }) {
  const classes = TONE_CLASSES[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-bold ${classes.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

export function DocumentRow({ icon: Icon, iconClassName = 'text-[#C8102E]', code, title, meta, status, actions }: DocumentRowProps) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">{code}</span>
            <DocumentStatusChip label={status.label} tone={status.tone} />
          </div>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">{title}</p>
          {meta && <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">{meta}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center sm:justify-end">{actions}</div>
    </li>
  );
}

export default DocumentRow;
