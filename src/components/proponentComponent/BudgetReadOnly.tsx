import type React from 'react';
import { CheckCircle2, Clock, FileText, Hourglass, RotateCcw } from 'lucide-react';
import { computeTotals, draftFromAllocation } from '../../lib/libRules';
import { formatDateTime } from '../../lib/format';
import { LibEditor } from '../budget/LibEditor';
import { LibTotals } from '../budget/LibTotals';
import { TONE_CLASSES } from '../ui/toneClasses';
import type { StatusTone } from '../../lib/proposalPipeline';
import type { ProponentBudgetEntry } from '../../types';

interface Chip { tone: StatusTone; icon: React.ElementType; label: string }

const chipFor = (entry: ProponentBudgetEntry): Chip => {
  const { allocation } = entry;
  if (!allocation) {
    return entry.hasClearance
      ? { tone: 'slate', icon: Hourglass, label: 'RPDU is preparing your budget' }
      : { tone: 'slate', icon: Hourglass, label: 'Awaiting technical clearance' };
  }
  if (allocation.isApproved || allocation.reviewStatus === 'APPROVED') return { tone: 'emerald', icon: CheckCircle2, label: 'Accepted' };
  if (allocation.reviewStatus === 'REOPENED') return { tone: 'amber', icon: RotateCcw, label: 'Being revised by RPDU' };
  return { tone: 'amber', icon: Clock, label: 'Budget recorded — pending RPDU acceptance' };
};

/** One detailed proposal's Line-Item Budget as the proponent sees it: status chip, read-only LIB and totals. */
export const BudgetReadOnly = ({ entry }: { entry: ProponentBudgetEntry }) => {
  const { allocation } = entry;
  const chip = chipFor(entry);
  const ChipIcon = chip.icon;
  const accepted = allocation !== null && (allocation.isApproved || allocation.reviewStatus === 'APPROVED');
  const draft = allocation ? draftFromAllocation(allocation.libItems, allocation.metadata) : null;
  const totals = draft ? computeTotals(draft.items, draft.metadata) : null;
  // The proponent has no separate ceiling; the recorded LIB total is the figure RPDU entered.
  const ceiling = allocation && totals ? Math.max(Number(allocation.totalApprovedAmount) || 0, totals.grand.total) : 0;

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <FileText className="w-5 h-5 text-[#C8102E] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">{entry.code}</p>
            <h2 className="text-base font-bold text-slate-900 font-brand break-words">{entry.title}</h2>
            {allocation?.updatedAt && (
              <p className="text-xs text-slate-500 mt-1">Last updated {formatDateTime(allocation.updatedAt)}</p>
            )}
          </div>
        </div>
        <span className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${TONE_CLASSES[chip.tone].badge}`}>
          <ChipIcon className="w-3.5 h-3.5 shrink-0" /> {chip.label}
        </span>
      </div>

      {accepted && (
        <div className={`border rounded-sm p-4 flex items-start gap-3 text-sm ${TONE_CLASSES.emerald.badge}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>Budget accepted. Proceed to gather the signatures on the printed LIB in person.</p>
        </div>
      )}

      {allocation?.reviewRemarks && allocation.reviewStatus !== 'REOPENED' && (
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-4">
          <p className="text-xs font-bold text-slate-700">RPDU remarks</p>
          <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{allocation.reviewRemarks}</p>
        </div>
      )}

      {draft && <LibEditor value={draft} ceiling={ceiling} readOnly />}
      {draft && totals && ceiling > 0 && (
        <LibTotals
          totals={totals}
          ceiling={ceiling}
          showCeiling={false}
          isTwoYears={draft.metadata.projectDuration === '2 Years'}
        />
      )}
    </section>
  );
};

export default BudgetReadOnly;
