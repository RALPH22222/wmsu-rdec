import { CheckCircle2, ClipboardCheck, Download, Upload } from 'lucide-react';
import { usePostApprovalDocuments } from '../../hooks/usePostApprovalDocuments';
import type { PostApprovalKind } from '../../types/postApproval';
import { PostApprovalCard } from './postApproval/PostApprovalCard';

const STEPS = [
  { icon: Download, label: 'Download templates' },
  { icon: Upload, label: 'Complete and upload' },
  { icon: ClipboardCheck, label: 'RPDU checks' },
] as const;

export function PostApprovalDocuments({ proposalId }: { proposalId: string }) {
  const { data, loading, error, refresh, upload, downloadTemplate } = usePostApprovalDocuments(proposalId);

  if (loading) {
    return <div role="status" aria-busy="true"><span className="sr-only">Loading post-approval documents</span><div aria-hidden="true" className="grid gap-5 motion-safe:animate-pulse lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-72 rounded-sm bg-slate-100" />)}</div></div>;
  }
  if (error || !data) {
    return <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error || 'Unable to load the post-approval documents.'}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-4 text-sm font-semibold">Retry</button></p>;
  }

  const checked = data.documents.filter((item) => item.current?.status === 'CHECKED').length;
  const uploaded = data.documents.filter((item) => item.current).length;
  const closedReason = data.canUpload ? undefined : data.reason;
  const handleUpload = (kind: PostApprovalKind, file: File) => upload({ [kind]: file });

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-sm border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">{checked === data.documents.length && <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600" />}{checked} of {data.documents.length} checked</p>
          <p className="text-xs text-slate-500">{uploaded} of {data.documents.length} uploaded</p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, label }, index) => (
            <li key={label} className="flex items-center gap-3 rounded-sm bg-white p-3 text-sm font-medium text-slate-700 shadow-2xs"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="min-w-0">{label}</span></li>
          ))}
        </ol>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {data.documents.map((item) => <PostApprovalCard key={item.kind} document={item} closedReason={closedReason} onDownload={downloadTemplate} onUpload={handleUpload} />)}
      </div>
    </div>
  );
}

export default PostApprovalDocuments;
