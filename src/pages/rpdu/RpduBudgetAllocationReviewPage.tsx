import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  User,
  Users,
  Building,
  Calendar,
  Send,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import type { RpduBudgetAllocationItem } from '../../types';

export const RpduBudgetAllocationReviewPage: React.FC = () => {
  const { allocationId } = useParams<{ allocationId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [allocation, setAllocation] = useState<RpduBudgetAllocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
        setAllocation(json.data);
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

  const handleApproveAllocation = async () => {
    if (!allocation || !session?.access_token) return;

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
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to approve budget allocation');
      }

      // Refresh allocation details
      await fetchAllocation();
    } catch (err: unknown) {
      console.error('Error approving budget allocation:', err);
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
      <div>
        <Link
          to="/rpdu/budgets"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Budget Allocations
        </Link>
      </div>

      {/* Header Overview Card */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-extrabold text-[#C8102E] bg-red-50 border border-red-100 px-2.5 py-1 rounded">
              {allocation.proposalCode}
            </span>
            <span className="text-xs font-bold text-slate-400">Multi-Year Line-Item Budget (LIB)</span>
          </div>

          <div>
            {allocation.reviewStatus === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Review
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Duration</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {allocation.metadata.projectDuration || '1 Year'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {allocation.metadata.coResearchers?.length || 0} Co-Researcher(s)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Proposed Amount</span>
                <span className="font-black text-slate-900 text-sm block mt-0.5 text-[#C8102E]">
                  ₱{allocation.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Cap: ₱{(allocation.callBudgetCap || 500000).toLocaleString()}
                </span>
              </div>
            </div>

            {allocation.metadata.coResearchers && allocation.metadata.coResearchers.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Co-Researchers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allocation.metadata.coResearchers.map((c, i) => (
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

        {/* Right Column (1 Col): Document Attachment & Review Actions */}
        <div className="space-y-6">
          {/* Official Budget Document (PDF) Card */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C8102E]" /> Line-Item Budget Document (PDF)
            </h3>

            {allocation.budgetPdfUrl ? (
              <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-red-100 text-[#C8102E] rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 text-xs block truncate">
                      Submitted_Budget.pdf
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed Document Attached
                    </span>
                  </div>
                </div>

                <a
                  href={allocation.budgetPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-md border border-slate-300 transition-colors flex items-center justify-center gap-2 text-xs shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View / Download PDF
                </a>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" /> Pending
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The proponent will route this official Line-Item Budget document for signatures and upload the endorsed PDF after RPDU approval.
                </p>
              </div>
            )}
          </div>

          {/* Review Decision Workspace */}
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C8102E]" /> Review Decision
            </h3>

            {/* Current Decision Banner */}
            {allocation.reviewStatus === 'APPROVED' ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Allocation Approved
                </div>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Reviewed on {allocation.reviewedAt ? new Date(allocation.reviewedAt).toLocaleDateString() : 'recent date'}. Proponent is authorized to proceed with physical routing signatures.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" /> Pending Review
                </div>
                <p className="text-amber-700 leading-tight text-[11px] mt-1">
                  Evaluate multi-year expenditures against institutional caps and guidelines before finalizing approval.
                </p>
              </div>
            )}

            {reviewError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Action Button: Approve Allocation Only */}
            {allocation.reviewStatus !== 'APPROVED' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleApproveAllocation}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Processing...' : 'Approve Allocation'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
