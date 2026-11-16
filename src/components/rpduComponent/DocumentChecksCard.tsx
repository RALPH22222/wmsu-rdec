import { useState, type ReactNode } from 'react';
import { CheckCircle2, ClipboardCheck, Clock, FileCheck2, Undo2 } from 'lucide-react';
import { useDocumentChecks } from '../../hooks/useDocumentChecks';
import { formatDate } from '../../lib/format';
import { POST_APPROVAL_LABEL, type CheckState, type DocumentCheckRevision, type PostApprovalGroup, type RevisionItem } from '../../types/documentChecks';
import { REVISION_ITEM_LABEL } from '../../types/documentChecks';
import { DocumentLink } from '../ui/DocumentLink';
import { EmptyState } from '../ui/EmptyState';
import { TONE_CLASSES } from '../ui/toneClasses';
import { ReturnForCorrectionModal } from './modals/ReturnForCorrectionModal';

interface DocumentChecksCardProps { proposalId: string; onChanged?: () => void }

const STATE_META: Record<CheckState, { label: string; tone: 'blue' | 'amber' | 'emerald' }> = {
  SUBMITTED: { label: 'Awaiting check', tone: 'blue' },
  RETURNED: { label: 'Returned for correction', tone: 'amber' },
  CHECKED: { label: 'Checked', tone: 'emerald' },
};

type ReturnTarget =
  | { type: 'revision'; revision: DocumentCheckRevision }
  | { type: 'document'; id: string; label: string };

const buttonBase = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm px-4 text-sm font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:min-h-9 lg:whitespace-nowrap lg:px-3 lg:text-xs';
const primaryButton = `${buttonBase} bg-[#C8102E] text-white hover:bg-[#A00D26]`;
const neutralButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900`;

function StateChip({ state }: { state: CheckState }) {
  const meta = STATE_META[state];
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold ${tone.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />{meta.label}
    </span>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'emerald' }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-brand text-xl font-bold ${TONE_CLASSES[tone].text}`}>{value}</p>
    </div>
  );
}

function Row({ name, date, links, status, actions }: { name: string; date: string; links: ReactNode; status: ReactNode; actions: ReactNode }) {
  return (
    <li className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_12rem_19rem] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{date}</p>
        </div>
        <div className="flex flex-wrap gap-2">{links}</div>
      </div>
      <div className="min-w-0 space-y-1.5 text-sm">{status}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">{actions}</div>
    </li>
  );
}

function Who({ by, at }: { by: string | null; at: string | null }) {
  if (!at) return null;
  return <p className="text-xs text-slate-500">{by ? `by ${by} · ` : ''}{formatDate(at)}</p>;
}

function Note({ children }: { children: string }) {
  if (!children) return null;
  return <p className="whitespace-pre-line break-words rounded-sm bg-slate-50 p-2 text-xs text-slate-700">{children}</p>;
}

export function DocumentChecksCard({ proposalId, onChanged }: DocumentChecksCardProps) {
  const { data, loading, error, returnRevision, withdrawReturn, checkDocument } = useDocumentChecks(proposalId);
  const [target, setTarget] = useState<ReturnTarget | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  if (loading) return <p role="status" className="text-sm text-slate-500">Loading document checks…</p>;
  if (error || !data) return <p role="alert" className="text-sm text-red-700">{error || 'Unable to load the document checks.'}</p>;

  const changed = () => onChanged?.();
  const act = async (key: string, action: () => Promise<unknown>) => {
    setPending(key);
    try { await action(); changed(); } catch { /* toast shown by the hook */ } finally { setPending(null); }
  };

  const hasPostApproval = data.postApproval.some((group) => group.current);
  const empty = data.revisions.length === 0 && !hasPostApproval;
  if (empty) {
    return <EmptyState icon={ClipboardCheck} title="Nothing to check yet" description="Revisions and post-approval documents appear here once the proponent uploads them." />;
  }

  const submitReturn = async (note: string, items: RevisionItem[]) => {
    if (!target) return;
    const next = target.type === 'revision' ? await returnRevision(target.revision.id, note, items) : await checkDocument(target.id, 'RETURNED', note);
    changed();
    return next;
  };

  const renderRevision = (revision: DocumentCheckRevision) => {
    const links = (
      <>
        <DocumentLink href={revision.files.manuscriptUrl} label="Manuscript" muted />
        <DocumentLink href={revision.files.actionSheetUrl} label="Action Sheet" muted />
        <DocumentLink href={revision.files.revisionHistoryFileUrl} label="Revision History" muted />
      </>
    );
    const status = (
      <>
        <StateChip state={revision.state} />
        {revision.state === 'RETURNED' && revision.returned && (
          <>
            <Who by={revision.returned.by} at={revision.returned.at} />
            <p className="text-xs font-semibold text-slate-700">To fix: {revision.returned.items.map((item) => REVISION_ITEM_LABEL[item]).join(', ')}</p>
            <Note>{revision.returned.note}</Note>
          </>
        )}
        {revision.state === 'CHECKED' && revision.check && (
          <>
            <Who by={revision.check.by} at={revision.check.at} />
            <Note>{revision.check.note}</Note>
          </>
        )}
        {revision.state === 'SUBMITTED' && revision.correctedAt && <p className="text-xs text-emerald-700">Corrected by the proponent · {formatDate(revision.correctedAt)}</p>}
        {revision.state !== 'RETURNED' && <a href="#revision-comparator" className="block text-xs font-semibold text-[#C8102E] underline-offset-2 hover:underline">Cross-check in the comparator below</a>}
      </>
    );
    const actions = (
      <>
        {revision.canReturn && (
          <button type="button" onClick={() => setTarget({ type: 'revision', revision })} disabled={pending !== null} className={neutralButton}>
            <Undo2 aria-hidden="true" className="h-4 w-4 shrink-0" />Return for correction
          </button>
        )}
        {revision.canWithdrawReturn && (
          <button type="button" onClick={() => void act(`r-${revision.id}`, () => withdrawReturn(revision.id))} disabled={pending !== null} className={neutralButton}>
            {pending === `r-${revision.id}` ? 'Withdrawing…' : 'Withdraw return'}
          </button>
        )}
      </>
    );
    return <Row key={revision.id} name={`Revision ${revision.revisionNumber}`} date={`Submitted ${formatDate(revision.submittedAt)}`} links={links} status={status} actions={actions} />;
  };

  const renderGroup = (group: PostApprovalGroup) => {
    const doc = group.current;
    if (!doc) return null;
    const label = POST_APPROVAL_LABEL[group.kind];
    const busy = pending === `d-${doc.id}`;
    const status = (
      <>
        <StateChip state={doc.status} />
        {doc.status !== 'SUBMITTED' && <Who by={doc.checkedBy} at={doc.checkedAt} />}
        <Note>{doc.note}</Note>
        {group.history.length > 0 && <p className="text-xs text-slate-500">{group.history.length} earlier {group.history.length === 1 ? 'version' : 'versions'} replaced</p>}
      </>
    );
    const actions = (
      <>
        {doc.canCheck && (
          <>
            <button type="button" onClick={() => void act(`d-${doc.id}`, () => checkDocument(doc.id, 'CHECKED'))} disabled={pending !== null} className={primaryButton}>
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />{busy ? 'Saving…' : 'Mark as checked'}
            </button>
            <button type="button" onClick={() => setTarget({ type: 'document', id: doc.id, label: `${label} · v${doc.version}` })} disabled={pending !== null} className={neutralButton}>
              <Undo2 aria-hidden="true" className="h-4 w-4 shrink-0" />Return for correction
            </button>
          </>
        )}
        {doc.canUndo && (
          <button type="button" onClick={() => void act(`d-${doc.id}`, () => checkDocument(doc.id, 'SUBMITTED'))} disabled={pending !== null} className={neutralButton}>
            {busy ? 'Saving…' : 'Undo'}
          </button>
        )}
      </>
    );
    return <Row key={group.kind} name={`${label} · v${doc.version}`} date={`Uploaded ${formatDate(doc.uploadedAt)}`} links={<DocumentLink href={doc.fileUrl} label={label} muted />} status={status} actions={actions} />;
  };

  const groupTitle = 'mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500';

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Document check summary">
        <Counter label="Awaiting check" value={data.summary.pending} tone="blue" />
        <Counter label="Returned" value={data.summary.returned} tone="amber" />
        <Counter label="Checked" value={data.summary.checked} tone="emerald" />
      </dl>

      <section aria-label="Revisions">
        <h3 className={groupTitle}><Clock aria-hidden="true" className="h-3.5 w-3.5" />Revisions</h3>
        {data.revisions.length ? <ul className="divide-y divide-slate-100">{data.revisions.map(renderRevision)}</ul> : <p className="py-3 text-sm text-slate-500">No revisions uploaded yet.</p>}
      </section>

      <section aria-label="Post-approval documents">
        <h3 className={groupTitle}><FileCheck2 aria-hidden="true" className="h-3.5 w-3.5" />Post-approval documents</h3>
        {hasPostApproval ? <ul className="divide-y divide-slate-100">{data.postApproval.map(renderGroup)}</ul> : <p className="py-3 text-sm text-slate-500">The proponent has not uploaded the Action Sheet or Work Plan yet.</p>}
      </section>

      {target && (
        <ReturnForCorrectionModal
          key={target.type === 'revision' ? target.revision.id : target.id}
          title={target.type === 'revision' ? `Return Revision ${target.revision.revisionNumber} for correction` : `Return ${target.label} for correction`}
          subtitle={target.type === 'revision' ? 'Choose what the proponent must fix.' : undefined}
          chooseItems={target.type === 'revision'}
          onClose={() => setTarget(null)}
          onSubmit={submitReturn}
        />
      )}
    </div>
  );
}

export default DocumentChecksCard;
