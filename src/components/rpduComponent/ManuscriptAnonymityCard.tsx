import { useState } from 'react';
import { Lock, ShieldCheck, Undo2 } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { ANONYMITY_ATTESTATION_LABEL, MAX_EVALUATORS_PER_PROPOSAL } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';

interface ManuscriptAnonymityCardProps {
  proposal: RpduProposal;
  onCheck: (checked: boolean) => Promise<unknown>;
}

/** RPDU's check that the manuscript file itself carries no identifying details (the double-blind gate on the third seat). */
export function ManuscriptAnonymityCard({ proposal, onCheck }: ManuscriptAnonymityCardProps) {
  const [dialog, setDialog] = useState<'check' | 'undo' | null>(null);
  const [busy, setBusy] = useState(false);
  const { attestedAt, checkedAt, checkedBy } = proposal.anonymity;
  const locked = proposal.status === 'REJECTED' || proposal.status === 'FORWARDED_TO_REO';
  const noManuscript = !proposal.manuscriptUrl;
  const disabled = locked || noManuscript;
  const latestRevision = proposal.revisions.length > 0 ? proposal.revisions.reduce((a, b) => (b.revisionNumber > a.revisionNumber ? b : a)) : null;
  const seatsLeft = Math.max(0, MAX_EVALUATORS_PER_PROPOSAL - proposal.panel.length);

  const confirm = async () => {
    if (disabled || !dialog) return;
    setBusy(true);
    try {
      await onCheck(dialog === 'check');
      setDialog(null);
    } catch { /* toast shown by the hook; keep the dialog open */ } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">Evaluators download this file as uploaded. Open it and confirm the header, title page and acknowledgements name no proponent, college, or research team before the third evaluator is assigned.</p>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-sm border border-slate-100 p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Proponent attestation</dt>
          <dd className={`mt-1 ${attestedAt ? 'text-slate-700' : 'text-amber-700'}`}>
            {attestedAt ? <>Attested {formatDateTime(attestedAt)}{latestRevision ? ` (with Revision ${latestRevision.revisionNumber})` : ''}</> : 'No attestation on file — uploaded before it was required.'}
          </dd>
          {attestedAt && <dd className="mt-1 text-[11px] text-slate-500">“{ANONYMITY_ATTESTATION_LABEL}”</dd>}
        </div>
        <div className="rounded-sm border border-slate-100 p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">RPDU check</dt>
          <dd className={`mt-1 ${checkedAt ? 'text-emerald-700' : 'text-slate-700'}`}>
            {checkedAt ? `Checked by ${checkedBy ?? 'RPDU'} on ${formatDateTime(checkedAt)}` : seatsLeft > 0 ? `Not yet checked. ${seatsLeft === 1 ? 'The last seat' : 'The third seat'} stays blocked until it is.` : 'Not recorded.'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <DocumentLink href={latestRevision?.revisedFileUrl ?? proposal.manuscriptUrl} label={latestRevision ? `Open Revision ${latestRevision.revisionNumber}` : 'Open manuscript'} muted />
        {checkedAt ? (
          <button type="button" onClick={() => setDialog('undo')} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Undo2 className="h-4 w-4" />Undo</button>
        ) : (
          <button type="button" onClick={() => setDialog('check')} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck className="h-4 w-4" />Mark as checked</button>
        )}
      </div>
      {disabled && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />{locked ? 'The anonymity check is locked once the proposal is closed.' : 'Available once the detailed proposal is submitted.'}</p>}

      <ConfirmDialog
        isOpen={dialog === 'check'}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        loading={busy}
        title="Mark the manuscript as anonymised?"
        confirmLabel="Mark as checked"
        tone="brand"
        icon={ShieldCheck}
        description={`You confirm that ${latestRevision ? `Revision ${latestRevision.revisionNumber}` : 'the manuscript'} of ${proposal.code} names no proponent, college, or research team. This releases the third evaluator seat.`}
      />
      <ConfirmDialog
        isOpen={dialog === 'undo'}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        loading={busy}
        title="Remove the anonymity check?"
        confirmLabel="Remove check"
        tone="warning"
        icon={Undo2}
        description={`${proposal.code} will show as not checked again. If the panel is still incomplete, the third seat is blocked until the check is recorded again.`}
      />
    </div>
  );
}
