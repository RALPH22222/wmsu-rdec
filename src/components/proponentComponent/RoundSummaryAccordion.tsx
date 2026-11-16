import type { ProponentRoundSummary } from '../../types';
import { ACTION_SHEET_NUMBERING, ASSESSMENT_GROUPS, RECOMMENDATION_META, STATUS_META, pointsInGroup } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { RoundAccordion } from '../ui/RoundAccordion';
import { StatusBadge } from '../ui/StatusBadge';
import { DocumentLink } from '../ui/DocumentLink';
import { TONE_CLASSES } from '../ui/toneClasses';

interface RoundSummaryAccordionProps { summary: ProponentRoundSummary; defaultOpen?: boolean }

const SectionHeading = ({ children }: { children: string }) => <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">{children}</h4>;

/** One round's published evaluation summary (the RPDU Head's consolidation of the panel's three evaluations). */
export function RoundSummaryAccordion({ summary, defaultOpen = false }: RoundSummaryAccordionProps) {
  const commented = ASSESSMENT_GROUPS
    .map((group) => ({ group, points: pointsInGroup(group.id).filter((point) => (summary.points[point.id] ?? '').trim() !== '') }))
    .filter(({ points }) => points.length > 0);
  return (
    <RoundAccordion size="sm" round={summary.round} defaultOpen={defaultOpen} summary={`Panel decision: ${STATUS_META[summary.outcome].label}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge status={summary.outcome} />
        <span className="text-sm text-slate-500">Published {formatDate(summary.publishedAt)}</span>
      </div>

      <section className="rounded-sm border border-slate-100 p-4">
        <SectionHeading>What the panel decided</SectionHeading>
        <ul className="mt-3 flex flex-wrap gap-2">
          {summary.recommendations.map(({ blindLabel, recommendation }) => {
            const meta = recommendation ? RECOMMENDATION_META[recommendation] : null;
            return (
              <li key={blindLabel} className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-sm font-semibold ${meta ? TONE_CLASSES[meta.tone].badge : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                {blindLabel} · {meta ? meta.label : '—'}
              </li>
            );
          })}
        </ul>
      </section>

      {summary.coverNote.trim() !== '' && (
        <section className="rounded-sm border border-slate-100 p-4">
          <SectionHeading>Note from RPDU</SectionHeading>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{summary.coverNote}</p>
        </section>
      )}

      {summary.remarks.trim() !== '' && (
        <section className="rounded-sm border border-slate-100 p-4">
          <SectionHeading>Overall remarks</SectionHeading>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{summary.remarks}</p>
        </section>
      )}

      <section className="rounded-sm border border-slate-100 p-4">
        <SectionHeading>Comments by assessment point</SectionHeading>
        {commented.length === 0 ? <p className="mt-2 text-sm text-slate-500">No comments on individual assessment points this round.</p> : (
          <div className="mt-4 space-y-5">
            {commented.map(({ group, points }) => (
              <div key={group.id}>
                <p className="text-sm font-bold text-slate-700">{group.label}</p>
                <ul className="mt-2 divide-y divide-slate-100 rounded-sm border border-slate-200">
                  {points.map((point) => (
                    <li key={point.id} className="p-3">
                      <p className="text-sm font-semibold text-slate-900">{ACTION_SHEET_NUMBERING[point.id] ?? point.label}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{summary.points[point.id]}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {(summary.evaluatorMessages?.length ?? 0) > 0 && (
        <section className="rounded-sm border border-slate-100 p-4">
          <SectionHeading>Original evaluator messages</SectionHeading>
          <p className="mt-2 text-sm text-slate-500">Some evaluators replied to RPDU by e-mail. RPDU shared their messages as sent.</p>
          <ul className="mt-3 space-y-3">
            {summary.evaluatorMessages?.map((item) => (
              <li key={item.blindLabel}>
                <p className="text-sm font-semibold text-slate-900">{item.blindLabel}{item.receivedAt && <span className="font-normal text-slate-500"> · received {formatDate(item.receivedAt)}</span>}</p>
                <blockquote className="mt-1 whitespace-pre-wrap break-words border-l-4 border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{item.message}</blockquote>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(summary.reviewAttachments?.length ?? 0) > 0 && (
        <section className="rounded-sm border border-slate-100 p-4">
          <SectionHeading>Evaluator attachments</SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.reviewAttachments?.map((item) => <DocumentLink key={item.blindLabel} href={item.fileUrl} label={`${item.blindLabel} review attachment`} size="sm" muted />)}
          </div>
        </section>
      )}

      {summary.fileUrl && <div><DocumentLink href={summary.fileUrl} label="Download summary report" size="sm" muted /></div>}
    </RoundAccordion>
  );
}
