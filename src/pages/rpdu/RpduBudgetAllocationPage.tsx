import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Building,
  User,
  Calendar,
  Receipt,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEligibleBudgets, getRpduBudgets } from '../../lib/budgetApi';
import { formatDate, formatPesoCents } from '../../lib/format';
import { TONE_CLASSES } from '../../components/ui/toneClasses';
import { EmptyState } from '../../components/ui/EmptyState';
import type { EligibleBudgetProposal, RpduBudgetAllocationItem } from '../../types';

interface BudgetLists {
  allocations: RpduBudgetAllocationItem[];
  eligible: EligibleBudgetProposal[];
  error: string | null;
}

export const RpduBudgetAllocationPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [lists, setLists] = useState<BudgetLists | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    Promise.all([getRpduBudgets(token, controller.signal), getEligibleBudgets(token, controller.signal)])
      .then(([allocations, eligible]) => setLists({ allocations, eligible, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLists({ allocations: [], eligible: [], error: err instanceof Error ? err.message : 'Unable to load budget allocations' });
      });
    return () => controller.abort();
  }, [token]);

  const isLoading = lists === null;
  const allocations = useMemo(() => lists?.allocations ?? [], [lists]);
  const eligible = lists?.eligible ?? [];

  // Helper to resolve the 2-stage status of an allocation
  const getAllocationStage = (item: RpduBudgetAllocationItem): 'PENDING' | 'APPROVED' => {
    if (item.isApproved || item.reviewStatus === 'APPROVED' || item.reviewStatus === 'SIGNED') {
      return 'APPROVED';
    }
    return 'PENDING';
  };

  // Statistics for Filter Tabs
  const stats = useMemo(() => {
    const total = allocations.length;
    const pending = allocations.filter((a) => getAllocationStage(a) === 'PENDING').length;
    const approved = allocations.filter((a) => getAllocationStage(a) === 'APPROVED').length;
    return { total, pending, approved };
  }, [allocations]);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const stage = getAllocationStage(a);
      const matchesStatus = statusFilter === 'ALL' || stage === statusFilter;
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
            Prepare and accept the Line-Item Budget (LIB) for each technically cleared proposal across Personnel Services, MOOE, and Equipment Outlay. Accepting a budget lets the proponent route it for endorsement signatures.
          </p>
        </div>
      </div>

      {lists?.error && (
        <p role="alert" className="flex items-start gap-1.5 rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {lists.error}
        </p>
      )}

      {/* Eligible proposals without a LIB */}
      {!isLoading && (
        <section className="bg-white rounded-sm border border-slate-200 shadow-xs">
          <h2 className="px-4 py-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
            Eligible — no budget yet ({eligible.length})
          </h2>
          {eligible.length === 0 ? (
            <EmptyState size="md" icon={Receipt} title="Nothing to prepare" description="Every technically cleared proposal already has a Line-Item Budget." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {eligible.map((entry) => (
                <li key={entry.detailedProposalId} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-[#C8102E]">{entry.code}</div>
                    <div className="font-bold text-slate-900 text-sm break-words mt-0.5">{entry.title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{entry.proponentName}</span>
                      <span className="inline-flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" />{entry.department || 'WMSU Department'}</span>
                      <span>{entry.projectDuration ?? 'Project period not set'}</span>
                      <span>Ceiling {formatPesoCents(entry.ceiling)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/rpdu/budgets/new/${entry.detailedProposalId}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#A00D26]"
                  >
                    <PlusCircle className="h-4 w-4" /> Prepare budget
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
              Accepted ({stats.approved})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold">Loading budget allocations...</p>
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">No Budget Allocations Found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No submissions matched "${searchQuery}". Try a different search term.`
                : 'No Line-Item Budgets match this status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-[32%] min-w-[220px]">PROPOSAL</th>
                  <th className="py-3 px-4 w-[26%] min-w-[180px]">PROPONENT &amp; COLLEGE</th>
                  <th className="py-3 px-4 text-right w-[18%] min-w-[120px]">ALLOCATION (₱)</th>
                  <th className="py-3 px-4 text-center w-[14%] min-w-[110px]">STATUS</th>
                  <th className="py-3 px-4 text-center w-[10%] min-w-[90px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAllocations.map((item) => {
                  const ceiling = item.enBancApprovedAmount ?? item.callBudgetCap;
                  const isOver = item.totalApprovedAmount > ceiling + 0.01;

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
                          <span>Saved {formatDate(item.createdAt)}</span>
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

                      {/* Total Allocation & Step 8.2 En Banc Ceiling */}
                      <td className="py-4 px-4 text-right">
                        <div className={`font-black text-sm sm:text-base font-mono ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatPesoCents(item.totalApprovedAmount)}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px]">
                          <span className="text-slate-400">
                            Ceiling: {formatPesoCents(ceiling)}
                          </span>
                        </div>
                      </td>

                      {/* 2-Stage Review Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {getAllocationStage(item) === 'APPROVED' ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_CLASSES.emerald.badge}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                          </span>
                        ) : item.reviewStatus === 'REOPENED' ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_CLASSES.amber.badge}`}>
                            <RotateCcw className="w-3.5 h-3.5" /> Reopened
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_CLASSES.amber.badge}`}>
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          to={`/rpdu/budgets/${item.id}`}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-sm shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" /> Open
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
