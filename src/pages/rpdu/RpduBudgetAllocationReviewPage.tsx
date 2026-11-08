import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, FileText, User, Building, Calendar, RefreshCw, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { getEligibleBudgets, getRpduBudget, reopenBudget, reviewBudget, saveBudget } from '../../lib/budgetApi';
import { computeTotals, defaultMetadata, draftFromAllocation, freshLibItems, validateLib } from '../../lib/libRules';
import { formatDate } from '../../lib/format';
import { LibEditor } from '../../components/budget/LibEditor';
import { LibTotals } from '../../components/budget/LibTotals';
import { BudgetActionPanel } from '../../components/rpduComponent/BudgetActionPanel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TONE_CLASSES } from '../../components/ui/toneClasses';
import type { StatusTone } from '../../lib/proposalPipeline';
import type { EligibleBudgetProposal, LibDraft, RpduBudgetAllocationItem } from '../../types';

/** Where the draft came from: an eligible proposal with no LIB yet, or a saved allocation. */
type Source = { kind: 'new'; entry: EligibleBudgetProposal } | { kind: 'edit'; allocation: RpduBudgetAllocationItem };

/** 409 messages the user can only clear by reloading the budget. */
const CONFLICT_MESSAGES = ['The budget changed. Reload and try again', 'This budget is accepted. Reopen it before editing'];

const NOT_ELIGIBLE = 'This proposal is not waiting for a Line-Item Budget. It may already have one.';

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const draftForEntry = (entry: EligibleBudgetProposal): LibDraft => ({
  metadata: defaultMetadata({
    studyLeader: entry.proponentName,
    coResearchers: [],
    implementingDepartment: entry.department,
    projectDuration: entry.projectDuration,
  }),
  items: freshLibItems(0, 0, entry.projectDuration === '2 Years', 'Honoraria'),
});

const StateChip: React.FC<{ tone: StatusTone; icon: React.ElementType; label: string }> = ({ tone, icon: Icon, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_CLASSES[tone].badge}`}>
    <Icon className="w-3.5 h-3.5" /> {label}
  </span>
);

const BackLink = () => (
  <Link
    to="/rpdu/budgets"
    className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
  >
    <ArrowLeft className="h-4 w-4" /> Back to Budget Allocations
  </Link>
);

interface WorkspaceProps {
  allocationId?: string;
  detailedProposalId?: string;
}

/** Keyed by the route, so moving from `new/:id` to `:allocationId` after the first save mounts a fresh workspace. */
const BudgetWorkspace: React.FC<WorkspaceProps> = ({ allocationId, detailedProposalId }) => {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showToast } = useCallForProposals();
  const navigate = useNavigate();

  const [source, setSource] = useState<Source | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<LibDraft | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<LibDraft | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [enBancInput, setEnBancInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /** Fetches the source and replaces the draft with it. Sets state only once the request settles. */
  const load = useCallback(
    (signal?: AbortSignal): Promise<void> => {
      if (!token) return Promise.resolve();
      const adopt = (next: Source) => {
        const nextDraft = next.kind === 'new' ? draftForEntry(next.entry) : draftFromAllocation(next.allocation.libItems, next.allocation.metadata, { studyLeader: next.allocation.proponentName, implementingDepartment: next.allocation.proponentDepartment });
        setSource(next);
        setDraft(nextDraft);
        setLoadedDraft(nextDraft);
        setLoadError(null);
        if (next.kind === 'edit') {
          setUpdatedAt(next.allocation.updatedAt);
          const a = next.allocation;
          const hasReview = a.isApproved || a.reviewStatus === 'REOPENED';
          const recorded = hasReview && a.enBancApprovedAmount != null && a.enBancApprovedAmount > 0 ? a.enBancApprovedAmount : null;
          setEnBancInput(String(recorded ?? (a.callBudgetCap || '')));
        } else {
          setUpdatedAt(null);
          setEnBancInput(String(next.entry.ceiling || ''));
        }
      };
      const fail = (err: unknown) => {
        if (!signal?.aborted) setLoadError(messageOf(err, 'Unable to load the budget.'));
      };
      if (allocationId) {
        return getRpduBudget(allocationId, token, signal).then((allocation) => adopt({ kind: 'edit', allocation }), fail);
      }
      return getEligibleBudgets(token, signal).then((list) => {
        const entry = list.find((e) => e.detailedProposalId === detailedProposalId);
        if (entry) adopt({ kind: 'new', entry });
        else setLoadError(NOT_ELIGIBLE);
      }, fail);
    },
    [token, allocationId, detailedProposalId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const ceiling = source ? (source.kind === 'new' ? source.entry.ceiling : source.allocation.callBudgetCap) : 0;
  const totals = useMemo(() => (draft ? computeTotals(draft.items, draft.metadata) : null), [draft]);
  const errors = useMemo(() => (draft ? validateLib(draft.items, draft.metadata, ceiling) : []), [draft, ceiling]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(loadedDraft);

  if (loadError) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <BackLink />
        <div className="p-6 bg-white border border-rose-200 rounded-sm shadow-xs text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Budget Not Available</h2>
          <p className="text-xs text-slate-500">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!source || !draft || !totals) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#C8102E] animate-spin mx-auto" />
        <p className="font-semibold text-slate-700 text-sm">Loading the Line-Item Budget...</p>
      </div>
    );
  }

  const allocation = source.kind === 'edit' ? source.allocation : null;
  const isApproved = Boolean(allocation?.isApproved);
  const header =
    source.kind === 'new'
      ? { code: source.entry.code, title: source.entry.title, proponent: source.entry.proponentName, department: source.entry.department }
      : { code: source.allocation.proposalCode, title: source.allocation.proposalTitle, proponent: source.allocation.proponentName, department: source.allocation.proponentDepartment };

  const handleReload = async () => {
    setReloading(true);
    await load();
    setReloading(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveBudget(
        {
          proposalId: source.kind === 'new' ? source.entry.detailedProposalId : source.allocation.detailedProposalId,
          libItems: draft.items,
          metadata: draft.metadata,
          expectedUpdatedAt: source.kind === 'edit' ? updatedAt : null,
        },
        token
      );
      showToast('Line-Item Budget saved');
      if (source.kind === 'new') {
        navigate(`/rpdu/budgets/${saved.allocationId}`, { replace: true });
        return;
      }
      setLoadedDraft(draft);
      setUpdatedAt(saved.updatedAt);
    } catch (err: unknown) {
      setSaveError(messageOf(err, 'Unable to save the budget.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (enBancAmount: number) => {
    if (!allocation) return;
    setAccepting(true);
    setActionError(null);
    try {
      await reviewBudget(
        allocation.id,
        { decision: 'APPROVE', enBancApprovedAmount: enBancAmount, signedLibVerifiedAmount: totals.grand.total },
        token
      );
      showToast('Budget accepted');
      await load();
    } catch (err: unknown) {
      setActionError(messageOf(err, 'Unable to accept the budget.'));
    } finally {
      setAccepting(false);
    }
  };

  const handleReopen = async () => {
    if (!allocation) return;
    setReopening(true);
    setActionError(null);
    try {
      await reopenBudget(allocation.id, token);
      showToast('Budget reopened');
      setReopenOpen(false);
      await load();
    } catch (err: unknown) {
      setReopenOpen(false);
      setActionError(messageOf(err, 'Unable to reopen the budget.'));
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        {isApproved && allocation && (
          <Link
            to={`/rpdu/letters?template=psc${
              allocation.conceptProposalId ? `&proposal=${encodeURIComponent(allocation.conceptProposalId)}` : ''
            }`}
            className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Proceed to PSC Contract Desk
          </Link>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-extrabold text-[#C8102E] bg-red-50 border border-red-100 px-2.5 py-1 rounded-sm">
              {header.code}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {source.kind === 'new' ? 'Prepare Line-Item Budget' : 'Line-Item Budget & Acceptance'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {source.kind === 'new' ? (
              <StateChip tone="slate" icon={Clock} label="Not saved yet" />
            ) : isApproved ? (
              <StateChip tone="emerald" icon={CheckCircle2} label="Accepted" />
            ) : allocation?.reviewStatus === 'REOPENED' ? (
              <StateChip tone="amber" icon={RotateCcw} label="Reopened" />
            ) : (
              <StateChip tone="amber" icon={Clock} label="Pending" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug break-words">{header.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" /> {header.proponent}
            </span>
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {header.department || 'WMSU Department'}
            </span>
            {allocation && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Created {formatDate(allocation.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <LibEditor
        value={draft}
        ceiling={ceiling}
        readOnly={isApproved}
        onChange={isApproved ? undefined : setDraft}
        durationLocked={source.kind === 'new' && source.entry.projectDuration !== null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {ceiling > 0 && <LibTotals totals={totals} ceiling={ceiling} isTwoYears={draft.metadata.projectDuration === '2 Years'} />}
        </div>
        <BudgetActionPanel
          isNew={source.kind === 'new'}
          isApproved={isApproved}
          isDirty={isDirty}
          errors={isApproved ? [] : errors}
          libTotal={totals.grand.total}
          saving={saving}
          saveError={saveError}
          saveConflict={saveError !== null && CONFLICT_MESSAGES.some((m) => saveError.includes(m))}
          reloading={reloading}
          onSave={handleSave}
          onReload={handleReload}
          enBancInput={enBancInput}
          onEnBancInputChange={setEnBancInput}
          enBancOutcome={allocation?.enBancOutcome}
          recordedEnBancAmount={allocation?.enBancApprovedAmount ?? null}
          accepting={accepting}
          actionError={actionError}
          onAccept={handleAccept}
          onReopen={() => setReopenOpen(true)}
          reviewedAt={allocation?.reviewedAt}
          reviewerName={allocation?.reviewerName}
        />
      </div>

      <ConfirmDialog
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={handleReopen}
        title="Reopen budget"
        description="Reopen this budget? The proponent will see it as being revised until you accept it again."
        confirmLabel="Reopen budget"
        tone="warning"
        loading={reopening}
      />
    </div>
  );
};

/** RPDU Line-Item Budget workspace: `/rpdu/budgets/new/:detailedProposalId` (first save) or `/rpdu/budgets/:allocationId`. */
export const RpduBudgetAllocationReviewPage: React.FC = () => {
  const { allocationId, detailedProposalId } = useParams<{ allocationId?: string; detailedProposalId?: string }>();
  return (
    <BudgetWorkspace
      key={allocationId ? `edit:${allocationId}` : `new:${detailedProposalId}`}
      allocationId={allocationId}
      detailedProposalId={detailedProposalId}
    />
  );
};
