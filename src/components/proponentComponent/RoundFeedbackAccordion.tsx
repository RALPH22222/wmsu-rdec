import type { ProponentRoundFeedback } from '../../types';
import { PRESENCE_META, RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { groupFeedbackByPoint } from '../../lib/feedbackByPoint';
import { RoundAccordion } from '../ui/RoundAccordion';
import { ChecklistSummary, RecommendationBadge } from '../ui/ChecklistSummary';
import { DocumentLink } from '../ui/DocumentLink';

interface RoundFeedbackAccordionProps { feedback: ProponentRoundFeedback; defaultOpen?: boolean }

const PRESENCE_BADGE: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', slate: 'bg-slate-100 text-slate-700' };

export function RoundFeedbackAccordion({ feedback, defaultOpen = false }: RoundFeedbackAccordionProps) {
  const labels = feedback.evaluations.map((evaluation) => RECOMMENDATION_META[evaluation.recommendation].label).join(', ');
  const byPoint = groupFeedbackByPoint(feedback.evaluations);
  const anyChecklist = feedback.evaluations.some((evaluation) => Object.keys(evaluation.checklist).length > 0);
  return (
    <RoundAccordion round={feedback.round} defaultOpen={defaultOpen} summary={`${feedback.evaluations.length} evaluation${feedback.evaluations.length === 1 ? '' : 's'}${labels ? ` · ${labels}` : ''}`}>
      {feedback.evaluations.map((evaluation) => (
        <article key={evaluation.blindLabel} className="rounded-sm border border-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{evaluation.blindLabel}</p>
            <RecommendationBadge recommendation={evaluation.recommendation} />
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-700">{evaluation.remarks}</p>
          {!anyChecklist && <div className="mt-2"><ChecklistSummary checklist={evaluation.checklist} /></div>}
          <div className="mt-3"><DocumentLink href={evaluation.actionSheetUrl} label="Action sheet" muted /></div>
        </article>
      ))}

      {anyChecklist && (
        <section className="rounded-sm border border-slate-100 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Comments by assessment point</h4>
          <p className="mt-1 text-xs text-slate-500">Answer each item on your accomplished action sheet. Points every evaluator marked YES without comment are not listed.</p>
          {byPoint.length === 0 ? <p className="mt-2 text-xs text-slate-500">No comments on individual assessment points this round.</p> : (
            <div className="mt-3 space-y-3">
              {byPoint.map(({ group, points }) => (
                <div key={group.id}>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h5>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {points.map(({ point, notes }) => (
                      <li key={point.id} className="py-2">
                        <p className="text-sm font-semibold text-slate-900">{point.label}</p>
                        <ul className="mt-1 space-y-1.5">
                          {notes.map(({ blindLabel, entry }) => {
                            const presence = entry.present === 'YES' || entry.present === 'NA' ? PRESENCE_META[entry.present] : null;
                            return (
                              <li key={blindLabel} className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-900">{blindLabel}</span>
                                <span className={`ml-2 rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${PRESENCE_BADGE[presence ? presence.tone : 'slate']}`}>{presence ? presence.label : '—'}</span>
                                {entry.pageRef && <span className="ml-2 text-slate-500">{entry.pageRef}</span>}
                                {entry.comment && <p className="mt-0.5 whitespace-pre-wrap break-words">{entry.comment}</p>}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </RoundAccordion>
  );
}
