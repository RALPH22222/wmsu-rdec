import type { StatusHistoryEntry } from '../../types';
import { STATUS_META } from '../../lib/proposalPipeline';
import { TONE_CLASSES } from './toneClasses';
import { formatDateTime } from '../../lib/format';

export function HistoryList({ entries }: { entries: StatusHistoryEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-slate-500">No status changes yet.</p>;
  return (
    <ol className="space-y-3">
      {[...entries].reverse().map((entry, index) => {
        const meta = STATUS_META[entry.status];
        return (
          <li key={`${entry.changedAt}-${index}`} className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_CLASSES[meta.tone].dot}`} aria-hidden="true" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-slate-900">{meta.label} <span className="font-normal text-slate-500">· Round {entry.round}</span></p>
              <p className="text-slate-500">{formatDateTime(entry.changedAt)}{(entry.changedBy ?? entry.actorRole) ? ` · ${entry.changedBy ?? entry.actorRole}` : ''}{entry.note ? ` · ${entry.note}` : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
