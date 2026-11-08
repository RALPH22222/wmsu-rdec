import type { ReactNode } from 'react';
import { ArrowLeft, CheckCircle2, Eye, FileSignature, Printer } from 'lucide-react';
import { formatDateRange } from '../../../lib/format';
import { DocumentStatusChip } from './DocumentRow';
import { DOC_BUTTON_PRIMARY } from './buttonClasses';
import { formatPeso } from './types';
import type { ContractData, ProposalContractItem } from './types';

interface ContractWorkspaceProps {
  proposal: ProposalContractItem;
  contractData: ContractData;
  displayBudget: number;
  onBack: () => void;
  onViewPreview: () => void;
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

/** Full-page workspace for one Professional Service Contract: prepare the pre-filled copy and follow in-person signing instructions. */
export function ContractWorkspace({
  proposal,
  contractData,
  displayBudget,
  onBack,
  onViewPreview,
}: ContractWorkspaceProps) {
  // Only an RPDU-set period is authoritative; the LIB fallback dates drift with today's date, so they are hidden.
  const periodSetByRpdu = (proposal.projectPeriodSource ?? contractData.projectPeriodSource) === 'rpdu'
    && Boolean(contractData.startDate && contractData.endDate);
  // The server refuses the PSC print/download until RPDU sets the period, so the actions wait for it too.
  const periodReady = proposal.hasProjectPeriod !== false && periodSetByRpdu;
  const periodBlockedTitle = periodReady ? undefined : 'RPDU has not set the project period yet';
  const statusChip = proposal.contract
    ? ({ label: 'Issued', tone: 'emerald' } as const)
    : periodReady
      ? ({ label: 'Ready to print', tone: 'emerald' } as const)
      : ({ label: 'Awaiting project period', tone: 'amber' } as const);
  const periodMonths = Number(contractData.durationMonths);

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
                <DocumentStatusChip label={statusChip.label} tone={statusChip.tone} />
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
                  <CheckCircle2 aria-hidden="true" className="h-3 w-3" /> LIB Accepted
                </span>
                <span className="font-mono text-emerald-700">{formatPeso(displayBudget)}</span>
              </span>
            </SummaryRow>
            <SummaryRow label="Compensation Arrangement (from LIB)">
              {contractData.compensationArrangement === 'Deloading'
                ? `Teaching De-loading (AY ${contractData.schoolYear || '2026–2027'})`
                : 'Research Honorarium'}
            </SummaryRow>
            <SummaryRow label="Project period">
              {periodSetByRpdu ? (
                <>
                  {formatDateRange(contractData.startDate, contractData.endDate)}
                  <span className="block text-xs font-normal text-slate-500">
                    {periodMonths} {periodMonths === 1 ? 'month' : 'months'}
                  </span>
                </>
              ) : (
                <span className="font-normal text-slate-500">Not yet set by RPDU</span>
              )}
            </SummaryRow>
            <SummaryRow label="Implementing College / Dept.">
              {contractData.collegeDepartment || proposal.department}
            </SummaryRow>
            <SummaryRow label="Co-Researchers">
              {contractData.coResearchers ? contractData.coResearchers : 'None (Solo Study Leader)'}
            </SummaryRow>
          </dl>

          <div className="mt-auto pt-5">
            <button
              type="button"
              onClick={onViewPreview}
              className={DOC_BUTTON_PRIMARY}
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              View Pre-Filled Contract
            </button>
          </div>
        </section>

        <section aria-labelledby="psc-inperson-title" className={`${CARD} flex flex-col p-5 sm:p-6`}>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">2</span>
            <div className="min-w-0">
              <h2 id="psc-inperson-title" className="text-base font-bold text-slate-900">Sign in person &amp; submit to RPDU</h2>
              <p className="mt-1 text-sm text-slate-600">
                Contract signing and notarization are completed physically in person—no PDF upload is required in the system.
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-3 text-xs text-slate-700">
            <li className="rounded-sm border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#C8102E]">
                Print the Pre-Filled PSC (6 Pages)
              </span>
              <p className="mt-1 leading-relaxed text-slate-600">
                Open the pre-filled Professional Service Contract and print the complete 6-page document (<span className="font-mono font-semibold">WMSU-RPDU-CA-001.01</span>).
              </p>
            </li>
            <li className="rounded-sm border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#C8102E]">
                Gather Wet-Ink Signatures in Person
              </span>
              <p className="mt-1 leading-relaxed text-slate-600">
                Have the Study Leader, Co-Researchers (if applicable), Official Witnesses (RDEC Director and VP-RESEL), and the University President sign physically on Page 5.
              </p>
            </li>
            <li className="rounded-sm border border-emerald-200 bg-emerald-50/70 p-3.5">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Turn Over Signed PSC to RPDU
              </span>
              <p className="mt-1 leading-relaxed text-emerald-900">
                Submit the signed physical contract copies directly to the RPDU office in person. RPDU will handle the official notarization in person.
              </p>
            </li>
          </ol>

          <div className="mt-auto pt-5">
            <button
              type="button"
              onClick={onViewPreview}
              disabled={!periodReady}
              title={periodBlockedTitle}
              className={DOC_BUTTON_PRIMARY}
            >
              <Printer aria-hidden="true" className="h-4 w-4" />
              Open &amp; Print Contract
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ContractWorkspace;
