import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Calendar,
  Eye,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { formatDate } from '../../lib/format';
import type { RpduBudgetAllocationItem } from '../../types';
import { ProposalSearchBar } from '../../components/ui/ProposalSearchBar';
import { EmptyState } from '../../components/ui/EmptyState';

export const RpduBudgetAllocationPage: React.FC = () => {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [allocations, setAllocations] = useState<RpduBudgetAllocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.RPDU.BUDGET_ALLOCATIONS, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        if (!cancelled) {
          setAllocations(json.success && Array.isArray(json.data) ? json.data : []);
        }
      } catch (err) {
        console.error('Failed to fetch RPDU budget allocations:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const getAllocationStage = (item: RpduBudgetAllocationItem): 'PENDING' | 'APPROVED' => {
    if (item.isApproved || item.reviewStatus === 'APPROVED' || item.reviewStatus === 'SIGNED') {
      return 'APPROVED';
    }
    return 'PENDING';
  };

  const stats = useMemo(() => {
    const total = allocations.length;
    const pending = allocations.filter((a) => getAllocationStage(a) === 'PENDING').length;
    const approved = allocations.filter((a) => getAllocationStage(a) === 'APPROVED').length;
    return { total, pending, approved };
  }, [allocations]);

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

  const activeFilterCount = Number(Boolean(searchQuery.trim())) + Number(statusFilter !== 'ALL');

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 text-slate-900" aria-labelledby="budget-allocations-title">
      {/* Unboxed Page Header matching Technical Evaluations & Inception Scheduling */}
      <header>
        <h1 id="budget-allocations-title" className="text-2xl font-bold tracking-tight text-slate-900">
          Line-Item Budget Allocations Review
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600">
          Review multi-year Line-Item Budget (LIB) submissions across Personnel Services, MOOE, and Equipment Outlay. Approving an allocation authorizes the proponent to route the document for physical endorsement signatures.
        </p>
      </header>

      {/* Search & Status Filter matching Technical Evaluations */}
      <ProposalSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by proposal title, proponent, college, or code..."
        ariaLabel="Search budget allocations"
        activeFilterCount={activeFilterCount}
        onReset={handleResetFilters}
        resultSummary={
          activeFilterCount > 0 && !isLoading
            ? `${filteredAllocations.length} matching submission${filteredAllocations.length === 1 ? '' : 's'}`
            : undefined
        }
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED')}
          aria-label="Filter by budget review status"
          className="min-h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
        >
          <option value="ALL">All statuses ({stats.total})</option>
          <option value="PENDING">Pending Review ({stats.pending})</option>
          <option value="APPROVED">Accepted ({stats.approved})</option>
        </select>
      </ProposalSearchBar>

      {/* Structured Row List matching Technical Evaluations & Inception Scheduling */}
      {isLoading ? (
        <div role="status" aria-busy="true" className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-2xs">
          <span className="sr-only">Loading submitted budget allocations</span>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} aria-hidden="true" className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between motion-safe:animate-pulse">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-6 w-28 rounded-none bg-slate-200" />
                  <div className="h-6 w-28 rounded-none bg-slate-100" />
                </div>
                <div className="h-5 w-3/4 max-w-lg rounded-sm bg-slate-200" />
                <div className="flex flex-wrap gap-4">
                  <div className="h-4 w-36 rounded-sm bg-slate-100" />
                  <div className="h-4 w-44 rounded-sm bg-slate-100" />
                  <div className="h-4 w-32 rounded-sm bg-slate-100" />
                </div>
              </div>
              <div className="h-11 w-28 rounded-sm bg-slate-200 lg:shrink-0" />
            </div>
          ))}
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-2xs">
          <EmptyState
            icon={Receipt}
            title={allocations.length === 0 ? 'No budget allocations submitted yet' : 'No budget allocations match'}
            description={
              allocations.length === 0
                ? 'Line-Item Budget submissions will appear here once proponents with an approved Certificate of Technical Review submit their LIB.'
                : 'Try a different search term or status filter.'
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-sm border border-slate-200 bg-white shadow-2xs">
          {filteredAllocations.map((item) => {
            const stage = getAllocationStage(item);
            const isApproved = stage === 'APPROVED';
            const ceiling = item.enBancApprovedAmount ?? item.callBudgetCap ?? 500000;
            const isOver = item.totalApprovedAmount > ceiling + 0.01;
            const enBancAmount = item.enBancApprovedAmount ?? item.totalApprovedAmount;

            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/60 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Status & Budget Summary Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-none border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-none border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                        Pending Review
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-none border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                        isOver
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-slate-50 text-slate-800'
                      }`}
                    >
                      ₱{item.totalApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      En Banc: ₱{enBancAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Proposal Title */}
                  <h2 className="break-words text-base font-bold leading-snug text-slate-900">
                    {item.proposalTitle}
                  </h2>

                  {/* Simple inline metadata matching Preliminary Screening */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <strong className="text-slate-800">Proponent:</strong>
                      <span className="break-words">{item.proponentName}</span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Building className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="break-words">{item.proponentDepartment || 'WMSU Department'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span>
                        Submitted {formatDate(item.createdAt)} · {item.metadata.projectDuration || '1 Year'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 lg:shrink-0 lg:justify-end lg:border-t-0 lg:pt-0">
                  <Link
                    to={`/rpdu/budgets/${item.id}`}
                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isApproved
                        ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        : 'bg-[#C8102E] text-white hover:bg-[#A00D26]'
                    }`}
                  >
                    <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {isApproved ? 'View LIB' : 'Review LIB'}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
