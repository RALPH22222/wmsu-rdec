import { useId, useState, type KeyboardEvent } from 'react';
import { PostAihrManuscript } from '../../components/proponentComponent/PostAihrManuscript';
import { ArrowRight, Clock3, FileCheck2, Inbox, XCircle, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { STAGE_META, stageExplanation } from '../../lib/aihrMeta';
import { formatDate } from '../../lib/format';
import { ProposalTemplateList } from '../../components/proponentComponent/ProposalTemplateList';
import type { PendingConcept } from '../../types';

const CARD = 'rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6';
const TAB_BASE = 'inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-3 text-base font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]';
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
        <li key={concept.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="border-l-4 border-[#C8102E] pl-3 break-words text-lg font-semibold leading-snug text-slate-900">{concept.title}</p>
            <p className="mt-2 text-base leading-relaxed text-slate-600">{stageExplanation(concept.stage)}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center self-start rounded-sm border px-3 py-1.5 text-sm font-semibold ${concept.stage === 'AIHR_FAILED' || concept.stage === 'NOT_APPROVED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{STAGE_META[concept.stage].label}</span>
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
    <button key={key} type="button" role="tab" id={`${ids}-tab-${key}`} aria-selected={tab === key} aria-controls={`${ids}-panel`} tabIndex={tab === key ? 0 : -1} onClick={() => setChosen(key)} className={`${TAB_BASE} ${tab === key ? TAB_ACTIVE : TAB_INACTIVE}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <span className={`min-w-6 rounded-sm px-1.5 py-0.5 text-sm font-bold tabular-nums ${tab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{counts[key]}</span>
    </button>
  );

  const navigateTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.key === tab);
    const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const key = TABS[next].key;
    setChosen(key);
    document.getElementById(`${ids}-tab-${key}`)?.focus();
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-base sm:space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Detailed Proposal Submission Hub</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">Submit your detailed research proposal after passing preliminary screening, before the Agency In-House Review (AIHR).</p>
      </header>

      <section aria-labelledby="detailed-template-title" className={CARD}>
        <h2 id="detailed-template-title" className="text-xl font-bold text-slate-900">Detailed Research Proposal Template</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-600">Download an RPDU template and complete your proposal. Upload a PDF (.pdf) or Word document (.doc or .docx), up to 15 MB.</p>
        <ProposalTemplateList folder="detailed-proposals" size="md" />
      </section>

      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading eligible concept proposals</span>
          <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
            {[0, 1].map((index) => <div key={index} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6"><div className="h-4 w-48 max-w-full rounded-sm bg-slate-100" /><div className="h-6 w-3/4 rounded-sm bg-slate-200" /><div className="h-12 rounded-sm bg-slate-100" /></div>)}
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-red-200 bg-red-50 p-5 text-base text-red-800">
          <p className="min-w-0 break-words">{error}</p><button type="button" onClick={refresh} className="min-h-12 rounded-sm border border-red-300 px-4 text-base font-semibold hover:bg-red-100">Try again</button>
        </div>
      ) : (
        <>
          {eligibleConcepts.length > 0 && (
            <section aria-labelledby="ready-to-submit-title" className="space-y-4">
              <h2 id="ready-to-submit-title" className="text-xl font-bold text-slate-900">Ready for detailed proposal submission</h2>
              {eligibleConcepts.map((concept) => <SubmitDetailedProposalCard key={concept.id} concept={concept} onSubmit={submitDetailedProposal} />)}
            </section>
          )}

          <section aria-labelledby="your-submissions-title" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
            <div className="space-y-4 border-b border-slate-200 p-5 sm:p-6">
              <div><h2 id="your-submissions-title" className="text-xl font-bold text-slate-900">Your submissions</h2><p className="mt-2 text-base leading-relaxed text-slate-600">Review your submitted files and follow the next stage of your proposal.</p></div>
              <div role="tablist" aria-label="Concept proposals by stage" onKeyDown={navigateTabs} className="-m-1 flex gap-2 overflow-x-auto p-1">
                {TABS.map(tabButton)}
              </div>
            </div>

            <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${tab}`} tabIndex={0} className="p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:p-6">
              {tab === 'submitted' && (submitted.length === 0 ? (
                <EmptyState size="md" icon={Inbox} title="No detailed proposals submitted yet" description={eligibleConcepts.length > 0 ? 'Use the upload form above to submit your first detailed proposal.' : 'Your proposal will appear here after it passes preliminary screening and you submit the detailed manuscript.'} action={<Link to="/proponent" className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-slate-200 px-4 text-base font-semibold text-[#C8102E] hover:bg-red-50">View concept proposals<ArrowRight className="h-5 w-5" /></Link>} />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-2xl text-base leading-relaxed text-slate-600">RPDU consolidates submitted manuscripts for AIHR. Technical review follows clearance.</p>
                    <Link to="/proponent/revisions" className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-slate-200 px-4 text-base font-semibold text-[#C8102E] hover:bg-red-50">Evaluation &amp; Revisions<ArrowRight className="h-5 w-5 shrink-0" /></Link>
                  </div>
                  <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
                    {submitted.map((proposal) => <li key={proposal.id} className="py-6 first:pt-5 last:pb-0"><h3 className="border-l-4 border-[#C8102E] pl-3 break-words text-xl font-bold leading-snug text-slate-900">{proposal.title}</h3><p className="mt-2 text-sm text-slate-500">Submitted {formatDate(proposal.submittedAt)}</p><PostAihrManuscript proposal={proposal} onSaved={refresh} /></li>)}
                  </ul>
                </>
              ))}

              {tab === 'waiting' && (waiting.length === 0 ? (
                <EmptyState size="md" icon={Clock3} title="Nothing waiting on RPDU" description="Proposals appear here while RPDU records the AIHR result and any required en banc decision." />
              ) : (
                <>
                  <p className="text-base leading-relaxed text-slate-600">RPDU is completing the Agency In-House Review or en banc deliberation for these proposals.</p>
                  <ConceptStageList concepts={waiting} />
                </>
              ))}

              {tab === 'closed' && (closed.length === 0 ? (
                <EmptyState size="md" icon={XCircle} title="No proposals marked as not proceeding" description="Proposals that did not qualify at AIHR or were not approved by the en banc are listed here." />
              ) : (
                <>
                  <p className="text-base leading-relaxed text-slate-600">These proposals are not proceeding in this call. RPDU can revisit a verdict if needed.</p>
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
