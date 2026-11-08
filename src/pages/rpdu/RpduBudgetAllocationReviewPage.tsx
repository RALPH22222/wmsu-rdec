import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Building,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Scale,
  Lock,
  Send,
  Printer,
  Download,
  Eye,
  PenTool,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import type { RpduBudgetAllocationItem } from '../../types';
import {
  DEFAULT_LIB_SIGNATORIES,
  buildLibPrintableHtml,
  printLibHtml,
  downloadLibPdfFile,
} from '../../lib/libPrintTemplate';

export const RpduBudgetAllocationReviewPage: React.FC = () => {
  const { allocationId } = useParams<{ allocationId: string }>();
  const { session } = useAuth();

  const [allocation, setAllocation] = useState<RpduBudgetAllocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Step 8.2 Final Budget Sync Validator State
  const [enBancAmountInput, setEnBancAmountInput] = useState<string>('');

  const fetchAllocation = useCallback(async () => {
    if (!allocationId || !session?.access_token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_ENDPOINTS.RPDU.BUDGET_ALLOCATIONS}/${encodeURIComponent(allocationId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const data: RpduBudgetAllocationItem = json.data;
        setAllocation(data);
        const initialEnBanc =
          data.enBancApprovedAmount !== undefined && data.enBancApprovedAmount !== null
            ? data.enBancApprovedAmount
            : data.totalApprovedAmount;
        setEnBancAmountInput(String(initialEnBanc));
      } else {
        setError(json.message || 'Budget allocation record not found.');
      }
    } catch (err: unknown) {
      console.error('Failed to load budget allocation for review:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [allocationId, session?.access_token]);

  useEffect(() => {
    fetchAllocation();
  }, [fetchAllocation]);

  // Group line items by 3 classes
  const groupedItems = useMemo(() => {
    if (!allocation) return { ps: [], mooe: [], eo: [], psTotal: 0, mooeTotal: 0, eoTotal: 0 };
    const ps = allocation.libItems.filter((i) => i.classType === 'PS');
    const mooe = allocation.libItems.filter((i) => i.classType === 'MOOE');
    const eo = allocation.libItems.filter((i) => i.classType === 'EO');

    const psTotal = ps.reduce((sum, i) => sum + i.total, 0);
    const mooeTotal = mooe.reduce((sum, i) => sum + i.total, 0);
    const eoTotal = eo.reduce((sum, i) => sum + i.total, 0);

    return { ps, mooe, eo, psTotal, mooeTotal, eoTotal };
  }, [allocation]);

  // Step 8.2 Sync Validation & 2-Stage Status Calculations
  // Stage 1 ('PENDING'): Pending Review -> RPDU can accept the digital LIB (as long as libTotal <= enBancTarget)
  // Stage 2 ('APPROVED'): Accepted -> Proponent can proceed to gather signatures in person; project is ready for PSC
  const syncValidation = useMemo(() => {
    const stage: 'PENDING' | 'APPROVED' =
      allocation?.isApproved || allocation?.reviewStatus === 'APPROVED' || allocation?.reviewStatus === 'SIGNED'
        ? 'APPROVED'
        : 'PENDING';

    const libTotal = Number(allocation?.totalApprovedAmount) || 0;
    const enBancTarget = Number(String(enBancAmountInput).replace(/[^0-9.]/g, '')) || 0;
    const scheduleVariance = Number((libTotal - enBancTarget).toFixed(2));
    const isScheduleSynced = enBancTarget > 0 && libTotal > 0 && scheduleVariance <= 0.01;
    const canApprove = stage === 'PENDING' && isScheduleSynced;

    return {
      stage,
      libTotal,
      enBancTarget,
      scheduleVariance,
      isScheduleSynced,
      canApprove,
    };
  }, [allocation?.isApproved, allocation?.reviewStatus, allocation?.totalApprovedAmount, enBancAmountInput]);

  const handleReviewDecision = async () => {
    if (!allocation || !session?.access_token) return;

    if (!syncValidation.canApprove) {
      setReviewError('Ensure the Digital LIB Schedule Total does not exceed the En Banc Approved Budget.');
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`${API_ENDPOINTS.RPDU.BUDGET_ALLOCATIONS}/${encodeURIComponent(allocation.id)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decision: 'APPROVE',
          enBancApprovedAmount: syncValidation.enBancTarget,
          signedLibVerifiedAmount: syncValidation.libTotal,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to record budget review decision');
      }

      await fetchAllocation();
    } catch (err: unknown) {
      console.error('Error reviewing budget allocation:', err);
      const msg = err instanceof Error ? err.message : 'Action failed';
      setReviewError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#C8102E] animate-spin mx-auto" />
        <p className="font-semibold text-slate-700 text-sm">Loading budget allocation details...</p>
      </div>
    );
  }

  if (error || !allocation) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Link
          to="/rpdu/budgets"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Budget Allocations
        </Link>
        <div className="p-6 bg-white border border-rose-200 rounded-md shadow-xs text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Allocation Record Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'The requested budget allocation could not be found.'}</p>
        </div>
      </div>
    );
  }

  const isTwoYears = true;

  const signatories = {
    studyLeaderName:
      allocation.metadata.signatories?.studyLeaderName ||
      allocation.metadata.studyLeader ||
      allocation.proponentName ||
      '',
    studyLeaderTitle:
      allocation.metadata.signatories?.studyLeaderTitle || DEFAULT_LIB_SIGNATORIES.studyLeaderTitle,
    notedByName:
      allocation.metadata.signatories?.notedByName || DEFAULT_LIB_SIGNATORIES.notedByName,
    notedByTitle:
      allocation.metadata.signatories?.notedByTitle || DEFAULT_LIB_SIGNATORIES.notedByTitle,
    recommendingApprovalName:
      allocation.metadata.signatories?.recommendingApprovalName ||
      DEFAULT_LIB_SIGNATORIES.recommendingApprovalName,
    recommendingApprovalTitle:
      allocation.metadata.signatories?.recommendingApprovalTitle ||
      DEFAULT_LIB_SIGNATORIES.recommendingApprovalTitle,
    approvedByName:
      allocation.metadata.signatories?.approvedByName || DEFAULT_LIB_SIGNATORIES.approvedByName,
    approvedByTitle:
      allocation.metadata.signatories?.approvedByTitle || DEFAULT_LIB_SIGNATORIES.approvedByTitle,
  };

  const printableLibHtml = buildLibPrintableHtml({
    title: allocation.proposalTitle,
    projectDuration: allocation.metadata.projectDuration || '1 Year',
    studyLeader: allocation.metadata.studyLeader || allocation.proponentName,
    coResearchers: Array.isArray(allocation.metadata.coResearchers)
      ? allocation.metadata.coResearchers
      : allocation.metadata.coResearchers
        ? [String(allocation.metadata.coResearchers)]
        : [],
    projectStaff: Array.isArray(allocation.metadata.projectStaff)
      ? allocation.metadata.projectStaff
      : allocation.metadata.projectStaff
        ? [String(allocation.metadata.projectStaff)]
        : [],
    implementingDepartment:
      allocation.metadata.implementingDepartment || allocation.proponentDepartment || '',
    compensationType: allocation.metadata.compensationType || 'Honoraria',
    items: allocation.libItems,
    signatories,
  });

  const handlePrintLib = () => {
    printLibHtml(printableLibHtml);
  };

  const handleDownloadLibPdf = async () => {
    const safeCode = (allocation.proposalCode || 'LIB')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 40);
    await downloadLibPdfFile(
      printableLibHtml,
      `WMSU_RPDU_LIB_${safeCode}.pdf`,
      session?.access_token
    );
  };

  if (showPrintPreview) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border border-slate-200 rounded-md shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowPrintPreview(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Budget Review
            </button>
            <div className="border-l border-slate-200 pl-3 min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <FileText className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
                WMSU-RPDU Project Line-Item Budget &mdash; Official Print Preview
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {allocation.proposalTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintLib}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold rounded-md cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#C8102E]" /> Print LIB
            </button>
            <button
              type="button"
              onClick={handleDownloadLibPdf}
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#a50d26] text-white px-4 py-2 text-xs font-bold rounded-md cursor-pointer transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download LIB (PDF)
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <div>
              <span className="text-slate-500">Proposal Code:</span>{' '}
              <strong className="text-slate-900 font-mono">{allocation.proposalCode}</strong>
            </div>
            <div>
              <span className="text-slate-500">Study Leader:</span>{' '}
              <strong className="text-slate-900">
                {allocation.metadata.studyLeader || allocation.proponentName}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Grand Total:</span>{' '}
              <strong className="text-[#C8102E] font-mono">
                ₱{allocation.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          <iframe
            title="Project Line-Item Budget Print Preview"
            srcDoc={printableLibHtml}
            className="w-full h-[1050px] bg-white border-0 block"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Top Back Navigation Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/rpdu/budgets"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Budget Allocations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" /> Print Preview
          </button>
          <button
            type="button"
            onClick={handlePrintLib}
            className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#C8102E]" /> Print LIB
          </button>
          <button
            type="button"
            onClick={handleDownloadLibPdf}
            className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download LIB (PDF)
          </button>
          {syncValidation.stage === 'APPROVED' && (
            <Link
              to={`/rpdu/letters?template=psc${
                allocation.conceptProposalId
                  ? `&proposal=${encodeURIComponent(allocation.conceptProposalId)}`
                  : ''
              }`}
              className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold bg-[#C8102E] hover:bg-[#a50d26] text-white shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Proceed to PSC Contract Desk
            </Link>
          )}
        </div>
      </div>

      {/* Header Overview Card */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-extrabold text-[#C8102E] bg-red-50 border border-red-100 px-2.5 py-1 rounded">
              {allocation.proposalCode}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Budget Allocation Review &amp; LIB Verification
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {syncValidation.stage === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accepted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
              </span>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            {allocation.proposalTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" /> {allocation.proponentName}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {allocation.proponentDepartment || 'WMSU Department'}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Submitted {new Date(allocation.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Project Metadata & Full 3-Class Line Items Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C8102E]" /> Project Metadata Overview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Study Leader</span>
                <span className="font-bold text-slate-900 block mt-0.5 truncate">
                  {allocation.metadata.studyLeader || allocation.proponentName}
                </span>
                <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                  {allocation.metadata.implementingDepartment || allocation.proponentDepartment}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">En Banc Approved Budget</span>
                  {syncValidation.stage === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> LIB Accepted
                    </span>
                  )}
                </div>
                <span className="font-black text-emerald-700 text-sm block mt-0.5 font-mono">
                  ₱{syncValidation.enBancTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {allocation.enBancOutcome === 'AIHR_OUTRIGHT_PASS'
                    ? 'Outright AIHR Pass'
                    : 'En Banc Deliberation'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted LIB Total</span>
                <span className="font-black text-slate-900 text-sm block mt-0.5 text-[#C8102E] font-mono">
                  ₱{allocation.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Duration: {allocation.metadata.projectDuration || '1 Year'}
                </span>
              </div>
            </div>

            {allocation.metadata.coResearchers && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Co-Researchers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(allocation.metadata.coResearchers)
                    ? allocation.metadata.coResearchers
                    : [allocation.metadata.coResearchers]
                  )
                    .filter((name: string) => typeof name === 'string' && name.trim().length > 0)
                    .map((c: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200"
                      >
                        {c}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {allocation.metadata.projectStaff && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Project Staff:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(allocation.metadata.projectStaff)
                    ? allocation.metadata.projectStaff
                    : [allocation.metadata.projectStaff]
                  )
                    .filter((name: string) => typeof name === 'string' && name.trim().length > 0)
                    .map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200"
                      >
                        {s}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Line-Item Expenditure Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Expenditure Line Items Breakdown
              </h3>
              <span className="font-mono text-xs font-bold text-slate-700">
                Grand Total: ₱{allocation.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item Description</th>
                    <th className="py-2.5 px-3 text-right w-28">Year 1 (₱)</th>
                    {isTwoYears && <th className="py-2.5 px-3 text-right w-28">Year 2 (₱)</th>}
                    <th className="py-2.5 px-4 text-right w-32">Total (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* I. Personnel Services */}
                  <tr className="bg-red-50/40 text-[11px] font-black text-[#C8102E]">
                    <td colSpan={isTwoYears ? 4 : 3} className="py-2 px-4 uppercase tracking-wider">
                      I. Personnel Services (PS)
                    </td>
                  </tr>
                  {groupedItems.ps.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-4 pl-6 text-slate-800">{item.description}</td>
                      <td className="py-2 px-3 text-right text-slate-700 font-mono">
                        {item.year1Frequency !== undefined && (
                          <span className="mr-1.5 text-[10px] font-semibold text-slate-400">
                            ({item.year1Frequency}×/yr)
                          </span>
                        )}
                        ₱{item.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      {isTwoYears && (
                        <td className="py-2 px-3 text-right text-slate-700 font-mono">
                          {item.year2Frequency !== undefined && (
                            <span className="mr-1.5 text-[10px] font-semibold text-slate-400">
                              ({item.year2Frequency}×/yr)
                            </span>
                          )}
                          ₱{item.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="py-2 px-4 text-right font-bold text-slate-900 font-mono">
                        ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <td className="py-2 px-4 pl-6">Subtotal Personnel Services</td>
                    <td className="py-2 px-3 text-right font-mono">
                      ₱{groupedItems.ps.reduce((s, i) => s + i.year1, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {isTwoYears && (
                      <td className="py-2 px-3 text-right font-mono">
                        ₱{groupedItems.ps.reduce((s, i) => s + i.year2, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-2 px-4 text-right text-[#C8102E] font-black font-mono">
                      ₱{groupedItems.psTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* II. MOOE */}
                  <tr className="bg-red-50/40 text-[11px] font-black text-[#C8102E]">
                    <td colSpan={isTwoYears ? 4 : 3} className="py-2 px-4 uppercase tracking-wider">
                      II. Maintenance &amp; Other Operating Expenses (MOOE)
                    </td>
                  </tr>
                  {groupedItems.mooe.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-4 pl-6 text-slate-800">{item.description}</td>
                      <td className="py-2 px-3 text-right text-slate-700 font-mono">
                        ₱{item.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      {isTwoYears && (
                        <td className="py-2 px-3 text-right text-slate-700 font-mono">
                          ₱{item.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="py-2 px-4 text-right font-bold text-slate-900 font-mono">
                        ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <td className="py-2 px-4 pl-6">Subtotal MOOE</td>
                    <td className="py-2 px-3 text-right font-mono">
                      ₱{groupedItems.mooe.reduce((s, i) => s + i.year1, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {isTwoYears && (
                      <td className="py-2 px-3 text-right font-mono">
                        ₱{groupedItems.mooe.reduce((s, i) => s + i.year2, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-2 px-4 text-right text-[#C8102E] font-black font-mono">
                      ₱{groupedItems.mooeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* III. Equipment Outlay */}
                  {groupedItems.eo.length > 0 && (
                    <>
                      <tr className="bg-red-50/40 text-[11px] font-black text-[#C8102E]">
                        <td colSpan={isTwoYears ? 4 : 3} className="py-2 px-4 uppercase tracking-wider">
                          III. Equipment Outlay (EO)
                        </td>
                      </tr>
                      {groupedItems.eo.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-4 pl-6 text-slate-800">{item.description}</td>
                          <td className="py-2 px-3 text-right text-slate-700 font-mono">
                            ₱{item.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          {isTwoYears && (
                            <td className="py-2 px-3 text-right text-slate-700 font-mono">
                              ₱{item.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          )}
                          <td className="py-2 px-4 text-right font-bold text-slate-900 font-mono">
                            ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                        <td className="py-2 px-4 pl-6">Total for EO</td>
                        <td className="py-2 px-3 text-right font-mono">
                          ₱{groupedItems.eo.reduce((s, i) => s + i.year1, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        {isTwoYears && (
                          <td className="py-2 px-3 text-right font-mono">
                            ₱{groupedItems.eo.reduce((s, i) => s + i.year2, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right text-[#C8102E] font-black font-mono">
                          ₱{groupedItems.eoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Grand Total */}
                  <tr className="bg-slate-100 border-t-2 border-b border-slate-300 font-black text-slate-900 text-xs sm:text-sm">
                    <td className="py-3.5 px-4 uppercase tracking-wider font-black">GRAND TOTAL</td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      ₱{(
                        groupedItems.ps.reduce((s, i) => s + i.year1, 0) +
                        groupedItems.mooe.reduce((s, i) => s + i.year1, 0) +
                        groupedItems.eo.reduce((s, i) => s + i.year1, 0)
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {isTwoYears && (
                      <td className="py-3.5 px-3 text-right font-mono">
                        ₱{(
                          groupedItems.ps.reduce((s, i) => s + i.year2, 0) +
                          groupedItems.mooe.reduce((s, i) => s + i.year2, 0) +
                          groupedItems.eo.reduce((s, i) => s + i.year2, 0)
                        ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right text-[#C8102E] font-black font-mono">
                      ₱{allocation.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Signatories & Physical Signature Spaces */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#C8102E]" /> Official LIB Signatories (Physical Wet-Ink Signing)
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Printed document includes blank signature spaces above each signatory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50/70 rounded-md border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Prepared by:
                </span>
                <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                  <p className="font-bold text-slate-900 uppercase">{signatories.studyLeaderName}</p>
                  <p className="text-[11px] text-slate-600">{signatories.studyLeaderTitle}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-md border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Noted for implementation:
                </span>
                <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                  <p className="font-bold text-slate-900 uppercase">{signatories.notedByName}</p>
                  <p className="text-[11px] text-slate-600">{signatories.notedByTitle}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-md border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Recommending Approval:
                </span>
                <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                  <p className="font-bold text-slate-900 uppercase">{signatories.recommendingApprovalName}</p>
                  <p className="text-[11px] text-slate-600">{signatories.recommendingApprovalTitle}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-md border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Approved:
                </span>
                <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                  <p className="font-bold text-slate-900 uppercase">{signatories.approvedByName}</p>
                  <p className="text-[11px] text-slate-600">{signatories.approvedByTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Step 8.2 Final Budget Sync Validator */}
        <div className="space-y-6">
          {/* Final Budget Sync Validator Workspace */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C8102E] block">
                  Budget Verification
                </span>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Scale className="w-4 h-4 text-[#C8102E]" /> Final Budget Sync Validator
                </h3>
              </div>
              <ShieldCheck className="w-5 h-5 text-slate-400" />
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ensure the submitted Line-Item Budget does not exceed the En Banc approved budget ceiling. Once accepted, the proponent may proceed to gather physical signatures in person.
            </p>

            {/* 2-Way Peso Comparison Ledger */}
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 text-xs">
              {/* 1. En Banc Approved Amount */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    1. En Banc Approved Budget
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {allocation.enBancOutcome === 'AIHR_OUTRIGHT_PASS' ? 'AIHR / En Banc Record' : 'En Banc Deliberation'}
                  </span>
                  <span className="font-mono font-black text-slate-900">
                    ₱{syncValidation.enBancTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* 2. Submitted Digital LIB Schedule Total */}
              <div className="space-y-1 pt-1 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    2. Digital LIB Schedule Total
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500">Sum of PS + MOOE + EO</span>
                  <span className="font-mono font-black text-slate-900">
                    ₱{syncValidation.libTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Status / Lock Banner */}
            {!syncValidation.isScheduleSynced && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Exceeds En Banc Approved Budget</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  The Digital LIB Schedule Total exceeds the En Banc approved ceiling (
                  <strong className="font-mono">
                    ₱{syncValidation.enBancTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  ).
                </p>
              </div>
            )}

            {/* Current Stage Notice */}
            {syncValidation.stage === 'APPROVED' && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-md text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Budget Allocation Accepted &mdash; Ready for In-Person Signing
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Accepted on {allocation.reviewedAt ? new Date(allocation.reviewedAt).toLocaleDateString() : 'recent date'} by{' '}
                  <strong>{allocation.reviewerName || 'RPDU Officer'}</strong>. The proponent may now proceed to gather signatures in person, and this project is ready for the Professional Service Contract (PSC).
                </p>
              </div>
            )}

            {reviewError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Action Button: Shown only when allocation is Pending Review */}
            {syncValidation.stage === 'PENDING' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleReviewDecision}
                  disabled={isSubmitting || !syncValidation.canApprove}
                  className="w-full min-h-11 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Accept Budget Allocation'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
