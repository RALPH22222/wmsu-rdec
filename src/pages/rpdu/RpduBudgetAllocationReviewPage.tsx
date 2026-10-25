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
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Scale,
  Lock,
  Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import type { RpduBudgetAllocationItem } from '../../types';

export const RpduBudgetAllocationReviewPage: React.FC = () => {
  const { allocationId } = useParams<{ allocationId: string }>();
  const { session } = useAuth();

  const [allocation, setAllocation] = useState<RpduBudgetAllocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Step 8.2 Final Budget Sync Validator State
  const [enBancAmountInput, setEnBancAmountInput] = useState<string>('');
  const [signedPdfAmountInput, setSignedPdfAmountInput] = useState<string>('');
  const [physicalSignaturesVerified, setPhysicalSignaturesVerified] = useState(false);

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
        setSignedPdfAmountInput(
          data.signedLibVerifiedAmount !== undefined && data.signedLibVerifiedAmount !== null
            ? String(data.signedLibVerifiedAmount)
            : String(data.totalApprovedAmount)
        );
        setPhysicalSignaturesVerified(Boolean(data.isApproved));
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

  // Step 8.2 Sync Validation & 3-Stage Status Calculations
  // Stage 1 ('PENDING'): Pending Review -> RPDU can approve digital LIB for signing (as long as libTotal <= enBancTarget)
  // Stage 2 ('APPROVED'): Approved — Awaiting Signed PDF -> Waiting for proponent to upload signed PDF
  // Stage 3 ('SIGNED'): Signed LIB Uploaded -> Proponent uploaded signed PDF; RPDU verifies signed total & routes
  const syncValidation = useMemo(() => {
    const hasSignedDocument = Boolean(
      allocation?.budgetPdfUrl && !String(allocation.budgetPdfUrl).includes('placeholder.wmsu.edu.ph')
    );
    const stage: 'PENDING' | 'APPROVED' | 'SIGNED' =
      allocation?.reviewStatus === 'SIGNED' && hasSignedDocument
        ? 'SIGNED'
        : allocation?.reviewStatus === 'APPROVED' || allocation?.isApproved
        ? 'APPROVED'
        : 'PENDING';

    const libTotal = Number(allocation?.totalApprovedAmount) || 0;
    const enBancTarget = Number(String(enBancAmountInput).replace(/[^0-9.]/g, '')) || 0;
    const rawSignedTrimmed = String(signedPdfAmountInput).replace(/[^0-9.]/g, '').trim();
    const hasSignedAmount = rawSignedTrimmed.length > 0 && !Number.isNaN(Number(rawSignedTrimmed));
    const signedAmount = hasSignedAmount ? Number(rawSignedTrimmed) : NaN;

    const scheduleVariance = Number((libTotal - enBancTarget).toFixed(2));
    const signedVariance = hasSignedAmount ? Number((signedAmount - libTotal).toFixed(2)) : NaN;

    const isScheduleSynced = enBancTarget > 0 && libTotal > 0 && scheduleVariance <= 0.01;
    const isSignedSynced =
      hasSignedAmount &&
      enBancTarget > 0 &&
      signedAmount > 0 &&
      Math.abs(signedVariance) < 0.01 &&
      signedAmount <= enBancTarget + 0.01;
    const isFullySynced = isScheduleSynced && isSignedSynced;

    // Can approve in Stage 1 (no PDF yet) if schedule is within ceiling;
    // If signed PDF is uploaded and not yet verified, require signed total match + checkbox verification.
    const canApprove =
      stage === 'SIGNED'
        ? false
        : hasSignedDocument
        ? isFullySynced && physicalSignaturesVerified
        : stage === 'PENDING' && isScheduleSynced;

    return {
      stage,
      hasSignedDocument,
      libTotal,
      enBancTarget,
      hasSignedAmount,
      signedAmount,
      scheduleVariance,
      signedVariance,
      isScheduleSynced,
      isSignedSynced,
      isFullySynced,
      canApprove,
    };
  }, [allocation?.budgetPdfUrl, allocation?.isApproved, allocation?.reviewStatus, allocation?.totalApprovedAmount, enBancAmountInput, signedPdfAmountInput, physicalSignaturesVerified]);

  const handleReviewDecision = async () => {
    if (!allocation || !session?.access_token) return;

    if (!syncValidation.canApprove) {
      setReviewError(
        syncValidation.hasSignedDocument
          ? 'Ensure the Physically Signed LIB Total matches the Digital LIB Schedule Total (within the En Banc Approved Budget) and check the verification box.'
          : 'Ensure the Digital LIB Schedule Total does not exceed the En Banc Approved Budget.'
      );
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
          signedLibVerifiedAmount: syncValidation.hasSignedAmount
            ? syncValidation.signedAmount
            : syncValidation.libTotal,
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

  const isTwoYears = allocation.metadata.projectDuration?.startsWith('2');

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
        {syncValidation.stage === 'SIGNED' && (
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
            {syncValidation.stage === 'SIGNED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Signed LIB Uploaded
              </span>
            ) : syncValidation.stage === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" /> Approved — Awaiting Signed PDF
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
                  {syncValidation.stage === 'SIGNED' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Signed LIB Uploaded
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
        </div>

        {/* Right Column (1 Col): Physically Signed Document & Step 8.2 Final Budget Sync Validator */}
        <div className="space-y-6">
          {/* Physically Signed Budget Document (PDF) Card */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C8102E]" /> Physically Signed LIB Document (PDF)
            </h3>

            {syncValidation.hasSignedDocument ? (
              <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-red-100 text-[#C8102E] rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 text-xs block truncate">
                      Signed_Project_Line_Item_Budget.pdf
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed by PI, RDEC Director &amp; VP-RESEL
                    </span>
                  </div>
                </div>

                <a
                  href={allocation.budgetPdfUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-10 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-md border border-slate-300 transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Signed PDF
                </a>
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 rounded-md border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" /> Awaiting Signed LIB PDF
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {syncValidation.stage === 'APPROVED'
                    ? 'You have approved the digital LIB. The proponent can now gather physical signatures and upload the signed LIB PDF.'
                    : 'No signed LIB PDF uploaded yet. Approve the digital LIB below so the proponent can print it and gather physical signatures.'}
                </p>
              </div>
            )}
          </div>

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
              Ensure the Project Line-Item does not exceed the En Banc approved budget ceiling and, once signed, matches the digital LIB schedule before routing for the University President&apos;s signature.
            </p>

            {/* 3-Way Peso Comparison Ledger */}
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

              {/* 3. Physically Signed Project Line-Item Total */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label htmlFor="signed-lib-total-input" className="text-[11px] font-bold text-slate-700">
                    3. Physically Signed LIB Total (₱)
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400">₱</span>
                  <input
                    id="signed-lib-total-input"
                    type="number"
                    step="0.01"
                    disabled={!syncValidation.hasSignedDocument || syncValidation.stage === 'SIGNED'}
                    value={signedPdfAmountInput}
                    onChange={(e) => setSignedPdfAmountInput(e.target.value)}
                    placeholder="Enter total on signed LIB sheet"
                    className={`w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-white border rounded focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                      syncValidation.isSignedSynced
                        ? 'border-emerald-400 text-emerald-950 focus:border-emerald-600'
                        : 'border-rose-300 text-rose-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Status / Lock Banner */}
            {!syncValidation.isScheduleSynced ? (
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
            ) : syncValidation.hasSignedDocument && !syncValidation.isSignedSynced ? (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Signed LIB Total Mismatch</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  The Physically Signed LIB Total does not match the Digital LIB Schedule Total.
                </p>
              </div>
            ) : null}

            {/* Mandatory Physical Signature Attestation Checkbox (Shown when Signed PDF is uploaded and awaiting verification) */}
            {syncValidation.hasSignedDocument && syncValidation.stage !== 'SIGNED' && (
              <label className="flex items-start gap-2.5 p-3 rounded-md border border-slate-200 bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={physicalSignaturesVerified}
                  onChange={(e) => setPhysicalSignaturesVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C8102E] focus:ring-[#C8102E]"
                />
                <span className="text-[11px] text-slate-700 leading-snug font-medium">
                  I have verified that the physically signed Project Line-Item Budget (endorsed by the Study Leader/PI, RDEC Director, and VP-RESEL) matches the digital schedule and does not exceed the En Banc approved budget.
                </span>
              </label>
            )}

            {/* Current Stage Notice */}
            {syncValidation.stage === 'APPROVED' && !syncValidation.hasSignedDocument && (
              <div className="p-3 bg-sky-50/90 border border-sky-200 rounded-md text-[11px] text-sky-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  Approved — Awaiting Signed PDF from Proponent
                </div>
                <p className="text-sky-700 leading-relaxed">
                  Approved on {allocation.reviewedAt ? new Date(allocation.reviewedAt).toLocaleDateString() : 'recent date'} by{' '}
                  <strong>{allocation.reviewerName || 'RPDU Officer'}</strong>. Once the proponent uploads the signed LIB PDF, you can verify the signed sheet total here.
                </p>
              </div>
            )}

            {syncValidation.stage === 'SIGNED' && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-md text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Signed LIB Uploaded &amp; Approved
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  The proponent has uploaded the signed LIB PDF. This Final Approved Budget is now ready for the Professional Service Contract (PSC).
                </p>
              </div>
            )}

            {reviewError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Action Button: Shown only when action is pending (Stage 1 approval or Stage 3 signed LIB verification) */}
            {(syncValidation.stage === 'PENDING' ||
              (syncValidation.hasSignedDocument && syncValidation.stage !== 'SIGNED')) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleReviewDecision}
                  disabled={isSubmitting || !syncValidation.canApprove}
                  className="w-full min-h-11 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting
                    ? 'Saving...'
                    : syncValidation.hasSignedDocument
                    ? 'Verify signed LIB'
                    : 'Approve LIB for Signing'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
