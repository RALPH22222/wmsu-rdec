import type { Checklist, ReviewRecommendation } from '../../types';
import { ASSESSMENT_GROUPS, PRESENCE_META, RECOMMENDATION_META, pointsInGroup } from '../../lib/proposalPipeline';

const BADGE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
};

export function RecommendationBadge({ recommendation }: { recommendation: ReviewRecommendation }) {
  const meta = RECOMMENDATION_META[recommendation];
  return <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${BADGE[meta.tone]}`}>{meta.label}</span>;
}

/** Read-only rendering of a submitted assessment checklist, grouped like the Proposal Assessment Form. */
export function ChecklistSummary({ checklist }: { checklist: Checklist }) {
  if (Object.keys(checklist).length === 0) return <p className="text-xs text-slate-500">No checklist recorded for this evaluation.</p>;
  return (
    // Two balanced columns on desktop keep the 19 points from running as one long list.
    <div className="space-y-3 lg:columns-2 lg:gap-x-8 lg:space-y-0">
      {ASSESSMENT_GROUPS.map((group) => (
        <section key={group.id} className="break-inside-avoid lg:mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h4>
          <ul className="mt-1 divide-y divide-slate-100">
            {pointsInGroup(group.id).map((point) => {
              const entry = checklist[point.id];
              const presence = entry && (entry.present === 'YES' || entry.present === 'NA') ? PRESENCE_META[entry.present] : null;
              return (
                <li key={point.id} className="py-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-slate-700">{point.label}</span>
                    <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${presence ? BADGE[presence.tone] : BADGE.slate}`}>{presence ? presence.label : '—'}</span>
                  </div>
                  {entry?.pageRef && <p className="text-xs text-slate-500">{entry.pageRef}</p>}
                  {entry?.comment && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-700">{entry.comment}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
