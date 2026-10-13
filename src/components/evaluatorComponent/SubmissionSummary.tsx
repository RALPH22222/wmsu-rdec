import type { ReviewSubmission } from '../../types';
import { formatDateTime } from '../../lib/format';
import { ChecklistSummary, RecommendationBadge } from '../ui/ChecklistSummary';
import { DocumentLink } from '../ui/DocumentLink';

export function SubmissionSummary({ submission }: { submission: ReviewSubmission }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended action</span>
        <RecommendationBadge recommendation={submission.recommendation} />
      </div>
      <ChecklistSummary checklist={submission.checklist} />
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Justification</h4>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{submission.remarks}</p>
      </div>
      <div className="flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment form" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
      <p className="text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}</p>
    </div>
  );
}
