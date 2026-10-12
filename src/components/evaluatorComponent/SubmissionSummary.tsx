import type { ReviewSubmission } from '../../types';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { ScoreList } from '../ui/ScoreList';
import { DocumentLink } from '../ui/DocumentLink';

export function SubmissionSummary({ submission }: { submission: ReviewSubmission }) {
  const meta = RECOMMENDATION_META[submission.recommendation];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={`rounded-sm px-2 py-1 text-xs font-bold ${meta.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : meta.tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{meta.label}</span>
        <span><span className="text-2xl font-extrabold text-slate-900">{submission.totalScore}</span><span className="text-xs text-slate-400">/100</span></span>
      </div>
      <ScoreList scores={submission.scores} />
      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{submission.remarks}</p>
      <div className="flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
      <p className="text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}</p>
    </div>
  );
}
