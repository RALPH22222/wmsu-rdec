import type { FormEvent, ReactNode, RefObject } from 'react';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Eye, FileSignature, Upload } from 'lucide-react';
import { formatDate } from '../../../lib/format';
import { DocumentStatusChip } from './DocumentRow';
import { DOC_BUTTON, DOC_BUTTON_PRIMARY } from './buttonClasses';
import { formatPeso } from './types';
import type { ContractData, ProposalContractItem } from './types';

interface ContractWorkspaceProps {
  proposal: ProposalContractItem;
  contractData: ContractData;
  displayBudget: number;
  notarizedUrl: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  uploading: boolean;
  uploadError: string;
  uploadSuccess: string;
  onBack: () => void;
  onViewPreview: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent) => void;
}

const CARD = 'rounded-sm border border-slate-200 bg-white shadow-xs';

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-900 sm:text-right">{children}</dd>
    </div>
  );
}

/** Full-page workspace for one Professional Service Contract: prepare the pre-filled copy, then submit the notarized one. */
export function ContractWorkspace({
  proposal, contractData, displayBudget, notarizedUrl, fileInputRef, selectedFile, uploading, uploadError, uploadSuccess,
  onBack, onViewPreview, onFileChange, onSubmit,
}: ContractWorkspaceProps) {
  const isNotarized = Boolean(proposal.contract?.isNotarized);
  const submittedAt = proposal.contract?.submittedAt;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#C8102E] focus-visible:outline-2 focus-visible:outline-[#C8102E]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to Documents
      </button>

      <header className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50">
              <FileSignature className="h-5 w-5 text-[#C8102E]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">WMSU-RPDU-CA-001.01</span>
                <DocumentStatusChip label={isNotarized ? 'Notarized' : 'Awaiting notarization'} tone={isNotarized ? 'emerald' : 'amber'} />
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">Professional Service Contract</p>
              <h1 id="psc-page-title" className="break-words text-xl font-bold text-slate-900 sm:text-2xl">{proposal.title}</h1>
              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <div className="flex gap-1"><dt>Study Leader:</dt><dd className="font-semibold text-slate-800">{proposal.studyLeader}</dd></div>
                <div className="flex gap-1"><dt>En Banc Approved Budget:</dt><dd className="font-mono font-bold text-emerald-700">{formatPeso(displayBudget)}</dd></div>
                <div className="flex gap-1"><dt>Contract ID:</dt><dd className="font-mono text-slate-700">{proposal.conceptId.slice(0, 8)}</dd></div>
              </dl>
            </div>
          </div>
          {notarizedUrl && (
            <a href={notarizedUrl} target="_blank" rel="noopener noreferrer" className={`${DOC_BUTTON} lg:shrink-0`}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" /> View Notarized PDF
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="psc-prepare-title" className={`${CARD} flex flex-col p-5 sm:p-6`}>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">1</span>
            <div className="min-w-0">
              <h2 id="psc-prepare-title" className="text-base font-bold text-slate-900">Prepare the pre-filled contract</h2>
              <p className="mt-1 text-sm text-slate-600">
                These details come from your approved proposal and Budget Allocation (WMSU-RPDU-CA-001.01).
              </p>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-slate-200 rounded-sm border border-slate-200 bg-slate-50 px-4">
            <SummaryRow label="En Banc Approved Budget">
              <span className="inline-flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="h-3 w-3" /> Signed LIB Uploaded
                </span>
                <span className="font-mono text-emerald-700">{formatPeso(displayBudget)}</span>
              </span>
            </SummaryRow>
            <SummaryRow label="Compensation Arrangement (from LIB)">
              {contractData.compensationArrangement === 'Deloading'
                ? `Teaching De-loading (AY ${contractData.schoolYear || '2026–2027'})`
                : 'Research Honorarium'}
            </SummaryRow>
            <SummaryRow label="Project Duration">
              {contractData.durationMonths || '12'} months
              <span className="block text-xs font-normal text-slate-500">
                {contractData.startDate ? formatDate(contractData.startDate) : '—'} to {contractData.endDate ? formatDate(contractData.endDate) : '—'}
              </span>
            </SummaryRow>
            <SummaryRow label="Implementing College / Dept.">
              {contractData.collegeDepartment || proposal.department}
            </SummaryRow>
            <SummaryRow label="Co-Researchers">
              {contractData.coResearchers ? contractData.coResearchers : 'None (Solo Study Leader)'}
            </SummaryRow>
          </dl>

          <div className="mt-auto pt-5">
            <button type="button" onClick={onViewPreview} className={DOC_BUTTON_PRIMARY}>
              <Eye aria-hidden="true" className="h-4 w-4" />
              View Pre-Filled Contract
            </button>
          </div>
        </section>

        <section aria-labelledby="psc-submit-title" className={`${CARD} flex flex-col p-5 sm:p-6`}>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">2</span>
            <div className="min-w-0">
              <h2 id="psc-submit-title" className="text-base font-bold text-slate-900">Submit the notarized copy</h2>
              <p className="mt-1 text-sm text-slate-600">
                Upload your signed and notarized contract as a PDF bearing the notary seal and details.
              </p>
            </div>
          </div>

          <div className={`mt-4 rounded-sm border p-4 ${isNotarized ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className={`flex items-center gap-2 text-sm font-bold ${isNotarized ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isNotarized
                ? <><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" /> Notarized document submitted</>
                : <><Clock aria-hidden="true" className="h-4 w-4 shrink-0" /> Awaiting notarized copy</>}
            </p>
            {isNotarized && submittedAt && (
              <p className="mt-1 text-xs text-slate-600">Submitted {formatDate(submittedAt)}</p>
            )}
            {notarizedUrl && (
              <a
                href={notarizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#C8102E] hover:underline"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" /> View submitted notarized PDF
              </a>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex flex-1 flex-col gap-3">
            <div>
              <label htmlFor="psc-notarized-file" className="mb-1.5 block text-xs font-semibold text-slate-700">
                {isNotarized ? 'Replace notarized contract (PDF)' : 'Notarized contract (PDF)'}
              </label>
              <input
                id="psc-notarized-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="block w-full min-w-0 cursor-pointer rounded-sm border border-dashed border-slate-300 bg-slate-50 p-2 text-sm text-slate-600 file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-sm file:border-0 file:bg-red-50 file:px-3 file:text-sm file:font-semibold file:text-[#C8102E] hover:file:bg-red-100"
              />
              <p className="mt-1 text-xs text-slate-500">PDF format only (up to 25 MB).</p>
            </div>

            {uploadError && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{uploadError}</p>}
            {uploadSuccess && <p role="status" className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{uploadSuccess}</p>}

            <div className="mt-auto pt-2">
              <button type="submit" disabled={!selectedFile || uploading} className={DOC_BUTTON_PRIMARY}>
                <Upload aria-hidden="true" className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Submit Notarized Contract'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ContractWorkspace;
