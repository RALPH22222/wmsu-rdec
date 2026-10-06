import React, { useId, useState } from 'react';
import { CheckCircle2, ListChecks, ChevronDown, Clock, MessageSquareText, UserRoundX } from 'lucide-react';
import type { ActionSheetItem, DetailedProposal, Evaluation, EvaluatorAssignment } from '../../types';
import {
  BLIND_LABELS,
  MAX_EVALUATORS_PER_PROPOSAL,
  PASSING_TOTAL_SCORE,
  RECOMMENDATION_META,
  SECTION_LABELS,
  averageScore,
} from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { TONE_CLASSES } from '../ui/toneClasses';
import { EmptyState } from '../ui/EmptyState';
import { SeverityChip } from '../evaluatorComponent/SeverityChip';

interface ProposalFeedbackPanelProps {
  proposal: DetailedProposal;
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
}

/** Shown when an evaluation's assignment no longer exists (the evaluator was removed from the panel). */
const FORMER_MEMBER_LABEL = 'Former panel member';

/**
 * One card in a round. Proponents only ever see the blind label of the panel seat, never who
 * evaluated: each evaluation is joined to its assignment by `assignmentId` to get the label.
 * In a round that is still open, a submitted evaluation is a `pending` card with `submitted: true`
 * (no score, remarks, or action sheet until the round closes).
 */
type RoundSlot =
  | { kind: 'submitted'; key: string; label: string; evaluation: Evaluation }
  | { kind: 'pending'; key: string; label: string; submitted: boolean }
  | { kind: 'open'; key: string; label: string };

interface RoundGroup {
  round: number;
  slots: RoundSlot[];
  evaluations: Evaluation[];
  /** False while the round is still accepting evaluations: feedback is released when it closes. */
  released: boolean;
}

const labelRank = (label: string): number => {
  const index = (BLIND_LABELS as readonly string[]).indexOf(label);
  return index === -1 ? BLIND_LABELS.length : index;
};

const bySlotLabel = (a: RoundSlot, b: RoundSlot) => labelRank(a.label) - labelRank(b.label) || a.key.localeCompare(b.key);

function buildRounds(proposal: DetailedProposal, assignments: EvaluatorAssignment[], evaluations: Evaluation[]): RoundGroup[] {
  const labelByAssignment = new Map(assignments.map((a) => [a.id, a.blindLabel]));
  // The current round accepts evaluations while the proposal is under review (or waiting for a
  // replacement evaluator); in that round, also show the seats that have not submitted yet.
  const roundIsOpen = proposal.status === 'under_review' || proposal.status === 'pending_assignment';

  const rounds = new Set(evaluations.map((e) => e.round));
  if (roundIsOpen && assignments.length > 0) rounds.add(proposal.currentRound);

  return [...rounds]
    .sort((a, b) => b - a)
    .map((round) => {
      const roundEvaluations = evaluations.filter((e) => e.round === round);
      // Feedback is released per round, on the panel's decision: while the current round is open
      // the proponent sees only which seats have submitted.
      const released = !(roundIsOpen && round === proposal.currentRound);
      const slots: RoundSlot[] = roundEvaluations.map((evaluation): RoundSlot => {
        const label = labelByAssignment.get(evaluation.assignmentId) ?? FORMER_MEMBER_LABEL;
        return released
          ? { kind: 'submitted', key: evaluation.id, label, evaluation }
          : { kind: 'pending', key: evaluation.id, label, submitted: true };
      });

      if (!released) {
        const submitted = new Set(roundEvaluations.map((e) => e.assignmentId));
        for (const assignment of assignments) {
          if (!submitted.has(assignment.id)) {
            slots.push({ kind: 'pending', key: assignment.id, label: assignment.blindLabel, submitted: false });
          }
        }
        const taken = new Set(assignments.map((a) => a.blindLabel));
        for (const label of BLIND_LABELS.slice(0, MAX_EVALUATORS_PER_PROPOSAL)) {
          if (!taken.has(label)) slots.push({ kind: 'open', key: `open-${label}`, label });
        }
      }

      return { round, slots: slots.sort(bySlotLabel), evaluations: roundEvaluations, released };
    });
}

const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</h5>
);

const LabelDisc: React.FC<{ label: string; muted?: boolean }> = ({ label, muted = false }) => {
  const letter = label.startsWith('Evaluator ') ? label.slice('Evaluator '.length) : null;
  return (
    <span
      aria-hidden="true"
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        muted ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-slate-900 text-white'
      }`}
    >
      {letter ?? <UserRoundX className="w-4 h-4" />}
    </span>
  );
};

const ScoreBar: React.FC<{ total: number }> = ({ total }) => {
  const passing = total >= PASSING_TOTAL_SCORE;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-extrabold tabular-nums ${passing ? 'text-emerald-700' : 'text-slate-900'}`}>{total}</span>
        <span className="text-xs font-semibold text-slate-400">/ 100</span>
      </div>
      <div
        className="relative h-1.5 bg-slate-100 rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total}
        aria-label="Total weighted score"
      >
        <div
          className={`h-full rounded-full ${passing ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, Math.max(0, total))}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-slate-400"
          style={{ left: `${PASSING_TOTAL_SCORE}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">Passing line {PASSING_TOTAL_SCORE}</p>
    </div>
  );
};

const ActionItemRow: React.FC<{ item: ActionSheetItem }> = ({ item }) => (
  <li className="p-3 rounded-sm border border-slate-200 bg-slate-50/50 space-y-1.5">
    <div className="flex flex-wrap items-center gap-2">
      <SeverityChip severity={item.severity} />
      <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-semibold text-slate-600 bg-white border border-slate-200">
        {SECTION_LABELS[item.section]}
      </span>
    </div>
    <p className="text-xs text-slate-700 leading-relaxed break-words">{item.comment}</p>
  </li>
);

const EvaluatorCard: React.FC<{ slot: RoundSlot }> = ({ slot }) => {
  if (slot.kind === 'pending' && slot.submitted) {
    return (
      <div className="p-4 rounded-sm border border-dashed border-slate-200 bg-slate-50/60 flex items-center gap-3">
        <LabelDisc label={slot.label} muted />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-600">
            {slot.label} · Submitted — feedback is released when the round closes
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Evaluation received for this round
          </p>
        </div>
      </div>
    );
  }

  if (slot.kind !== 'submitted') {
    return (
      <div className="p-4 rounded-sm border border-dashed border-slate-200 bg-slate-50/60 flex items-center gap-3">
        <LabelDisc label={slot.label} muted />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {slot.label} · {slot.kind === 'pending' ? 'Pending' : 'Seat open'}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {slot.kind === 'pending' ? 'Evaluation not yet submitted for this round' : 'Awaiting evaluator assignment by the RPDU'}
          </p>
        </div>
      </div>
    );
  }

  const { evaluation, label } = slot;
  const recommendation = RECOMMENDATION_META[evaluation.recommendation];
  return (
    <article className="rounded-sm border border-slate-200 bg-white">
      <header className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <LabelDisc label={label} />
          <div className="min-w-0">
            <h5 className="text-sm font-bold text-slate-900">{label}</h5>
            <p className="text-[11px] text-slate-500">Submitted {formatDate(evaluation.submittedAt)}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-bold ${TONE_CLASSES[recommendation.tone].badge}`}>
          {recommendation.label}
        </span>
      </header>

      <div className="p-4 grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <SubLabel>Total score</SubLabel>
          <ScoreBar total={evaluation.totalScore} />
        </div>
        <div className="space-y-1.5 min-w-0">
          <SubLabel>Remarks</SubLabel>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">{evaluation.remarks}</p>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <SubLabel>Action sheet ({evaluation.actionSheet.length})</SubLabel>
        {evaluation.actionSheet.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No action items from this evaluator.</p>
        ) : (
          <ul className="space-y-2">
            {evaluation.actionSheet.map((item) => (
              <ActionItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
};

/**
 * Anonymised evaluator feedback grouped by review round (latest first, latest expanded). While the
 * proposal is in `revision_requested`, a consolidated checklist of that round's action items sits
 * above the rounds; its ticks are a local reading aid and are not saved.
 */
export const ProposalFeedbackPanel: React.FC<ProposalFeedbackPanelProps> = ({ proposal, assignments, evaluations }) => {
  const rounds = buildRounds(proposal, assignments, evaluations);
  const latestRound = rounds[0]?.round;

  // Explicit open/closed choices per round; a round without one is open only while it is the latest,
  // so a newly opened round starts expanded without any effect.
  const [roundToggles, setRoundToggles] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  // DOM ids come from useId + row index; entity ids (which can embed internal identifiers)
  // stay out of the rendered HTML and are used only as React keys and state keys.
  const checklistBaseId = useId();

  const isExpanded = (round: number) => roundToggles[round] ?? round === latestRound;
  const toggleRound = (round: number) => {
    const next = !isExpanded(round);
    setRoundToggles((prev) => ({ ...prev, [round]: next }));
  };

  const toggleChecked = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const checklistRound =
    proposal.status === 'revision_requested' ? rounds.find((r) => r.round === proposal.currentRound) : undefined;
  const checklist = checklistRound
    ? checklistRound.slots
        .flatMap((slot) =>
          slot.kind === 'submitted'
            ? slot.evaluation.actionSheet.map((item) => ({ key: `${slot.evaluation.id}:${item.id}`, label: slot.label, item }))
            : []
        )
        // Required items first; the sort is stable, so A/B/C order is kept within each severity.
        .sort((a, b) => Number(b.item.severity === 'required') - Number(a.item.severity === 'required'))
    : [];
  const checkedCount = checklist.filter((entry) => checked.has(entry.key)).length;

  return (
    <section className="bg-white border border-slate-200 rounded-sm shadow-xs" aria-labelledby="feedback-heading">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
          <MessageSquareText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 id="feedback-heading" className="text-base font-bold text-slate-900">
            Evaluator Feedback
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-blind review — panel members are identified only as Evaluator A, B, and C.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {checklistRound && checklist.length > 0 && (
          <div className="rounded-sm border border-amber-200 bg-amber-50/40">
            <div className="p-4 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-amber-600" />
                Action items to address (Round {checklistRound.round})
              </h4>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {checkedCount} of {checklist.length} reviewed
              </span>
            </div>
            <ul className="divide-y divide-amber-100">
              {checklist.map(({ key, label, item }, index) => {
                const inputId = `${checklistBaseId}-item-${index}`;
                const isChecked = checked.has(key);
                return (
                  <li key={key} className="px-4 py-3 flex items-start gap-3">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecked(key)}
                      className="mt-0.5 w-4 h-4 accent-[#C8102E] cursor-pointer shrink-0"
                    />
                    <label htmlFor={inputId} className="min-w-0 space-y-1 cursor-pointer">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-900">{label}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{SECTION_LABELS[item.section]}</span>
                        <SeverityChip severity={item.severity} />
                      </span>
                      <span
                        className={`block text-xs leading-relaxed break-words ${
                          isChecked ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {item.comment}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="px-4 py-2.5 border-t border-amber-100 text-[11px] text-slate-500">
              Ticking items is a reading aid only and is not saved. Respond to each item in the upload form below.
            </p>
          </div>
        )}

        {rounds.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No evaluator feedback yet"
            description="Feedback appears here once the evaluation panel submits its first evaluations."
          />
        ) : (
          <div className="space-y-3">
            {rounds.map(({ round, slots, evaluations: roundEvaluations, released }) => {
              const expanded = isExpanded(round);
              const average = released ? averageScore(roundEvaluations) : null;
              const panelId = `feedback-${proposal.id}-round-${round}`;
              return (
                <div key={round} className="rounded-sm border border-slate-200">
                  <button
                    type="button"
                    onClick={() => toggleRound(round)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Round {round} ·{' '}
                          {released ? `Panel average ${average === null ? '—' : `${average} / 100`}` : 'In progress'}
                        </span>
                        {round === latestRound && (
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Latest
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {roundEvaluations.length} of {MAX_EVALUATORS_PER_PROPOSAL} evaluations received
                        {!released && ' · scores and comments are released when the round closes'}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded && (
                    <div id={panelId} className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 space-y-3">
                      {slots.map((slot) => (
                        <EvaluatorCard key={slot.key} slot={slot} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProposalFeedbackPanel;
