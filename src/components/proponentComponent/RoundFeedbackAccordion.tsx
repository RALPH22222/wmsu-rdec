import type { ProponentRoundFeedback } from '../../types';
import { ChevronDown } from 'lucide-react';
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
    <RoundAccordion size="md" round={feedback.round} defaultOpen={defaultOpen} summary={`${feedback.evaluations.length} evaluation${feedback.evaluations.length === 1 ? '' : 's'}${labels ? ` · ${labels}` : ''}`}>
      {feedback.evaluations.map((evaluation) => (
        <article key={evaluation.blindLabel} className="rounded-sm border border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-900">{evaluation.blindLabel}</p>
            <RecommendationBadge recommendation={evaluation.recommendation} />
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{evaluation.remarks}</p>
          {!anyChecklist && <div className="mt-2"><ChecklistSummary checklist={evaluation.checklist} /></div>}
          <div className="mt-4"><DocumentLink href={evaluation.actionSheetUrl} label="Action sheet" size="md" muted /></div>
        </article>
      ))}

      {anyChecklist && (
        <section className="rounded-sm border border-slate-100 p-4 sm:p-5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Comments by assessment point</h4>
          <p className="mt-2 text-base leading-relaxed text-slate-500">Answer each item on your accomplished action sheet. Points every evaluator marked YES without comment are not listed.</p>
          {byPoint.length === 0 ? <p className="mt-2 text-sm text-slate-500">No comments on individual assessment points this round.</p> : (
            <div className="mt-5 space-y-6">
              {byPoint.map(({ group, points }) => (
                <details key={group.id} className="group rounded-sm border border-slate-200 px-4">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-base font-bold text-slate-700 [&::-webkit-details-marker]:hidden"><span>{group.label}<span className="ml-2 font-normal text-slate-500">({points.length} {points.length === 1 ? 'item' : 'items'})</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" /></summary>
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 py-4">
                    {points.map(({ point, notes }) => (
                      <li key={point.id} className="py-4 first:pt-0">
                        <p className="text-base font-semibold text-slate-900">{point.label}</p>
                        <ul className="mt-3 space-y-3">
                          {notes.map(({ blindLabel, entry }) => {
                            const presence = entry.present === 'YES' || entry.present === 'NA' ? PRESENCE_META[entry.present] : null;
                            return (
                              <li key={blindLabel} className="rounded-sm bg-slate-50 p-3 text-base leading-relaxed text-slate-700">
                                <span className="font-semibold text-slate-900">{blindLabel}</span>
                                <span className={`ml-2 rounded-sm px-1.5 py-0.5 text-sm font-bold ${PRESENCE_BADGE[presence ? presence.tone : 'slate']}`}>{presence ? presence.label : '—'}</span>
                                {entry.pageRef && <span className="ml-2 text-slate-500">{entry.pageRef}</span>}
                                {entry.comment && <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{entry.comment}</p>}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </RoundAccordion>
  );
}
