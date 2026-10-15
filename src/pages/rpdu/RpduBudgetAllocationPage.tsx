import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Building,
  User,
  Calendar,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import type { RpduBudgetAllocationItem } from '../../types';

export const RpduBudgetAllocationPage: React.FC = () => {
  const { session } = useAuth();
  const [allocations, setAllocations] = useState<RpduBudgetAllocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  const fetchAllocations = useCallback(async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.RPDU.BUDGET_ALLOCATIONS, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllocations(json.data);
      } else {
        setAllocations([]);
      }
    } catch (err) {
      console.error('Failed to fetch RPDU budget allocations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  // Statistics for Filter Tabs
  const stats = useMemo(() => {
    const total = allocations.length;
    const pending = allocations.filter((a) => a.reviewStatus !== 'APPROVED').length;
    const approved = allocations.filter((a) => a.reviewStatus === 'APPROVED').length;
    return { total, pending, approved };
  }, [allocations]);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'APPROVED' && a.reviewStatus === 'APPROVED') ||
        (statusFilter === 'PENDING' && a.reviewStatus !== 'APPROVED');
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.proposalTitle.toLowerCase().includes(q) ||
        a.proposalCode.toLowerCase().includes(q) ||
        a.proponentName.toLowerCase().includes(q) ||
        a.proponentDepartment.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allocations, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar matching Inception Scheduling */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <Receipt className="w-4 h-4 text-[#C8102E]" />
            <span>Allocation Review Desk</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Line-Item Budget Allocations Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review multi-year Line-Item Budget (LIB) submissions across Personnel Services, MOOE, and Equipment Outlay. Approving an allocation authorizes the proponent to route the document for physical endorsement signatures.
          </p>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header: Search & Filter Tabs matching Inception Scheduling */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by proposal, proponent, or code..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 self-start md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Approved ({stats.approved})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold">Loading submitted budget allocations from database...</p>
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">No Budget Allocations Found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No submissions matched "${searchQuery}". Try a different search term.`
                : 'There are currently no Line-Item Budget submissions matching this status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-[28%] min-w-[220px]">PROPOSAL</th>
                  <th className="py-3 px-4 w-[24%] min-w-[180px]">PROPONENT &amp; COLLEGE</th>
                  <th className="py-3 px-4 text-right w-[16%] min-w-[120px]">ALLOCATION (₱)</th>
                  <th className="py-3 px-4 text-center w-[12%] min-w-[100px]">SIGNED PDF</th>
                  <th className="py-3 px-4 text-center w-[12%] min-w-[110px]">STATUS</th>
                  <th className="py-3 px-4 text-center w-[8%] min-w-[90px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAllocations.map((item) => {
                  const isOver = item.totalApprovedAmount > (item.callBudgetCap || 500000);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Proposal Column */}
                      <td className="py-4 px-4">
                        <div className="font-mono text-xs font-bold text-[#C8102E]">
                          {item.proposalCode}
                        </div>
                        <div className="font-bold text-slate-900 text-sm line-clamp-1 mt-0.5" title={item.proposalTitle}>
                          {item.proposalTitle}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span>&bull;</span>
                          <span>{item.metadata.projectDuration || '1 Year'}</span>
                        </div>
                      </td>

                      {/* Proponent & College */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{item.proponentName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Building className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{item.proponentDepartment || 'WMSU Department'}</span>
                        </div>
                      </td>

                      {/* Total Allocation */}
                      <td className="py-4 px-4 text-right">
                        <div className={`font-black text-sm sm:text-base ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                          ₱{item.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Signed PDF Attachment */}
                      <td className="py-4 px-4 text-center">
                        {item.budgetPdfUrl ? (
                          <a
                            href={item.budgetPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#C8102E] hover:bg-red-100 rounded text-xs font-bold border border-red-200 transition-colors"
                            title="Download Signed PDF Document"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-xs font-medium border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Review Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {item.reviewStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          to={`/rpdu/budgets/${item.id}`}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-sm shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" /> Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
