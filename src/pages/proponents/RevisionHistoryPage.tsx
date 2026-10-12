import { useState, type ReactNode } from 'react';
import { FileSearch } from 'lucide-react';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { HistoryList } from '../../components/ui/HistoryList';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { RoundFeedbackAccordion } from '../../components/proponentComponent/RoundFeedbackAccordion';
import { RevisionUploadForm } from '../../components/proponentComponent/RevisionUploadForm';
import { RevisionTimeline } from '../../components/proponentComponent/RevisionTimeline';

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>{children}</section>
);

export function RevisionHistoryPage() {
  const { proposals, eligibleConcepts, loading, error, refresh, submitDetailedProposal, uploadRevision } = useMyPipelineProposals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = proposals.find((item) => item.id === selectedId) ?? proposals[0] ?? null;

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading your proposals"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold sm:min-h-0 sm:py-1.5">Retry</button></p>}

      {eligibleConcepts.length > 0 && <div className="space-y-3">{eligibleConcepts.map((concept) => <SubmitDetailedProposalCard key={concept.id} concept={concept} onSubmit={submitDetailedProposal} />)}</div>}

      {proposals.length === 0 ? (
        eligibleConcepts.length === 0 && !error && <EmptyState icon={FileSearch} title="No detailed proposals yet" description="Once a concept proposal passes preliminary screening you can submit the detailed proposal here." />
      ) : (
        <div className={`grid gap-4 ${proposals.length > 1 ? 'xl:grid-cols-[18rem_minmax(0,1fr)]' : ''}`}>
          {proposals.length > 1 && (
            <ul className="flex snap-x gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible" aria-label="Your detailed proposals">
              {proposals.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <li key={item.id} className="w-64 max-w-[80vw] shrink-0 snap-start xl:w-auto">
                    <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={active} className={`min-h-11 w-full rounded-sm border p-3 text-left ${active ? 'border-[#C8102E] bg-white ring-2 ring-[#C8102E]/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <span className="block font-mono text-[11px] font-bold text-slate-500">{item.code}</span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="mt-1 block"><StatusBadge status={item.status} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selected && (
            <div key={selected.id} className="min-w-0 space-y-4">
              <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{selected.code}</span><StatusBadge status={selected.status} size="md" /><span className="text-xs text-slate-500">Round {selected.currentRound} · Submitted {formatDate(selected.submittedAt)}</span></div>
                <h2 className="mt-2 break-words font-brand text-lg font-bold text-slate-900">{selected.title}</h2>
                <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(selected.status, 'proponent')}</p>
                <div className="mt-4"><PipelineStepper status={selected.status} currentRound={selected.currentRound} compact /></div>
              </header>

              <Card title="Evaluator feedback">
                {selected.feedback.length === 0 ? <p className="text-xs text-slate-500">Feedback is released when a review round closes.</p>
                  : <div className="space-y-3">{[...selected.feedback].reverse().map((round, index) => <RoundFeedbackAccordion key={round.round} feedback={round} defaultOpen={index === 0} />)}</div>}
              </Card>

              {selected.canUploadRevision && <Card title="Upload revision"><RevisionUploadForm key={selected.currentRound} proposal={selected} onUpload={uploadRevision} /></Card>}

              <Card title="Manuscript history"><RevisionTimeline proposal={selected} /></Card>
              <Card title="Status history"><HistoryList entries={selected.history} /></Card>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default RevisionHistoryPage;
