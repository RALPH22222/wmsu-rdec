import { useId, useState, type KeyboardEvent } from 'react';
import { CheckCircle2, ClipboardCheck, Lock, Undo2 } from 'lucide-react';
import type { ProponentFeedbackEvaluation, RpduProposal } from '../../types';
import { groupFeedbackByPoint } from '../../lib/feedbackByPoint';
import { formatDate, formatDateTime } from '../../lib/format';
import { DocumentViewer } from '../ui/DocumentViewer';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface RevisionComparatorProps {
  proposal: RpduProposal;
  onCheck: (revisionId: string, checked: boolean, note: string) => Promise<unknown>;
}

type Pane = 'manuscript' | 'panel';
type DocTab = 'actionSheet' | 'history' | 'comments';

const DOC_TABS: { key: DocTab; label: string }[] = [
  { key: 'actionSheet', label: 'Action sheet' },
  { key: 'history', label: 'Revision history' },
  { key: 'comments', label: 'Panel comments' },
];

const NOTE_MAX = 2000;

const tabClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm px-3 text-xs font-semibold transition-colors ${active ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

/** Panel-document tabs share one row of three equal cells on every width; labels may wrap to two lines instead of scrolling. */
const docTabClass = (active: boolean) =>
  `inline-flex min-h-11 min-w-0 items-center justify-center rounded-sm px-2 py-1 text-center text-xs font-semibold leading-tight transition-colors ${active ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

/** Left/Right/Home/End move between tabs of a tablist (focus follows selection). */
function moveTab<T>(event: KeyboardEvent<HTMLElement>, keys: T[], current: T, select: (key: T) => void) {
  const index = keys.indexOf(current);
  let next = -1;
  if (event.key === 'ArrowRight') next = (index + 1) % keys.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + keys.length) % keys.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = keys.length - 1;
  if (next < 0) return;
  event.preventDefault();
  select(keys[next]);
  const tabs = event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs[next]?.focus();
}

/** RPDU's side-by-side check of a revision: revised manuscript vs. action sheet, revision history and the panel's comments. */
export function RevisionComparator({ proposal, onCheck }: RevisionComparatorProps) {
  const baseId = useId();
  const revisions = [...proposal.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);
  const [selectedId, setSelectedId] = useState(revisions[0]?.id);
  const [pane, setPane] = useState<Pane>('manuscript');
  const [docTab, setDocTab] = useState<DocTab>('actionSheet');
  const [dialog, setDialog] = useState<'check' | 'undo' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = revisions.find((revision) => revision.id === selectedId) ?? revisions[0];
  if (!selected) return null;

  const n = selected.revisionNumber;
  const round = selected.revisionNumber;
  const locked = proposal.status === 'REJECTED' || proposal.status === 'FORWARDED_TO_REO';
  const lockHintId = `${baseId}-lock`;
  const checkDisabled = locked;
  const checkHintId = locked ? lockHintId : undefined;

  const evaluations: ProponentFeedbackEvaluation[] = proposal.panel.flatMap((seat) =>
    seat.submissions.filter((s) => s.round === round).map((s) => ({
      blindLabel: `${seat.evaluatorName} (${seat.blindLabel})`,
      recommendation: s.recommendation,
      checklist: s.checklist,
      remarks: s.remarks,
      actionSheetUrl: s.actionSheetUrl,
      submittedAt: s.submittedAt,
    })),
  );
  const feedback = groupFeedbackByPoint(evaluations);

  const openCheck = () => { setNote(''); setDialog('check'); };
  const confirm = async () => {
    setBusy(true);
    try {
      await onCheck(selected.id, dialog === 'check', dialog === 'check' ? note : '');
      setDialog(null);
    } catch { /* toast shown by the hook; keep the dialog open */ } finally { setBusy(false); }
  };

  const revisionTabsId = (id: string) => `${baseId}-rev-${id}`;
  const docTabId = (key: DocTab) => `${baseId}-doc-${key}`;
  const revisionPanelId = `${baseId}-revision-panel`;
  const docPanelId = `${baseId}-doc-panel`;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Revisions" className="flex flex-wrap gap-2" onKeyDown={(event) => moveTab(event, revisions.map((r) => r.id), selected.id, setSelectedId)}>
        {revisions.map((revision) => {
          const active = revision.id === selected.id;
          return (
            <button key={revision.id} id={revisionTabsId(revision.id)} type="button" role="tab" aria-selected={active} aria-controls={revisionPanelId} tabIndex={active ? 0 : -1} onClick={() => setSelectedId(revision.id)} className={tabClass(active)}>
              Revision {revision.revisionNumber}
              {revision.check && <CheckCircle2 className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-emerald-600'}`} aria-label="cross-checked" />}
            </button>
          );
        })}
      </div>

      <div id={revisionPanelId} role="tabpanel" aria-labelledby={revisionTabsId(selected.id)} className="space-y-4">
        <p className="text-xs text-slate-500">Submitted {formatDate(selected.submittedAt)} · answers the panel's round {round} comments</p>

        {selected.notes && (
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notes from the proponent</h4>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{selected.notes}</p>
          </div>
        )}

        {selected.check ? (
          <div className="flex flex-col gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />Cross-checked by {selected.check.checkedBy ?? 'RPDU'} on {formatDateTime(selected.check.checkedAt)}</p>
              {selected.check.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-emerald-900">{selected.check.note}</p>}
            </div>
            <button type="button" onClick={() => setDialog('undo')} disabled={checkDisabled} aria-describedby={checkHintId} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Undo2 className="h-4 w-4" />Undo</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-sm border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">Confirm that Revision {n} answers every comment on the action sheet.</p>
            <button type="button" onClick={openCheck} disabled={checkDisabled} aria-describedby={checkHintId} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><ClipboardCheck className="h-4 w-4" />Mark as cross-checked</button>
          </div>
        )}
        {locked && <p id={lockHintId} className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Revision checks are locked once the proposal is closed</p>}

        <div role="group" className="grid grid-cols-2 gap-2 lg:hidden" aria-label="Choose a pane">
          {([['manuscript', 'Manuscript'], ['panel', 'Panel documents']] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={pane === key} onClick={() => setPane(key)} className={`${tabClass(pane === key)} justify-center`}>{label}</button>
          ))}
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-4">
          <div className={`min-w-0 ${pane === 'manuscript' ? '' : 'hidden lg:block'}`}>
            <DocumentViewer url={selected.revisedFileUrl} title={`Revised manuscript · Revision ${n}`} />
          </div>

          <div className={`min-w-0 space-y-3 ${pane === 'panel' ? '' : 'hidden lg:block'}`}>
            <div role="tablist" aria-label="Panel documents" className="grid grid-cols-3 gap-1" onKeyDown={(event) => moveTab(event, DOC_TABS.map((tab) => tab.key), docTab, setDocTab)}>
              {DOC_TABS.map((tab) => (
                <button key={tab.key} id={docTabId(tab.key)} type="button" role="tab" aria-selected={docTab === tab.key} aria-controls={docPanelId} tabIndex={docTab === tab.key ? 0 : -1} onClick={() => setDocTab(tab.key)} className={docTabClass(docTab === tab.key)}>{tab.label}</button>
              ))}
            </div>
            <div id={docPanelId} role="tabpanel" aria-labelledby={docTabId(docTab)}>
              {docTab === 'actionSheet' && <DocumentViewer url={selected.actionSheetFileUrl} title={`Action sheet · Revision ${n}`} emptyMessage="Not provided with this revision (uploaded before the action sheet was required)." />}
              {docTab === 'history' && <DocumentViewer url={selected.revisionHistoryFileUrl} title={`Revision history · Revision ${n}`} />}
              {docTab === 'comments' && (
                <div className="max-h-[70vh] overflow-y-auto rounded-sm border border-slate-200 bg-white p-3">
                  {feedback.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">No panel comments recorded for round {round}.</p> : (
                    <div className="space-y-4">
                      {feedback.map(({ group, points }) => (
                        <section key={group.id}>
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h4>
                          <ul className="mt-2 space-y-3">
                            {points.map(({ point, notes }) => (
                              <li key={point.id} className="rounded-sm border border-slate-100 p-3">
                                <p className="text-sm font-semibold text-slate-900">{point.label}</p>
                                <ul className="mt-1.5 space-y-1">
                                  {notes.map(({ blindLabel, entry }) => (
                                    <li key={blindLabel} className="break-words text-xs text-slate-700">
                                      <span className="font-semibold text-slate-900">{blindLabel}:</span>{' '}
                                      {entry.present === 'NA' && <span className="text-slate-500">Marked N/A{entry.comment.trim() ? ' · ' : ''}</span>}
                                      {entry.comment.trim() && <span className="whitespace-pre-wrap">{entry.comment}</span>}
                                      {entry.pageRef.trim() && <span className="text-slate-500"> (p. {entry.pageRef})</span>}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialog === 'check'}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        loading={busy}
        title={`Mark Revision ${n} as cross-checked?`}
        confirmLabel="Mark as cross-checked"
        tone="brand"
        icon={ClipboardCheck}
        description={(
          <div className="space-y-3 text-left">
            <p>Confirms that Revision {n} answers every comment on the action sheet.</p>
            <label htmlFor={`${baseId}-note`} className="block text-xs font-bold text-slate-700">Note (optional)</label>
            <textarea id={`${baseId}-note`} value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={NOTE_MAX} disabled={busy} className="w-full rounded-sm border border-slate-200 p-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" />
            <p className="text-right text-[11px] text-slate-500">{note.length}/{NOTE_MAX}</p>
          </div>
        )}
      />
      <ConfirmDialog
        isOpen={dialog === 'undo'}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        loading={busy}
        tone="warning"
        title="Remove the cross-check?"
        confirmLabel="Remove"
        description={`Revision ${n} will show as not cross-checked, and the gateway will wait for it again.`}
      />
    </div>
  );
}

export default RevisionComparator;
