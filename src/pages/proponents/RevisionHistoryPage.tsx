import { stageExplanation } from '../../lib/aihrMeta';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FileSearch, History, MessageSquare, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { nextStepFor } from '../../lib/proposalPipeline';
import { formatDate, formatDateTime } from '../../lib/format';
import { ProposalStatusBadge } from '../../components/ui/ProposalStatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { HistoryList } from '../../components/ui/HistoryList';
import { RoundFeedbackAccordion } from '../../components/proponentComponent/RoundFeedbackAccordion';
import { RevisionUploadForm } from '../../components/proponentComponent/RevisionUploadForm';
import { RevisionTimeline } from '../../components/proponentComponent/RevisionTimeline';
import { ActionSheetStrip } from '../../components/proponentComponent/ActionSheetStrip';
import { ClarificationThread } from '../../components/ui/ClarificationThread';

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section><h3 className="mb-5 border-b border-slate-100 pb-3 text-xl font-bold text-slate-800">{title}</h3><div className="space-y-5">{children}</div></section>
);

const TABS = [
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'revision', label: 'Submit Revision', icon: Upload },
  { key: 'history', label: 'History', icon: History },
] as const;
type RevisionTab = typeof TABS[number]['key'];

export function RevisionHistoryPage() {
  const { proposals, eligibleConcepts, loading, error, refresh, uploadRevision, clarify } = useMyPipelineProposals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RevisionTab>('feedback');
  const ids = useId();
  const selected = proposals.find((item) => item.id === selectedId) ?? proposals[0] ?? null;

  const selectTab = (tab: RevisionTab) => {
    setActiveTab(tab);
    document.getElementById(`${ids}-tab-${tab}`)?.focus();
  };
  const navigateTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(TABS[next].key);
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-base sm:space-y-8">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Evaluation &amp; Revisions</h1>
          <Link to="/proponent/detailed-proposals" className="inline-flex min-h-12 items-center rounded-sm bg-[#C8102E] px-4 py-3 text-base font-semibold text-white hover:bg-[#A00D26]">Submit detailed proposal</Link>
        </div>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">Read evaluator feedback, submit requested revisions, and track your proposal’s manuscript and review history.</p>
      </header>
      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your evaluations and revisions</span>
          <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
            <div className="space-y-5 rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex flex-wrap gap-3"><div className="h-5 w-20 rounded-sm bg-slate-100" /><div className="h-6 w-32 rounded-sm bg-slate-200" /><div className="h-5 w-40 max-w-full rounded-sm bg-slate-100" /></div>
              <div className="h-7 w-3/4 rounded-sm bg-slate-200" />
              <div className="space-y-3 rounded-sm bg-slate-50 p-4"><div className="h-4 w-28 rounded-sm bg-slate-200" /><div className="h-4 w-full rounded-sm bg-slate-100" /><div className="h-4 w-2/3 rounded-sm bg-slate-100" /></div>
              <div className="h-5 w-5/6 rounded-sm bg-slate-100" />
              <div className="grid grid-cols-5 gap-3 border-t border-slate-100 pt-6">{[0, 1, 2, 3, 4].map((step) => <div key={step} className="h-10 rounded-sm bg-slate-100" />)}</div>
            </div>
            <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
              <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:p-4">{[0, 1, 2].map((tab) => <div key={tab} className="h-12 rounded-sm bg-slate-200" />)}</div>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="h-6 w-48 max-w-full rounded-sm bg-slate-200" />
                {[0, 1].map((round) => <div key={round} className="space-y-3 rounded-sm border border-slate-100 p-4"><div className="h-5 w-1/3 rounded-sm bg-slate-100" /><div className="h-4 w-full rounded-sm bg-slate-100" /><div className="h-4 w-4/5 rounded-sm bg-slate-100" /><div className="h-12 w-40 max-w-full rounded-sm bg-slate-100" /></div>)}
              </div>
            </div>
          </div>
        </div>
      ) : <>
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-base text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-12 rounded-sm border border-red-300 px-4 text-base font-semibold">Retry</button></p>}

      {eligibleConcepts.length > 0 && <p className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-900">{eligibleConcepts.length} {eligibleConcepts.length === 1 ? 'concept proposal is' : 'concept proposals are'} ready for detailed proposal submission. <Link to="/proponent/detailed-proposals" className="font-semibold text-[#C8102E] underline">Open the submission hub</Link>.</p>}

      {proposals.length === 0 ? (
        !error && <EmptyState size="md" icon={FileSearch} title="No detailed proposals yet" description="Submit your detailed proposal in the submission hub after preliminary screening. Evaluator feedback and requested revisions will appear here." />
      ) : (
        <div className="space-y-6">
          {proposals.length > 1 && <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
            <label htmlFor={`${ids}-proposal`} className="mb-2 block text-base font-semibold text-slate-700">Select a proposal</label>
            <select id={`${ids}-proposal`} value={selected?.id ?? ''} onChange={(event) => { setSelectedId(event.target.value); setActiveTab('feedback'); }} className="min-h-12 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20">
              {proposals.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
            </select>
          </div>}

          {selected && (
            <div key={selected.id} className="min-w-0 space-y-6">
              <header className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2"><span className="font-mono text-sm font-bold text-slate-500">{selected.code}</span><ProposalStatusBadge proposal={selected} size="md" /><span className="text-sm text-slate-500">Round {selected.currentRound} · Submitted {formatDate(selected.submittedAt)}</span></div>
                <h2 className="mt-4 border-l-4 border-[#C8102E] pl-3 break-words font-brand text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{selected.title}</h2>
                <div className="mt-5 flex flex-col gap-4 rounded-sm bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-base font-semibold text-slate-800">Next action</p><p className="mt-1 text-base leading-relaxed text-slate-700">{selected.preReviewStage ? stageExplanation(selected.preReviewStage) : nextStepFor(selected.status, 'proponent')}</p></div>
                  {selected.canUploadRevision && <button type="button" onClick={() => selectTab('revision')} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 py-3 text-base font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"><Upload aria-hidden="true" className="h-5 w-5" />Submit revision</button>}
                </div>
                <p className={`mt-4 flex items-start gap-2 text-base leading-relaxed ${selected.anonymity.attestedAt ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                  {selected.anonymity.attestedAt
                    ? <span>Anonymity attested {formatDateTime(selected.anonymity.attestedAt)}: the manuscript on file names no proponent, college, or research team.</span>
                    : <span>No anonymity attestation on file for this manuscript (uploaded before it was required). Your next revision will ask for it.</span>}
                </p>
                {!selected.preReviewStage && <div className="mt-6 border-t border-slate-100 pt-6"><PipelineStepper status={selected.status} currentRound={selected.currentRound} compact /></div>}
              </header>

              <section aria-label="Proposal review details" className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
                <div role="tablist" aria-label="Evaluation and revision sections" onKeyDown={navigateTabs} className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
                  {TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" id={`${ids}-tab-${key}`} aria-selected={activeTab === key} aria-controls={`${ids}-panel-${key}`} tabIndex={activeTab === key ? 0 : -1} onClick={() => setActiveTab(key)} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${activeTab === key ? 'bg-[#C8102E] text-white' : 'text-slate-600 hover:bg-slate-200'}`}><Icon aria-hidden="true" className="h-5 w-5" />{label}</button>)}
                </div>

                {/* Keep panels mounted so changing tabs preserves selected files and unsent clarification drafts. */}
                <div id={`${ids}-panel-feedback`} role="tabpanel" aria-labelledby={`${ids}-tab-feedback`} hidden={activeTab !== 'feedback'} tabIndex={0} className="p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:p-6">
                  <div className="space-y-8">
                    <Card title="Evaluator feedback">
                      <ActionSheetStrip proposal={selected} />
                      {selected.feedback.length === 0 ? <p className="text-base leading-relaxed text-slate-500">Feedback is released when a review round closes.</p>
                        : <div className="space-y-5">{[...selected.feedback].reverse().map((round, index) => <RoundFeedbackAccordion key={round.round} feedback={round} defaultOpen={index === 0} />)}</div>}
                    </Card>
                    {(selected.clarifications.length > 0 || selected.canClarify) && <Card title="Clarifications with RPDU">
                      <ClarificationThread size="md" messages={selected.clarifications} currentRound={selected.currentRound} canPost={selected.canClarify} viewer="PROPONENT" onPost={async (round, body) => { await clarify(selected.id, round, body); }} />
                    </Card>}
                  </div>
                </div>

                <div id={`${ids}-panel-revision`} role="tabpanel" aria-labelledby={`${ids}-tab-revision`} hidden={activeTab !== 'revision'} tabIndex={0} className="p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:p-6">
                  {selected.canUploadRevision ? <Card title="Submit your revision">
                    <ActionSheetStrip proposal={selected} />
                    <RevisionUploadForm key={selected.currentRound} proposal={selected} onUpload={uploadRevision} />
                  </Card> : <EmptyState size="md" icon={FileSearch} title="No revision upload is required right now" description={selected.preReviewStage ? stageExplanation(selected.preReviewStage) : nextStepFor(selected.status, 'proponent')} action={<button type="button" onClick={() => selectTab('feedback')} className="min-h-12 rounded-sm border border-slate-200 px-4 text-base font-semibold text-[#C8102E] hover:bg-red-50">View feedback</button>} />}
                </div>

                <div id={`${ids}-panel-history`} role="tabpanel" aria-labelledby={`${ids}-tab-history`} hidden={activeTab !== 'history'} tabIndex={0} className="p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:p-6">
                  <div className="space-y-8"><Card title="Manuscript history"><RevisionTimeline proposal={selected} /></Card><Card title="Status history"><HistoryList size="md" entries={selected.history} /></Card></div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
      </>}
    </section>
  );
}

export default RevisionHistoryPage;
