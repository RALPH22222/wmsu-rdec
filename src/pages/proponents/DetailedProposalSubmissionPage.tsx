import { PostAihrManuscript } from '../../components/proponentComponent/PostAihrManuscript';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { TONE_CLASSES } from '../../components/ui/toneClasses';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { STAGE_META, stageExplanation } from '../../lib/aihrMeta';
import { formatDate } from '../../lib/format';
import { ProposalTemplateList } from '../../components/proponentComponent/ProposalTemplateList';
import type { PendingConcept } from '../../types';

function ConceptStageList({ titleId, title, concepts }: { titleId: string; title: string; concepts: PendingConcept[] }) {
  return (
    <section aria-labelledby={titleId} className="rounded-sm border border-slate-200 bg-white p-5">
      <h2 id={titleId} className="text-sm font-bold text-slate-900">{title}</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {concepts.map((concept) => (
          <li key={concept.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{concept.title}</p><p className="mt-1 text-xs text-slate-500">{stageExplanation(concept.stage)}</p></div>
            <span className={`inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[STAGE_META[concept.stage].tone].badge}`}>{STAGE_META[concept.stage].label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DetailedProposalSubmissionPage() {
  const { proposals, eligibleConcepts, pendingConcepts, loading, error, refresh, submitDetailedProposal } = useMyPipelineProposals();
  const submitted = proposals.filter((proposal) => proposal.manuscriptUrl);
  const waiting = pendingConcepts.filter((c) => c.stage === 'AWAITING_AIHR' || c.stage === 'QUEUED_FOR_EN_BANC');
  const closed = pendingConcepts.filter((c) => c.stage === 'AIHR_FAILED' || c.stage === 'NOT_APPROVED');
  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Detailed Proposal Submission Hub</h1>
        <p className="mt-2 text-sm text-slate-600">Submit your detailed research proposal once your concept has passed preliminary screening. Submit before the Agency In-House Review.</p>
      </header>

      <section aria-labelledby="detailed-template-title" className="rounded-sm border border-slate-200 bg-white p-3 sm:p-4">
        <div>
          <h2 id="detailed-template-title" className="text-sm font-bold text-slate-900">Detailed Research Proposal Template</h2>
          <p className="mt-1 text-xs text-slate-500">Use the Detailed Research Proposal Template provided by RPDU. Upload your completed proposal as a PDF, Word, JPEG, PNG, WebP, or GIF file up to 15 MB.</p>
          <ProposalTemplateList folder="detailed-proposals" />
        </div>
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
          {eligibleConcepts.length > 0 ? (
            <section aria-labelledby="ready-to-submit-title" className="space-y-3">
              <h2 id="ready-to-submit-title" className="text-sm font-bold text-slate-900">Ready for detailed proposal submission</h2>
              {eligibleConcepts.map((concept) => <SubmitDetailedProposalCard key={concept.id} concept={concept} onSubmit={submitDetailedProposal} />)}
            </section>
          ) : (
            <EmptyState icon={FileCheck2} title={submitted.length ? 'All eligible detailed proposals have been submitted' : 'No concept proposals ready for this step'} description={submitted.length ? 'RPDU will consolidate your detailed proposal for AIHR. Technical review follows clearance.' : waiting.length > 0 ? 'Your passed concepts are listed below while RPDU completes the AIHR and en banc steps.' : 'Your concept proposal will appear here once it passes preliminary screening.'} action={<Link to={submitted.length ? '/proponent/revisions' : '/proponent'} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">{submitted.length ? 'Evaluation & Revisions' : 'View concept proposals'}<ArrowRight className="h-4 w-4" /></Link>} />
          )}

          {waiting.length > 0 && <ConceptStageList titleId="pending-concepts-title" title="Waiting on RPDU" concepts={waiting} />}
          {closed.length > 0 && <ConceptStageList titleId="closed-concepts-title" title="Not proceeding this call" concepts={closed} />}

          {submitted.length > 0 && (
            <section aria-labelledby="submitted-details-title" className="rounded-sm border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="submitted-details-title" className="text-sm font-bold text-slate-900">Submitted detailed proposals</h2>
                <Link to="/proponent/revisions" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">Evaluation & Revisions<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {submitted.map((proposal) => <li key={proposal.id} className="py-3"><p className="break-words text-sm font-semibold text-slate-900">{proposal.title}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDate(proposal.submittedAt)}</p><PostAihrManuscript proposal={proposal} onSaved={refresh} /></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
