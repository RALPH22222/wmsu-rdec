import { AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { getMyBudgets } from '../../lib/budgetApi';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { BudgetReadOnly } from '../../components/proponentComponent/BudgetReadOnly';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ProponentBudgetEntry } from '../../types';

/** Proponent's read-only view of the Line-Item Budgets RPDU has entered for their detailed proposals. */
export function BudgetAllocationPage() {
  const { data, loading, error, refresh } = useAsyncResource<ProponentBudgetEntry[]>(
    (signal, token) => getMyBudgets(token, signal),
    []
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <p className="text-sm text-slate-600">
        RPDU prepares the Line-Item Budget for each detailed proposal. This page shows it as recorded; contact RPDU for any change.
      </p>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-12 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your budgets…
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load your budgets"
          description={error}
          action={
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold text-white bg-[#C8102E] hover:bg-[#A00D26]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="A budget appears here once you have a detailed proposal and RPDU enters its Line-Item Budget."
        />
      ) : (
        data.map((entry) => <BudgetReadOnly key={entry.detailedProposalId} entry={entry} />)
      )}
    </div>
  );
}

export default BudgetAllocationPage;
