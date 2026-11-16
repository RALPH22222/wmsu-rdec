import { useState } from 'react';
import { ArrowDownUp, Download, History, Lock, Plus, RefreshCw } from 'lucide-react';
import { useRevisionLog } from '../../hooks/useRevisionLog';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { paginate } from '../../lib/pagination';
import type { RevisionLogEntry } from '../../types/revisionLog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { Pagination } from '../ui/Pagination';
import { RevisionLogEntryModal } from './modals/RevisionLogEntryModal';
import { RevisionLogRow, ROW_GRID } from './revisionLog/RevisionLogRow';

const outlined = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]';

const messageOf = (failure: unknown, fallback: string) => (failure instanceof Error ? failure.message : fallback);

function LogSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading revision history">
      {[0, 1, 2].map((item) => (
        <div key={item} className="animate-pulse space-y-2 rounded-sm border border-slate-100 p-4">
          <div className="h-3 w-1/4 rounded-sm bg-slate-200" />
          <div className="h-3 w-3/4 rounded-sm bg-slate-100" />
          <div className="h-3 w-1/2 rounded-sm bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/**
 * RPDU-internal revision history of a proposal (FR-009.01 style: Version | Date | Remarks). Self-loading; render it inside
 * a card titled "Revision history". Never shown to the proponent or evaluators.
 */
export function InternalRevisionHistory({ proposalId }: { proposalId: string }) {
  const { showToast } = useCallForProposals();
  const log = useRevisionLog(proposalId);
  const { data, loading, error, refresh } = log;

  const [newestFirst, setNewestFirst] = useState(true);
  const [pageState, setPageState] = useState({ order: 'newest', page: 1 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RevisionLogEntry | null>(null);
  const [deleting, setDeleting] = useState<RevisionLogEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const order = newestFirst ? 'newest' : 'oldest';
  const page = pageState.order === order ? pageState.page : 1;
  const ordered = data ? (newestFirst ? [...data.entries].reverse() : data.entries) : [];
  const shown = paginate(ordered, page);

  const saveRemarks = async (entry: RevisionLogEntry, remarks: string) => {
    try {
      await log.saveRemarks(entry, remarks);
      setEditingKey(null);
      showToast(remarks ? 'Remarks saved.' : 'Remarks cleared.');
    } catch (failure) {
      showToast(messageOf(failure, 'Unable to save the remarks.'));
      throw failure;
    }
  };

  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await log.remove(deleting);
      showToast('Entry deleted.');
    } catch (failure) {
      showToast(messageOf(failure, 'Unable to delete the entry.'));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  };

  const exportDocx = async () => {
    if (exporting) return;
    setExporting(true);
    try { await log.exportDocx(); } catch (failure) { showToast(messageOf(failure, 'Unable to export the revision history.')); } finally { setExporting(false); }
  };

  if (loading) return <LogSkeleton />;
  if (error || !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error || 'Unable to load the revision history.'}</p>
        <button type="button" onClick={refresh} className={outlined}><RefreshCw className="h-4 w-4" />Retry</button>
      </div>
    );
  }

  const total = data.entries.length;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><Lock className="h-3.5 w-3.5" />Internal · not shared with the proponent</span>
          <span className="text-xs text-slate-500">{total} {total === 1 ? 'entry' : 'entries'}{data.counts.manual > 0 ? ` · ${data.counts.manual} manual` : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {total > 1 && (
            <button type="button" onClick={() => setNewestFirst((value) => !value)} className={outlined} aria-pressed={!newestFirst}><ArrowDownUp className="h-4 w-4" />{newestFirst ? 'Oldest first' : 'Newest first'}</button>
          )}
          <button type="button" onClick={() => setAdding(true)} className={outlined}><Plus className="h-4 w-4" />Add entry</button>
          <button type="button" onClick={() => void exportDocx()} disabled={exporting} className={outlined}><Download className="h-4 w-4" />{exporting ? 'Exporting…' : 'Export .docx'}</button>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState icon={History} title="No history yet" description="Entries appear when the proposal is submitted and revised. You can also add your own." action={<button type="button" onClick={() => setAdding(true)} className={outlined}><Plus className="h-4 w-4" />Add entry</button>} />
      ) : (
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
          <div className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${ROW_GRID}`}>
            <span>Version</span><span>Date</span><span>Record</span><span>RPDU remarks</span><span className="sr-only">Actions</span>
          </div>
          <ol className="divide-y divide-slate-100">
            {shown.items.map((entry) => (
              <RevisionLogRow
                key={entry.key}
                entry={entry}
                editing={editingKey === entry.key}
                onEditRemarks={() => setEditingKey(entry.key)}
                onCancelEdit={() => setEditingKey(null)}
                onSaveRemarks={(remarks) => saveRemarks(entry, remarks)}
                onEditEntry={() => setEditingEntry(entry)}
                onDelete={() => setDeleting(entry)}
              />
            ))}
          </ol>
        </div>
      )}

      <Pagination page={page} totalItems={total} onPageChange={(next) => setPageState({ order, page: next })} itemLabel="entries" label="Revision history pages" />

      {adding && (
        <RevisionLogEntryModal
          isOpen
          onClose={() => setAdding(false)}
          onSubmit={async (input) => {
            try { await log.addManual(input); showToast('Entry added.'); } catch (failure) { showToast(messageOf(failure, 'Unable to add the entry.')); throw failure; }
          }}
        />
      )}
      {editingEntry && (
        <RevisionLogEntryModal
          key={editingEntry.key}
          isOpen
          onClose={() => setEditingEntry(null)}
          initial={{ versionLabel: editingEntry.versionLabel, entryDate: editingEntry.date ?? '', remarks: editingEntry.remarks }}
          onSubmit={async (input) => {
            try { await log.saveManual(editingEntry, input); showToast('Entry updated.'); } catch (failure) { showToast(messageOf(failure, 'Unable to update the entry.')); throw failure; }
          }}
        />
      )}
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete this entry?"
        description="The manual entry is removed from the internal revision history. This cannot be undone."
        confirmLabel="Delete entry"
        tone="danger"
      />
    </div>
  );
}
