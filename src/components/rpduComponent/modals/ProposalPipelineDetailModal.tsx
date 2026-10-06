import React, { useState } from 'react';
import {
  ClipboardList,
  Clock,
  Download,
  FileText,
  GitBranch,
  History,
  Layers,
  LayoutList,
  type LucideIcon,
} from 'lucide-react';
import type { DetailedProposal, Evaluation, Evaluator, EvaluatorAssignment, ProposalRevision } from '../../../types';
import { useProposalPipeline } from '../../../context/ProposalPipelineContext';
import {
  EVALUATION_CRITERIA,
  MAX_CRITERION_SCORE,
  MAX_EVALUATORS_PER_PROPOSAL,
  PASSING_TOTAL_SCORE,
  RECOMMENDATION_META,
  SECTION_LABELS,
  STATUS_META,
  averageScore,
  blindCode,
  isTerminalStatus,
} from '../../../lib/proposalPipeline';
import { formatCurrency, formatDate, formatDateTime, isOverdue } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';
import { PipelineStepper } from '../../ui/PipelineStepper';
import { StatusBadge } from '../../ui/StatusBadge';
import { TONE_CLASSES } from '../../ui/toneClasses';

interface ProposalPipelineDetailModalProps {
  isOpen: boolean;
  /** Pass the live proposal from context so the modal reflects state changes immediately. */
  proposal: DetailedProposal | null;
  onClose: () => void;
}

type DetailTab = 'overview' | 'evaluations' | 'revisions' | 'history';

const TABS: { key: DetailTab; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutList },
  { key: 'evaluations', label: 'Evaluations', icon: ClipboardList },
  { key: 'revisions', label: 'Revisions', icon: GitBranch },
  { key: 'history', label: 'Status History', icon: History },
];

const MICRO_LABEL = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className={MICRO_LABEL}>{label}</dt>
    <dd className="text-sm text-slate-800 mt-0.5 break-words">{children}</dd>
  </div>
);

/** RPDU/Admin view of one detailed proposal across the whole pipeline (not a blind view). */
export const ProposalPipelineDetailModal: React.FC<ProposalPipelineDetailModalProps> = ({ isOpen, proposal, onClose }) => {
  const { evaluators, getAssignmentsFor, getEvaluationsFor, getRevisionsFor } = useProposalPipeline();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  if (!proposal) return null;

  const panel = getAssignmentsFor(proposal.id);
  const evaluations = getEvaluationsFor(proposal.id);
  const revisions = getRevisionsFor(proposal.id);
  const counts: Record<DetailTab, number | null> = {
    overview: null,
    evaluations: evaluations.length,
    revisions: revisions.length,
    history: proposal.statusHistory.length,
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={Layers}
      title={proposal.title}
      subtitle={
        <>
          {proposal.code} · {STATUS_META[proposal.status].label} · Round {proposal.currentRound}{' '}
          <span
            className="ml-1 inline-block align-middle px-1.5 py-px rounded-sm border border-slate-200 bg-slate-50 font-mono text-[11px] font-semibold text-slate-500"
            title="Blind reference shown to evaluators instead of the proposal code"
          >
            Blind ref: {blindCode(proposal)}
          </span>
        </>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Close
        </button>
      }
    >
      <div className="border-b border-slate-200 -mt-1">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-none" role="tablist" aria-label="Proposal pipeline sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  active ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {counts[tab.key] !== null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{counts[tab.key]}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'overview' && <OverviewTab proposal={proposal} />}
      {activeTab === 'evaluations' && (
        <EvaluationsTab proposal={proposal} panel={panel} evaluations={evaluations} evaluators={evaluators} />
      )}
      {activeTab === 'revisions' && <RevisionsTab proposal={proposal} revisions={revisions} />}
      {activeTab === 'history' && <HistoryTab proposal={proposal} />}
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const OverviewTab: React.FC<{ proposal: DetailedProposal }> = ({ proposal }) => {
  const { manuscript } = proposal;
  return (
    <div className="space-y-5">
      <section className="border border-slate-200 rounded-sm p-4 bg-slate-50/60">
        <PipelineStepper status={proposal.status} currentRound={proposal.currentRound} />
      </section>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <Fact label="Lead proponent">{proposal.leadInvestigator}</Fact>
        <Fact label="Email">{proposal.leadInvestigatorEmail}</Fact>
        <Fact label="Co-investigators">
          {proposal.coInvestigators.length > 0 ? proposal.coInvestigators.join(', ') : 'None listed'}
        </Fact>
        <Fact label="College / Department">
          {proposal.college} · {proposal.department}
        </Fact>
        <Fact label="Thematic area">{proposal.thematicArea}</Fact>
        <Fact label="Duration">{proposal.durationMonths} months</Fact>
        <Fact label="Budget requested">{formatCurrency(proposal.budgetRequested)}</Fact>
        <Fact label="Submitted">{formatDateTime(proposal.submittedAt)}</Fact>
      </dl>

      <section className="space-y-1.5">
        <h4 className={MICRO_LABEL}>Abstract</h4>
        <p className="text-sm text-slate-700 leading-relaxed">{proposal.abstract}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className={MICRO_LABEL}>Objectives</h4>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
          {proposal.objectives.map((objective, index) => (
            <li key={`${index}-${objective}`}>{objective}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-200 rounded-sm p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-sm bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate" title={manuscript.name}>
              {manuscript.name}
            </p>
            <p className="text-xs text-slate-500">
              Original manuscript · {manuscript.size} · uploaded {formatDate(manuscript.uploadedAt)}
            </p>
          </div>
        </div>
        {manuscript.dataUrl ? (
          <a
            href={manuscript.dataUrl}
            download={manuscript.name}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled
            title="No file is attached to this sample record"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

const EvaluationsTab: React.FC<{
  proposal: DetailedProposal;
  panel: EvaluatorAssignment[];
  evaluations: Evaluation[];
  evaluators: Evaluator[];
}> = ({ proposal, panel, evaluations, evaluators }) => {
  const nameOf = (evaluatorId: string) => evaluators.find((e) => e.id === evaluatorId)?.name ?? 'Unknown evaluator';
  const rounds = Array.from({ length: proposal.currentRound }, (_, i) => proposal.currentRound - i);
  const acceptingSubmissions = !isTerminalStatus(proposal.status) && proposal.status !== 'revision_requested';

  const groups = rounds
    .map((round) => {
      const roundEvaluations = evaluations
        .filter((e) => e.round === round)
        .sort((a, b) => {
          const la = panel.find((x) => x.id === a.assignmentId)?.blindLabel ?? '~';
          const lb = panel.find((x) => x.id === b.assignmentId)?.blindLabel ?? '~';
          return la.localeCompare(lb);
        });
      const pending =
        round === proposal.currentRound && acceptingSubmissions
          ? panel
              .filter((a) => !roundEvaluations.some((e) => e.assignmentId === a.id))
              .sort((a, b) => a.blindLabel.localeCompare(b.blindLabel))
          : [];
      return { round, roundEvaluations, pending };
    })
    .filter((g) => g.roundEvaluations.length > 0 || g.pending.length > 0);

  if (groups.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-sm p-10 text-center">
        <ClipboardList className="w-9 h-9 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-700">No evaluations yet</p>
        <p className="text-xs text-slate-500 mt-1">Evaluations appear here once the three-member panel starts its review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ round, roundEvaluations, pending }) => {
        const avg = averageScore(roundEvaluations);
        return (
          <section key={round} className="space-y-3">
            <header className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Round {round}
                {round === proposal.currentRound && <span className="ml-2 text-[11px] font-semibold text-slate-400">Current</span>}
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  {roundEvaluations.length} of {MAX_EVALUATORS_PER_PROPOSAL} submitted
                </span>
                {avg !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-sm border font-bold ${
                      avg >= PASSING_TOTAL_SCORE ? TONE_CLASSES.emerald.badge : TONE_CLASSES.amber.badge
                    }`}
                  >
                    Avg. {avg} / 100
                  </span>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {roundEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  blindLabel={panel.find((a) => a.id === evaluation.assignmentId)?.blindLabel ?? 'Former panel member'}
                  evaluatorName={nameOf(evaluation.evaluatorId)}
                />
              ))}
              {pending.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-dashed border-slate-300 rounded-sm p-4 bg-slate-50/60 text-slate-500 space-y-1"
                >
                  <p className={MICRO_LABEL}>{assignment.blindLabel}</p>
                  <p className="text-sm font-semibold text-slate-600">{nameOf(assignment.evaluatorId)}</p>
                  <p className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {proposal.status === 'under_review' ? 'Awaiting submission' : 'Review opens when the panel is complete'}
                    <span className="text-slate-400">·</span>
                    <span
                      className={
                        proposal.status === 'under_review' && isOverdue(assignment.dueDate) ? 'text-red-600 font-bold' : ''
                      }
                    >
                      Due {formatDate(assignment.dueDate)}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const EvaluationCard: React.FC<{ evaluation: Evaluation; blindLabel: string; evaluatorName: string }> = ({
  evaluation,
  blindLabel,
  evaluatorName,
}) => {
  const recommendation = RECOMMENDATION_META[evaluation.recommendation];
  const passing = evaluation.totalScore >= PASSING_TOTAL_SCORE;
  return (
    <article className="border border-slate-200 rounded-sm p-4 space-y-3 bg-white shadow-xs min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={MICRO_LABEL}>{blindLabel}</p>
          <p className="text-sm font-bold text-slate-900">{evaluatorName}</p>
          <p className="text-[11px] text-slate-500">Submitted {formatDateTime(evaluation.submittedAt)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-bold ${TONE_CLASSES[recommendation.tone].badge}`}>
          {recommendation.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-600">Total score</span>
          <span className="font-extrabold text-slate-900">
            {evaluation.totalScore} <span className="font-medium text-slate-400">/ 100</span>
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${passing ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, evaluation.totalScore))}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="font-semibold py-1 pr-2">Criterion</th>
              <th className="font-semibold py-1 px-2 text-right">Weight</th>
              <th className="font-semibold py-1 pl-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {EVALUATION_CRITERIA.map((criterion) => {
              const score = evaluation.scores.find((s) => s.criterionId === criterion.id)?.score;
              return (
                <tr key={criterion.id}>
                  <td className="py-1 pr-2 text-slate-700">{criterion.label}</td>
                  <td className="py-1 px-2 text-right text-slate-500">{criterion.weight}%</td>
                  <td className="py-1 pl-2 text-right font-bold text-slate-800 whitespace-nowrap">
                    {score ?? '—'}/{MAX_CRITERION_SCORE}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-1">
        <p className={MICRO_LABEL}>Remarks</p>
        <p className="text-xs text-slate-700 leading-relaxed">{evaluation.remarks}</p>
      </div>

      {evaluation.actionSheet.length > 0 && (
        <div className="space-y-1.5">
          <p className={MICRO_LABEL}>Action sheet ({evaluation.actionSheet.length})</p>
          <ul className="space-y-1.5">
            {evaluation.actionSheet.map((item) => (
              <li key={item.id} className="text-xs border border-slate-100 rounded-sm p-2 bg-slate-50/60">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-slate-700">{SECTION_LABELS[item.section]}</span>
                  <span
                    className={`px-1.5 py-px rounded-sm border text-[10px] font-bold ${
                      item.severity === 'required' ? TONE_CLASSES.red.badge : TONE_CLASSES.slate.badge
                    }`}
                  >
                    {item.severity === 'required' ? 'Required' : 'Suggested'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{item.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

const RevisionsTab: React.FC<{
  proposal: DetailedProposal;
  revisions: ProposalRevision[];
}> = ({ proposal, revisions }) => (
  <div className="space-y-4">
    {revisions.length === 0 && (
      <p className="text-xs text-slate-500">No revisions yet — the proposal is still on its original manuscript.</p>
    )}
    <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
      <li className="relative pl-5">
        <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-400 ring-4 ring-white" />
        <p className="text-sm font-bold text-slate-900">Original Submission</p>
        <p className="text-xs text-slate-500">{formatDateTime(proposal.submittedAt)}</p>
        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          {proposal.manuscript.name} · {proposal.manuscript.size}
        </p>
      </li>
      {revisions.map((revision) => (
        <li key={revision.id} className="relative pl-5">
          <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">Revision {revision.revisionNumber}</p>
            <span className={`px-1.5 py-px rounded-sm border text-[10px] font-bold ${TONE_CLASSES.blue.badge}`}>
              Responds to Round {revision.respondsToRound}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {formatDateTime(revision.uploadedAt)} · by {revision.uploadedBy}
          </p>
          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {revision.file.name} · {revision.file.size}
          </p>
          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{revision.changeSummary}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {revision.responses.length} response{revision.responses.length === 1 ? '' : 's'} to action sheet items
          </p>
        </li>
      ))}
    </ol>
  </div>
);

// ---------------------------------------------------------------------------
// Status history
// ---------------------------------------------------------------------------

const HistoryTab: React.FC<{ proposal: DetailedProposal }> = ({ proposal }) => {
  const entries = [...proposal.statusHistory].reverse();
  return (
    <ul className="border border-slate-200 rounded-sm divide-y divide-slate-100">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${entry.status}-${index}`} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <div className="sm:w-44 shrink-0">
            <StatusBadge status={entry.status} />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs text-slate-500">
              {formatDateTime(entry.at)} · Round {entry.round}
            </p>
            <p className="text-sm text-slate-800">
              <span className="font-semibold">{entry.by}</span>
              {entry.note && <span className="text-slate-600"> — {entry.note}</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ProposalPipelineDetailModal;
