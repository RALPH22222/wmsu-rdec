import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { RevisionLogEntry } from '../../../types/revisionLog';
import { formatDate, formatDateTime } from '../../../lib/format';
import { DocumentLink } from '../../ui/DocumentLink';
import { RemarksEditor } from './RemarksEditor';

interface RevisionLogRowProps {
  entry: RevisionLogEntry;
  editing: boolean;
  onEditRemarks: () => void;
  onCancelEdit: () => void;
  onSaveRemarks: (remarks: string) => Promise<void>;
  onEditEntry: () => void;
  onDelete: () => void;
}

export const ROW_GRID = 'lg:grid lg:grid-cols-[8rem_7rem_minmax(0,1.1fr)_minmax(0,1fr)_5.5rem] lg:gap-x-4';

const iconButton = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]';

/** One log entry: a stacked block below `lg`, a table row at `lg` and up. */
export function RevisionLogRow({ entry, editing, onEditRemarks, onCancelEdit, onSaveRemarks, onEditEntry, onDelete }: RevisionLogRowProps) {
  const isManual = entry.kind === 'MANUAL';
  const isOutcome = entry.kind === 'OUTCOME';
  return (
    <li className={`px-4 py-4 ${ROW_GRID}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lg:contents">
        <p className="min-w-0 break-words text-sm font-semibold text-slate-900 lg:self-start">{entry.versionLabel || <span className="font-normal text-slate-400">—</span>}</p>
        <p className="text-xs text-slate-500 lg:self-start lg:text-sm">{entry.date ? formatDate(entry.date) : '—'}</p>
      </div>

      <div className="mt-2 min-w-0 space-y-1.5 lg:mt-0">
        <p className={`flex flex-wrap items-center gap-2 text-sm ${isOutcome ? 'font-medium text-slate-600' : 'font-semibold text-slate-800'}`}>
          <span className="min-w-0 break-words">{entry.title}</span>
          {isManual && <span className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Manual</span>}
        </p>
        {entry.details.map((line, index) => (
          <p key={index} className={`break-words text-xs ${line.startsWith('Returned for correction') ? 'text-amber-700' : 'text-slate-500'}`}>{line}</p>
        ))}
        {entry.files.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {entry.files.map((file) => <DocumentLink key={file.label} href={file.url} label={file.label} muted />)}
          </div>
        )}
      </div>

      <div className="mt-3 min-w-0 border-t border-slate-100 pt-3 lg:mt-0 lg:border-t-0 lg:pt-0">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">RPDU remarks</p>
        {editing ? (
          <RemarksEditor key={entry.key} initial={entry.remarks} required={isManual} onSave={onSaveRemarks} onCancel={onCancelEdit} />
        ) : entry.remarks ? (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{entry.remarks}</p>
              {entry.remarksAt && <p className="mt-1 text-xs text-slate-400">Edited by {entry.remarksBy || 'RPDU'} · {formatDateTime(entry.remarksAt)}</p>}
            </div>
            {entry.editable.remarks && !isManual && <button type="button" onClick={onEditRemarks} aria-label="Edit remarks" className={`${iconButton} -mt-2 shrink-0`}><Pencil className="h-4 w-4" /></button>}
          </div>
        ) : entry.editable.remarks ? (
          <button type="button" onClick={onEditRemarks} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"><Plus className="h-4 w-4" />Add remark</button>
        ) : <span className="text-sm text-slate-400">—</span>}
      </div>

      <div className="mt-1 flex justify-end gap-1 lg:mt-0 lg:self-start">
        {(entry.editable.versionLabel || entry.editable.date) && isManual && (
          <button type="button" onClick={onEditEntry} aria-label="Edit entry" className={iconButton}><Pencil className="h-4 w-4" /></button>
        )}
        {entry.editable.deletable && <button type="button" onClick={onDelete} aria-label="Delete entry" className={`${iconButton} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>}
      </div>
    </li>
  );
}
