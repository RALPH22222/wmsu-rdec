import { ArrowRight, FileCheck2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { formatDate } from '../../lib/format';

export function DetailedProposalSubmissionPage() {
  const { proposals, eligibleConcepts, loading, error, refresh, submitDetailedProposal } = useMyPipelineProposals();
  const submitted = proposals.filter((proposal) => proposal.manuscriptUrl);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Detailed Proposal Submission Hub</h1>
        <p className="mt-2 text-sm text-slate-600">Submit your detailed research proposal after your concept proposal passes preliminary screening.</p>
      </header>

      <section aria-labelledby="detailed-template-title" className="rounded-sm border border-slate-200 bg-white p-5">
        <div>
          <h2 id="detailed-template-title" className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-[#C8102E]" />Detailed Research Proposal Template</h2>
          <p className="mt-1 text-xs text-slate-500">Use the Detailed Research Proposal Template provided by RPDU. Upload your completed proposal as a PDF or Word document up to 15 MB.</p>
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
            <EmptyState icon={FileCheck2} title={submitted.length ? 'All eligible detailed proposals have been submitted' : 'No concept proposals ready for this step'} description={submitted.length ? 'Follow evaluator feedback and upload requested revisions in Evaluation & Revisions.' : 'Your concept proposal will appear here once it passes preliminary screening.'} action={<Link to={submitted.length ? '/proponent/revisions' : '/proponent'} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">{submitted.length ? 'Evaluation & Revisions' : 'View concept proposals'}<ArrowRight className="h-4 w-4" /></Link>} />
          )}

          {submitted.length > 0 && (
            <section aria-labelledby="submitted-details-title" className="rounded-sm border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="submitted-details-title" className="text-sm font-bold text-slate-900">Submitted detailed proposals</h2>
                <Link to="/proponent/revisions" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#C8102E]">Evaluation & Revisions<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {submitted.map((proposal) => <li key={proposal.id} className="py-3"><p className="break-words text-sm font-semibold text-slate-900">{proposal.title}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDate(proposal.submittedAt)}</p></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
