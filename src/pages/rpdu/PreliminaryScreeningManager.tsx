import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Building,
  Calendar,
  FileText,
  ListFilter,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import type { ConceptProposal, ScreeningStatus } from '../../types';

interface PreliminaryScreeningManagerProps {
  role?: 'rpdu' | 'admin';
}

export const PreliminaryScreeningManager: React.FC<PreliminaryScreeningManagerProps> = ({
  role = 'rpdu',
}) => {
  const {
    conceptProposals,
    loadingConceptProposals,
    screeningError,
    refreshConceptProposals,
  } = useCallForProposals();
  const navigate = useNavigate();
  const restored = useLocation().state?.screeningList;

  const [searchQuery, setSearchQuery] = useState(typeof restored?.searchQuery === 'string' ? restored.searchQuery : '');
  const [statusFilter, setStatusFilter] = useState<'all' | ScreeningStatus>(['all', 'pending', 'passed', 'failed'].includes(restored?.statusFilter) ? restored.statusFilter : 'all');
  const [thematicFilter, setThematicFilter] = useState<string>(typeof restored?.thematicFilter === 'string' ? restored.thematicFilter : 'all');
  const [collegeFilter, setCollegeFilter] = useState<string>(typeof restored?.collegeFilter === 'string' ? restored.collegeFilter : 'all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(restored?.viewMode === 'table' ? 'table' : 'cards');

  // Derived Statistics
  const stats = useMemo(() => {
    const total = conceptProposals.length;
    const pending = conceptProposals.filter((p) => p.screeningStatus === 'pending').length;
    const passed = conceptProposals.filter((p) => p.screeningStatus === 'passed').length;
    const failed = conceptProposals.filter((p) => p.screeningStatus === 'failed').length;
    const passRate = total > 0 ? Math.round((passed / (passed + failed || 1)) * 100) : 0;
    return { total, pending, passed, failed, passRate };
  }, [conceptProposals]);

  // Extract unique filter options
  const uniqueThematicAreas = useMemo(() => {
    return Array.from(new Set(conceptProposals.map((p) => p.thematicArea)));
  }, [conceptProposals]);

  const uniqueColleges = useMemo(() => {
    return Array.from(new Set(conceptProposals.map((p) => p.college)));
  }, [conceptProposals]);

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return conceptProposals.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.screeningStatus === statusFilter;
      const matchesThematic = thematicFilter === 'all' || p.thematicArea === thematicFilter;
      const matchesCollege = collegeFilter === 'all' || p.college === collegeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.leadInvestigator.toLowerCase().includes(q) ||
        p.college.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q);

      return matchesStatus && matchesThematic && matchesCollege && matchesSearch;
    });
  }, [conceptProposals, statusFilter, thematicFilter, collegeFilter, searchQuery]);

  const handleOpenReview = (proposal: ConceptProposal) => {
    navigate(`/${role}/screening/${proposal.id}`, {
      state: { screeningList: { searchQuery, statusFilter, thematicFilter, collegeFilter, viewMode } },
    });
  };

  if (loadingConceptProposals) return (
    <div role="status" aria-label="Loading screening information">
      <span className="sr-only">Loading screening information</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-sm border border-slate-200 bg-white p-4"><div className="h-3 w-2/3 rounded bg-slate-100" /><div className="mt-4 h-6 w-10 rounded bg-slate-100" /></div>)}</div>
        <div className="h-24 rounded-sm border border-slate-200 bg-white" />
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-3 rounded-sm border border-slate-200 bg-white p-5"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/3 rounded bg-slate-100" /></div>)}
      </div>
    </div>
  );
  if (screeningError) return <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">{screeningError}<button type="button" onClick={() => void refreshConceptProposals()} className="ml-3 font-semibold underline">Try again</button></div>;

  return (
    <div className="space-y-6">

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Total Submissions */}
        <div
          onClick={() => setStatusFilter('all')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Submissions
            </span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{stats.total}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Faculty Concept Proposals</span>
          </div>
        </div>

        {/* Pending Preliminary Screening */}
        <div
          onClick={() => setStatusFilter('pending')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Awaiting Screening
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{stats.pending}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Requires RPDU Action</span>
          </div>
        </div>

        {/* Passed (Qualified) */}
        <div
          onClick={() => setStatusFilter('passed')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Passed Screening
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{stats.passed}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Endorsed ({stats.passRate}% pass rate)
            </span>
          </div>
        </div>

        {/* Failed (Disqualified) */}
        <div
          onClick={() => setStatusFilter('failed')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Returned / Ineligible
            </span>
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{stats.failed}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">With Evaluation Notes</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 ${statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              All Proposals
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${statusFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                {stats.total}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'pending'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Pending Review</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${statusFilter === 'pending' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                {stats.pending}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('passed')}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'passed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Passed</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${statusFilter === 'passed' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                {stats.passed}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'failed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Failed</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${statusFilter === 'failed' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                {stats.failed}
              </span>
            </button>
          </div>

          {/* Right Controls: Search, View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search proposal, proponent, college..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1.5 pl-9 pr-3 rounded focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'cards' ? 'bg-white shadow-2xs text-[#C8102E]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-2xs text-[#C8102E]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <ListFilter className="w-3.5 h-3.5" /> Filters:
          </span>

          <select
            value={thematicFilter}
            onChange={(e) => setThematicFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
          >
            <option value="all">All Thematic Priority Areas</option>
            {uniqueThematicAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
          >
            <option value="all">All WMSU Colleges</option>
            {uniqueColleges.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          {(statusFilter !== 'all' || thematicFilter !== 'all' || collegeFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setThematicFilter('all');
                setCollegeFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-[#C8102E] hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Proposals Presentation: Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4">
          {filteredProposals.map((proposal) => {
            const isPassed = proposal.screeningStatus === 'passed';
            const isFailed = proposal.screeningStatus === 'failed';
            const isPending = proposal.screeningStatus === 'pending';

            return (
              <div
                key={proposal.id}
                className={`bg-white rounded-md border p-5 shadow-2xs transition-all hover:shadow-md relative ${isPassed
                  ? 'border-emerald-200'
                  : isFailed
                    ? 'border-red-200'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                  {/* Left Column: Details */}
                  <div className="space-y-2.5 flex-1 min-w-0">

                    {/* Header line: Status, Call */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize flex items-center gap-1.5 ${isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isFailed
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isPassed ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                            }`}
                        />
                        {isPending
                          ? 'Pending Screening'
                          : isPassed
                            ? 'Passed Screening'
                            : 'Failed Screening'}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-500">
                        {proposal.callTitle}
                      </span>
                    </div>

                    {/* Proposal Title */}
                    <h3
                      onClick={() => handleOpenReview(proposal)}
                      className="text-base font-extrabold text-slate-900 leading-snug cursor-pointer hover:text-[#C8102E] transition-colors"
                    >
                      {proposal.title}
                    </h3>

                    {/* Meta Info: Proponent, College, Submission Date */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <strong className="text-slate-800">Proponent:</strong>
                        <span>{proposal.leadInvestigator}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proposal.college}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted {proposal.submittedAt}</span>
                      </span>
                    </div>


                    {/* Decision Records / Remarks Preview */}
                    {isPassed && proposal.screeningRemarks && (
                      <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Clearance Remarks:
                          </span>
                          {proposal.screenedBy && (
                            <span className="text-[10px] text-emerald-700">
                              Screened by: {proposal.screenedBy} ({proposal.screenedAt})
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2">{proposal.screeningRemarks}</p>
                      </div>
                    )}

                    {isFailed && (
                      <div className="p-2.5 rounded bg-red-50/70 border border-red-200 text-xs text-red-900 mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-red-800 uppercase tracking-wider flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Disqualification Grounds:
                          </span>
                          {proposal.screenedBy && (
                            <span className="text-[10px] text-red-700">
                              {proposal.screenedBy} ({proposal.screenedAt})
                            </span>
                          )}
                        </div>
                        {proposal.failureReasons && (
                          <div className="flex flex-wrap gap-1">
                            {proposal.failureReasons.map((fr, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-semibold"
                              >
                                &bull; {fr}
                              </span>
                            ))}
                          </div>
                        )}
                        {proposal.sectionComments && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-red-100 text-[10px]">
                            {proposal.sectionComments.title && (
                              <div className="bg-red-100/50 p-1.5 rounded text-red-900">
                                <strong>Title:</strong> {proposal.sectionComments.title}
                              </div>
                            )}
                            {proposal.sectionComments.rationaleSignificance && (
                              <div className="bg-red-100/50 p-1.5 rounded text-red-900">
                                <strong>Rationale:</strong> {proposal.sectionComments.rationaleSignificance}
                              </div>
                            )}
                            {proposal.sectionComments.objectives && (
                              <div className="bg-red-100/50 p-1.5 rounded text-red-900">
                                <strong>Objectives:</strong> {proposal.sectionComments.objectives}
                              </div>
                            )}
                            {proposal.sectionComments.estimatedBudget && (
                              <div className="bg-red-100/50 p-1.5 rounded text-red-900">
                                <strong>Budget:</strong> {proposal.sectionComments.estimatedBudget}
                              </div>
                            )}
                          </div>
                        )}
                        {proposal.screeningRemarks && (
                          <p className="line-clamp-2 text-slate-700 pt-1 border-t border-red-100">
                            <strong>Overall Feedback:</strong> {proposal.screeningRemarks}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Review actions */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between gap-2 shrink-0 self-stretch md:self-center border-t md:border-t-0 pt-3 md:pt-0">

                    {/* View Files Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenReview(proposal)}
                      className="px-3.5 py-1.5 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Files ({proposal.attachments.filter((file) => file.dataUrl).length})</span>
                    </button>


                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenReview(proposal)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-[#C8102E] transition-colors text-right cursor-pointer"
                      >
                        Change Decision &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Proposals Presentation: Compact Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-md border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5">Name of Proponent</th>
                <th className="p-3.5">Title</th>
                <th className="p-3.5">College</th>
                <th className="p-3.5">Date Submitted</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Screening Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.map((proposal) => {
                const isPassed = proposal.screeningStatus === 'passed';
                const isFailed = proposal.screeningStatus === 'failed';

                return (
                  <tr key={proposal.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Name of the Proponent */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{proposal.leadInvestigator}</p>
                        <p className="text-[11px] text-slate-500">{proposal.leadInvestigatorEmail}</p>
                      </div>
                    </td>


                    {/* 2. Title */}
                    <td className="p-3.5 max-w-md">
                      <p
                        onClick={() => handleOpenReview(proposal)}
                        className="font-bold text-slate-900 hover:text-[#C8102E] cursor-pointer text-xs leading-snug line-clamp-2"
                      >
                        {proposal.title}
                      </p>
                    </td>


                    {/* 3. College */}
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-semibold text-slate-800 text-xs">{proposal.college}</p>
                      <p className="text-[11px] text-slate-500">{proposal.department}</p>
                    </td>

                    {/* 4. Date Submitted */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{proposal.submittedAt}</span>
                      </div>
                    </td>

                    {/* 5. Status */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize inline-flex items-center gap-1.5 ${isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isFailed
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isPassed ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                            }`}
                        />
                        {proposal.screeningStatus === 'pending'
                          ? 'Pending'
                          : proposal.screeningStatus === 'passed'
                            ? 'Passed'
                            : 'Failed'}
                      </span>
                    </td>

                    {/* 6. Screening Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(proposal)}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Review Files (Concept Proposal & Endorsement Form)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Files</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
      )}

      {/* Empty State */}
      {filteredProposals.length === 0 && (
        <div className="bg-white p-12 text-center rounded-md border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">No Concept Proposals Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No submissions matched your filter or search query. Try adjusting the filter criteria or resetting search terms.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setThematicFilter('all');
              setCollegeFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded text-xs font-bold text-[#C8102E] bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

    </div>
  );
};
