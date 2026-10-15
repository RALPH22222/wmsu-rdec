import type { ProponentProposal } from '../../types';
import { formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

/**
 * The Proposal Action Sheet (WMSU-RPDU-FR-007.00) RPDU prepared for the current round, shown at the top of the
 * proponent's "Evaluator feedback" card. It never blocks the revision upload.
 */
export function ActionSheetStrip({ proposal }: { proposal: ProponentProposal }) {
  const sheet = proposal.actionSheets.find((item) => item.round === proposal.currentRound);

  if (sheet) {
    return (
      <div className="mb-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
        <p className="text-sm font-semibold text-emerald-900">Proposal Action Sheet (round {sheet.round}) · prepared {formatDate(sheet.preparedAt)}</p>
        <p className="mt-1 text-xs text-emerald-900">Fill in the Action Taken column and upload it below with your revised manuscript and revision history.</p>
        <div className="mt-3"><DocumentLink href={sheet.fileUrl} label="Download action sheet (.docx)" /></div>
      </div>
    );
  }

  if (proposal.status === 'REVISION_REQUESTED') {
    return <p className="mb-3 rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">RPDU is preparing the Proposal Action Sheet for this round. The comments below are the same ones it will contain.</p>;
  }

  return null;
}
