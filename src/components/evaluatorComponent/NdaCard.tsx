import { useId, useState } from 'react';
import { Download, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadNdaTemplate } from '../../lib/pipelineApi';
import { ACCEPTED_NDA_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';
import type { BlindReview } from '../../types';

interface NdaCardProps {
  review: BlindReview;
  onUpload: (file: File) => Promise<void>;
}

/** The non-disclosure undertaking an evaluator signs after accepting; RPDU verifies it before the manuscript opens. */
export function NdaCard({ review, onUpload }: NdaCardProps) {
  const { session } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const titleId = useId();
  const inputId = useId();
  const { nda } = review;

  if (nda.state !== 'REQUIRED' && nda.state !== 'PENDING_CHECK' && nda.state !== 'REJECTED') return null;
  // A closed review never prompts an upload: an NDA that is still due there has nothing left to unlock.
  if (!nda.canUpload && nda.state !== 'PENDING_CHECK') return null;

  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError('');
    try { await downloadNdaTemplate(review.id, review.code, session?.access_token); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to download the NDA form. Please try again.'); }
    finally { setDownloading(false); }
  };

  const upload = async () => {
    if (!file || tooBig || uploading) return;
    setUploading(true);
    try {
      await onUpload(file);
      setFile(null);
      setInputKey((key) => key + 1);
    } catch {
      // The hook already toasted the failure; keep the chosen file so the evaluator can retry.
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={`rounded-sm border bg-white p-4 shadow-xs sm:p-5 ${nda.state === 'PENDING_CHECK' ? 'border-slate-200' : 'border-amber-200'}`} aria-labelledby={titleId}>
      <h3 id={titleId} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${nda.state === 'PENDING_CHECK' ? 'text-slate-600' : 'text-amber-800'}`}><ShieldCheck className="h-4 w-4" aria-hidden="true" />Non-disclosure undertaking</h3>
      <p className="mt-2 text-sm text-slate-700">RPDU must hold your signed NDA before you can open the manuscript. Download the form, sign it, and upload a PDF or photo of the signed copy.</p>

      {nda.state === 'PENDING_CHECK' && <p className="mt-3 rounded-sm bg-amber-50 p-3 text-sm text-amber-800">RPDU is checking your NDA. The manuscript unlocks once it is verified.</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {nda.canUpload && <button type="button" onClick={download} disabled={downloading} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Download className="h-4 w-4" aria-hidden="true" />{downloading ? 'Downloading…' : 'Download NDA form'}</button>}
        {nda.fileUrl && <DocumentLink href={nda.fileUrl} label="Your uploaded NDA" muted />}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}

      {nda.state === 'REJECTED' && <p role="status" className="mt-3 whitespace-pre-wrap break-words rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">RPDU rejected your NDA: {nda.note}</p>}

      {nda.canUpload && (
        <div className="mt-3">
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">{nda.state === 'REQUIRED' ? 'Signed NDA' : 'Replace your signed NDA'}</label>
          <input key={inputKey} id={inputId} type="file" accept={ACCEPTED_NDA_TYPES} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm focus:border-[#C8102E] focus:outline-none file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
          {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large (15 MB maximum)' : ''}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={upload} disabled={!file || tooBig || uploading} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-4 w-4" aria-hidden="true" />{uploading ? 'Uploading…' : 'Upload signed NDA'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default NdaCard;
