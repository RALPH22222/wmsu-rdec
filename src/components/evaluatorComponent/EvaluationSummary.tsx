import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import type { Evaluation } from '../../types';
import { EVALUATION_CRITERIA, MAX_CRITERION_SCORE, RECOMMENDATION_META, SECTION_LABELS } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { TONE_CLASSES } from '../ui/toneClasses';
import { SeverityChip } from './SeverityChip';
import { TotalScoreMeter } from './TotalScoreMeter';

interface EvaluationSummaryProps {
  evaluation: Evaluation;
}

const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</h3>
);

/** Read-only record of a submitted evaluation (scores, remarks, action sheet, recommendation). */
export const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({ evaluation }) => {
  const recommendation = RECOMMENDATION_META[evaluation.recommendation];

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Evaluation submitted · Round {evaluation.round}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Submitted on {formatDateTime(evaluation.submittedAt)}</p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SubLabel>Total weighted score</SubLabel>
            <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-bold ${TONE_CLASSES[recommendation.tone].badge}`}>
              {recommendation.label}
            </span>
          </div>
          <TotalScoreMeter total={evaluation.totalScore} />
        </div>

        <div className="space-y-2">
          <SubLabel>Criterion scores</SubLabel>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-sm">
            {EVALUATION_CRITERIA.map((criterion) => {
              const score = evaluation.scores.find((s) => s.criterionId === criterion.id)?.score;
              return (
                <li key={criterion.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-xs text-slate-700 min-w-0">{criterion.label}</span>
                  <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                    {score ?? '—'}
                    <span className="font-normal text-slate-400">/{MAX_CRITERION_SCORE}</span>
                    <span className="ml-2 inline-block w-24 text-right font-normal text-slate-500">
                      {score !== undefined ? ((score / MAX_CRITERION_SCORE) * criterion.weight).toFixed(1) : '0.0'} / {criterion.weight} pts
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-2">
          <SubLabel>Remarks</SubLabel>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{evaluation.remarks}</p>
        </div>

        <div className="space-y-2">
          <SubLabel>Action sheet ({evaluation.actionSheet.length})</SubLabel>
          {evaluation.actionSheet.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No action items.</p>
          ) : (
            <ul className="space-y-2">
              {evaluation.actionSheet.map((item) => (
                <li key={item.id} className="p-3 rounded-sm border border-slate-200 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityChip severity={item.severity} />
                    <span className="text-[11px] font-semibold text-slate-500">{SECTION_LABELS[item.section]}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed break-words">{item.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="flex items-start gap-2 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-px" />
          Submissions are final. Contact the RPDU if a correction is needed.
        </p>
      </div>
    </div>
  );
};

export default EvaluationSummary;
