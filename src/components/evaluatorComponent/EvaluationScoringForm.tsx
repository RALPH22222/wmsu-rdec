import React, { useId, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Send, XCircle, type LucideIcon } from 'lucide-react';
import type { EvaluationCriterionScore, EvaluatorRecommendation } from '../../types';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import {
  EVALUATION_CRITERIA,
  MAX_CRITERION_SCORE,
  MIN_CRITERION_SCORE,
  MIN_REMARKS_LENGTH,
  RECOMMENDATION_META,
  computeTotalScore,
  validateEvaluation,
} from '../../lib/proposalPipeline';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ActionSheetBuilder, type DraftActionItem } from './ActionSheetBuilder';
import { TotalScoreMeter } from './TotalScoreMeter';

interface EvaluationScoringFormProps {
  assignmentId: string;
  onSubmitted: () => void;
}

const SCORE_OPTIONS = Array.from(
  { length: MAX_CRITERION_SCORE - MIN_CRITERION_SCORE + 1 },
  (_, i) => MIN_CRITERION_SCORE + i
);

const RECOMMENDATIONS: { value: EvaluatorRecommendation; icon: LucideIcon; selected: string; iconSelected: string }[] = [
  {
    value: 'approve',
    icon: CheckCircle2,
    selected: 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-emerald-900',
    iconSelected: 'text-emerald-600',
  },
  {
    value: 'revise',
    icon: AlertTriangle,
    selected: 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500 text-amber-900',
    iconSelected: 'text-amber-600',
  },
  {
    value: 'reject',
    icon: XCircle,
    selected: 'border-red-500 bg-red-50/50 ring-1 ring-red-500 text-red-900',
    iconSelected: 'text-red-600',
  },
];

const BlockLabel: React.FC<{ children: React.ReactNode; htmlFor?: string; aside?: React.ReactNode }> = ({
  children,
  htmlFor,
  aside,
}) => (
  <div className="flex items-center justify-between gap-2">
    {htmlFor ? (
      <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {children}
      </label>
    ) : (
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</h3>
    )}
    {aside}
  </div>
);

/**
 * Scoring form for one assignment and the current round. Holds the whole draft locally;
 * the page keys it by assignment id so switching assignments starts a fresh draft.
 */
export const EvaluationScoringForm: React.FC<EvaluationScoringFormProps> = ({ assignmentId, onSubmitted }) => {
  const { submitEvaluation } = useProposalPipeline();
  const remarksId = useId();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');
  const [recommendation, setRecommendation] = useState<EvaluatorRecommendation | null>(null);
  const [actionSheet, setActionSheet] = useState<DraftActionItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const scoreList: EvaluationCriterionScore[] = EVALUATION_CRITERIA.filter((c) => scores[c.id] !== undefined).map((c) => ({
    criterionId: c.id,
    score: scores[c.id],
  }));
  const total = computeTotalScore(scoreList);
  const remarksLength = remarks.trim().length;

  // Validated live on every render; the missing list is shown only after the first submit attempt.
  const validation = validateEvaluation({
    scores: scoreList,
    remarks,
    recommendation,
    actionSheet: actionSheet.map((item) => ({ id: item.key, section: item.section, severity: item.severity, comment: item.comment })),
  });
  const shownErrors = [...(attempted ? validation.missing : []), ...errors];

  const setScore = (criterionId: string, score: number) => setScores((prev) => ({ ...prev, [criterionId]: score }));

  const handleSubmitClick = () => {
    setAttempted(true);
    setErrors([]);
    if (validation.ok) setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!recommendation) return;
    const result = submitEvaluation({
      assignmentId,
      scores: scoreList,
      remarks,
      actionSheet: actionSheet.map((item) => ({ section: item.section, severity: item.severity, comment: item.comment })),
      recommendation,
    });
    setConfirmOpen(false);
    if (result.ok) {
      onSubmitted();
    } else {
      setErrors(result.missing);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">Score this proposal</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Rate each criterion from {MIN_CRITERION_SCORE} (poor) to {MAX_CRITERION_SCORE} (excellent). Submissions are final for
          the round.
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Criteria */}
        <div className="space-y-4">
          <BlockLabel aside={<span className="text-[11px] font-semibold text-slate-500">{scoreList.length} of {EVALUATION_CRITERIA.length} scored</span>}>
            Criteria
          </BlockLabel>
          {EVALUATION_CRITERIA.map((criterion) => {
            const value = scores[criterion.id];
            const points = value !== undefined ? ((value / MAX_CRITERION_SCORE) * criterion.weight).toFixed(1) : null;
            return (
              <div key={criterion.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{criterion.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{criterion.description}</p>
                  </div>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-slate-100 text-[11px] font-bold text-slate-600">
                    {criterion.weight} pts
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-px" role="group" aria-label={`${criterion.label} score`}>
                  {SCORE_OPTIONS.map((n) => {
                    const selected = value === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScore(criterion.id, n)}
                        aria-label={`${criterion.label}: ${n}`}
                        aria-pressed={selected}
                        className={`h-9 min-w-0 rounded-sm border text-sm font-semibold tabular-nums transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]/40 focus-visible:ring-offset-1 ${
                          selected
                            ? 'bg-[#C8102E] border-[#C8102E] text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#C8102E] hover:text-[#C8102E]'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                {points !== null && (
                  <p className="text-[11px] text-slate-500 text-right">
                    {value}/{MAX_CRITERION_SCORE} · {points} of {criterion.weight} pts
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Live total */}
        <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/60 space-y-1">
          <BlockLabel>Total weighted score</BlockLabel>
          <TotalScoreMeter total={total} />
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <BlockLabel
            htmlFor={remarksId}
            aside={
              <span
                className={`text-[11px] font-semibold tabular-nums ${remarksLength >= MIN_REMARKS_LENGTH ? 'text-emerald-700' : 'text-slate-500'}`}
              >
                {remarksLength} / min {MIN_REMARKS_LENGTH}
              </span>
            }
          >
            Remarks
          </BlockLabel>
          <textarea
            id={remarksId}
            rows={5}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Summarize the proposal's strengths and weaknesses for the RPDU and the proponent…"
            className="w-full text-sm rounded-sm border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
          />
        </div>

        {/* Action sheet */}
        <div className="space-y-2">
          <BlockLabel aside={<span className="text-[11px] font-semibold text-slate-500">{actionSheet.length} item{actionSheet.length === 1 ? '' : 's'}</span>}>
            Action sheet
          </BlockLabel>
          <p className="text-xs text-slate-500">Required when recommending revision or rejection.</p>
          <ActionSheetBuilder items={actionSheet} onChange={setActionSheet} />
        </div>

        {/* Recommendation */}
        <div className="space-y-2">
          <BlockLabel>Recommendation</BlockLabel>
          <div className="grid grid-cols-1 gap-2">
            {RECOMMENDATIONS.map((option) => {
              const meta = RECOMMENDATION_META[option.value];
              const selected = recommendation === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRecommendation(option.value)}
                  aria-pressed={selected}
                  className={`p-3 rounded-sm border text-left flex items-start gap-2.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]/40 ${
                    selected ? option.selected : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? option.iconSelected : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold">{meta.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Errors */}
        {shownErrors.length > 0 && (
          <div className="p-3 rounded-sm border border-red-200 bg-red-50 text-red-800 space-y-1.5" role="alert">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              Complete the following before submitting
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {shownErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmitClick}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-sm font-bold text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]/40 focus-visible:ring-offset-2"
        >
          <Send className="w-4 h-4" />
          Submit Evaluation
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        tone="brand"
        icon={Send}
        title="Submit evaluation?"
        description="Your scores and action sheet will be sent to the RPDU and cannot be edited after submission."
        confirmLabel="Submit evaluation"
      />
    </div>
  );
};

export default EvaluationScoringForm;
