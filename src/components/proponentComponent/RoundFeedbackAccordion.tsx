import type { ProponentRoundFeedback } from '../../types';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { RoundAccordion } from '../ui/RoundAccordion';
import { ScoreList } from '../ui/ScoreList';
import { DocumentLink } from '../ui/DocumentLink';

interface RoundFeedbackAccordionProps { feedback: ProponentRoundFeedback; defaultOpen?: boolean }

const TONE_BADGE: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };

export function RoundFeedbackAccordion({ feedback, defaultOpen = false }: RoundFeedbackAccordionProps) {
  const average = feedback.evaluations.length ? Math.round((feedback.evaluations.reduce((sum, e) => sum + e.totalScore, 0) / feedback.evaluations.length) * 10) / 10 : null;
  return (
    <RoundAccordion round={feedback.round} defaultOpen={defaultOpen} summary={`${feedback.evaluations.length} evaluation${feedback.evaluations.length === 1 ? '' : 's'}${average !== null ? ` · average ${average}/100` : ''}`}>
      {feedback.evaluations.map((evaluation) => {
        const meta = RECOMMENDATION_META[evaluation.recommendation];
        return (
          <article key={evaluation.blindLabel} className="rounded-sm border border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{evaluation.blindLabel}</p>
              <p className="text-xs"><span className={`rounded-sm px-2 py-0.5 font-bold ${TONE_BADGE[meta.tone]}`}>{meta.label}</span> <span className="ml-2 font-bold text-slate-900">{evaluation.totalScore}</span><span className="text-slate-500">/100</span></p>
            </div>
            <div className="mt-3"><ScoreList scores={evaluation.scores} /></div>
            <p className="mt-3 whitespace-pre-wrap break-words text-xs text-slate-700">{evaluation.remarks}</p>
            <div className="mt-3"><DocumentLink href={evaluation.actionSheetUrl} label="Action sheet" muted /></div>
          </article>
        );
      })}
    </RoundAccordion>
  );
}
