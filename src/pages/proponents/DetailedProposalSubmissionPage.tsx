import { useId, useState } from 'react';
import { PostAihrManuscript } from '../../components/proponentComponent/PostAihrManuscript';
import { ArrowRight, Clock3, FileCheck2, Inbox, XCircle, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { TONE_CLASSES } from '../../components/ui/toneClasses';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { STAGE_META, stageExplanation } from '../../lib/aihrMeta';
import { formatDate } from '../../lib/format';
import { ProposalTemplateList } from '../../components/proponentComponent/ProposalTemplateList';
import type { PendingConcept } from '../../types';

const CARD = 'rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5';
const TAB_BASE = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-2 text-center text-xs font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:px-4 sm:text-sm';
const TAB_ACTIVE = 'bg-[#C8102E] text-white';
const TAB_INACTIVE = 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

type Tab = 'submitted' | 'waiting' | 'closed';
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'submitted', label: 'Submitted', icon: FileCheck2 },
  { key: 'waiting', label: 'Waiting on RPDU', icon: Clock3 },
  { key: 'closed', label: 'Not proceeding', icon: XCircle },
];

function ConceptStageList({ concepts }: { concepts: PendingConcept[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {concepts.map((concept) => (
        <li key={concept.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-slate-900">{concept.title}</p>
            <p className="mt-1 text-xs text-slate-500">{stageExplanation(concept.stage)}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center self-start rounded-sm border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[STAGE_META[concept.stage].tone].badge}`}>{STAGE_META[concept.stage].label}</span>
        </li>
      ))}
    </ul>
  );
}

export function DetailedProposalSubmissionPage() {
  const { proposals, eligibleConcepts, pendingConcepts, loading, error, refresh, submitDetailedProposal } = useMyPipelineProposals();
  const ids = useId();
  const submitted = proposals.filter((proposal) => proposal.manuscriptUrl);
  const waiting = pendingConcepts.filter((c) => c.stage === 'AWAITING_AIHR' || c.stage === 'QUEUED_FOR_EN_BANC');
  const closed = pendingConcepts.filter((c) => c.stage === 'AIHR_FAILED' || c.stage === 'NOT_APPROVED');
  const counts: Record<Tab, number> = { submitted: submitted.length, waiting: waiting.length, closed: closed.length };
  // The user's choice wins; before they choose, the first tab with content opens (Submitted when everything is empty).
  const [chosen, setChosen] = useState<Tab | null>(null);
  const tab: Tab = chosen ?? (TABS.find((item) => counts[item.key] > 0)?.key ?? 'submitted');

  const tabButton = ({ key, label, icon: Icon }: typeof TABS[number]) => (
    <button key={key} type="button" role="tab" id={`${ids}-tab-${key}`} aria-selected={tab === key} aria-controls={`${ids}-panel`} onClick={() => setChosen(key)} className={`${TAB_BASE} ${tab === key ? TAB_ACTIVE : TAB_INACTIVE}`}>
      <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
      <span>{label}</span>
      <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${tab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{counts[key]}</span>
    </button>
  );

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Detailed Proposal Submission Hub</h1>
        <p className="mt-1 text-sm text-slate-600">Submit your detailed research proposal once your concept has passed preliminary screening, before the Agency In-House Review.</p>
      </header>

      <section aria-labelledby="detailed-template-title" className={CARD}>
        <h2 id="detailed-template-title" className="text-sm font-bold text-slate-900">Detailed Research Proposal Template</h2>
        <p className="mt-1 text-xs text-slate-500">Use the Detailed Research Proposal Template provided by RPDU. Upload your completed proposal as a PDF, Word, JPEG, PNG, WebP, or GIF file up to 15 MB.</p>
        <ProposalTemplateList folder="detailed-proposals" />
      </section>

      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading eligible concept proposals</span>
          <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
            {[0, 1].map((index) => <div key={index} className="space-y-3 rounded-sm border border-slate-200 bg-white p-5"><div className="h-3 w-40 rounded bg-slate-100" /><div className="h-5 w-3/4 rounded bg-slate-200" /><div className="h-11 rounded bg-slate-100" /></div>)}
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Retry</button>
        </div>
      ) : (
        <>
          {eligibleConcepts.length > 0 && (
            <section aria-labelledby="ready-to-submit-title" className="space-y-3">
              <h2 id="ready-to-submit-title" className="text-sm font-bold text-slate-900">Ready for detailed proposal submission</h2>
              {eligibleConcepts.map((concept) => <SubmitDetailedProposalCard key={concept.id} concept={concept} onSubmit={submitDetailedProposal} />)}
            </section>
          )}

          <section aria-label="Your concept proposals by stage" className="space-y-3">
            <div role="tablist" aria-label="Concept proposals by stage" className="grid grid-cols-3 gap-2 sm:flex">
              {TABS.map(tabButton)}
            </div>

            <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${tab}`} className={CARD}>
              {tab === 'submitted' && (submitted.length === 0 ? (
                <EmptyState icon={Inbox} title="No detailed proposals submitted yet" description={eligibleConcepts.length > 0 ? 'Use the card above to submit your first detailed proposal.' : 'Your concept proposal will appear here once it passes preliminary screening and you submit the manuscript.'} action={<Link to="/proponent" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">View concept proposals<ArrowRight className="h-4 w-4" /></Link>} />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">RPDU consolidates submitted manuscripts for the AIHR; technical review follows clearance.</p>
                    <Link to="/proponent/revisions" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">Evaluation &amp; Revisions<ArrowRight className="h-4 w-4" /></Link>
                  </div>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {submitted.map((proposal) => <li key={proposal.id} className="py-3"><p className="break-words text-sm font-semibold text-slate-900">{proposal.title}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDate(proposal.submittedAt)}</p><PostAihrManuscript proposal={proposal} onSaved={refresh} /></li>)}
                  </ul>
                </>
              ))}

              {tab === 'waiting' && (waiting.length === 0 ? (
                <EmptyState icon={Clock3} title="Nothing waiting on RPDU" description="Concepts appear here after you submit the manuscript, until RPDU logs the AIHR verdict and any en banc decision." />
              ) : (
                <>
                  <p className="text-xs text-slate-500">RPDU is completing the Agency In-House Review or the en banc deliberation for these concepts.</p>
                  <ConceptStageList concepts={waiting} />
                </>
              ))}

              {tab === 'closed' && (closed.length === 0 ? (
                <EmptyState icon={XCircle} title="Nothing closed" description="Concepts that did not qualify at the AIHR or were not approved by the en banc are listed here." />
              ) : (
                <>
                  <p className="text-xs text-slate-500">These concepts are not proceeding in this call. RPDU can revisit a verdict if needed.</p>
                  <ConceptStageList concepts={closed} />
                </>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
