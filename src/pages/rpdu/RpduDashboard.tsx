import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileCheck, Layers, Users, ClipboardCheck, Scale } from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { CallForProposalsManager } from '../../components/adminComponent/CallForProposalsManager';
import { PipelineSummaryPanel } from '../../components/rpduComponent/PipelineSummaryPanel';
import { EvaluatorRosterTable } from '../../components/rpduComponent/EvaluatorRosterTable';
import { StatCard } from '../../components/ui/StatCard';

export const RpduDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeCall, calls, conceptProposals } = useCallForProposals();
  const { user, profile, loadingProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'calls' | 'proposals' | 'evaluators'>('calls');

  const fullName = formatUserFullName(profile, user, 'RPDU Staff');

  const totalSubmissions = calls.reduce((acc, curr) => acc + curr.submissionCount, 0);
  const pendingScreeningCount = conceptProposals.filter((p) => p.screeningStatus === 'pending').length;
  const passedScreeningCount = conceptProposals.filter((p) => p.screeningStatus === 'passed').length;

  // Detailed-proposal pipeline: read live from context so changes made on any page show up here.
  const { proposals, evaluators } = useProposalPipeline();
  const awaitingEvaluatorsCount = proposals.filter((p) => p.status === 'pending_assignment').length;
  const underReviewCount = proposals.filter((p) => p.status === 'under_review').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* RPDU Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#C8102E] text-white uppercase tracking-wider shadow-2xs">
            RPDU Page
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {loadingProfile && !profile ? (
            <span className="inline-block w-64 h-8 bg-slate-200 animate-pulse rounded align-middle" />
          ) : (
            `Welcome back, ${fullName}`
          )}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Research, Publication &amp; Development Unit (RPDU) — WMSU
        </p>
      </div>

      {/* Metrics Grid */}
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 sm:gap-5">
        {/* Card 1: Total Proposals */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Proposals Received
            </span>
            <div className="w-9 h-9 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{totalSubmissions}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Across all call cycles</p>
          </div>
        </div>

        {/* Card 2: Active Call Window */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Call Status
            </span>
            <div
              className={`w-9 h-9 rounded-sm flex items-center justify-center ${activeCall ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            {activeCall ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-base font-bold text-slate-900 truncate">
                    {activeCall.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Closes on {activeCall.endDate}
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-slate-700">No Active Call</div>
                <p className="text-xs text-slate-500 mt-1">Open a window to accept submissions</p>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Calls In System */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Call Cycles
            </span>
            <div className="w-9 h-9 rounded-sm bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{calls.length}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Active, draft, and closed calls</p>
          </div>
        </div>

        {/* Card 4: Preliminary Screening Queue */}
        <div
          onClick={() => navigate('/rpdu/screening')}
          className="bg-white p-5 rounded-sm border border-amber-200 hover:border-amber-300 shadow-xs flex flex-col justify-between space-y-4 cursor-pointer transition-all hover:shadow-md bg-amber-50/20 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Screening Queue
            </span>
            <div className="w-9 h-9 rounded-sm bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-900">{pendingScreeningCount}</span>
              <span className="text-xs font-bold text-amber-700">Pending Review</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between font-medium">
              <span>{passedScreeningCount} passed</span>
              <span className="text-[#C8102E] font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Screen Now &rarr;
              </span>
            </p>
          </div>
        </div>

        {/* Card 5: Technical Review Queue */}
        <StatCard
          label="Technical Review Queue"
          value={awaitingEvaluatorsCount + underReviewCount}
          hint={`${awaitingEvaluatorsCount} awaiting evaluators · ${underReviewCount} under review`}
          icon={Scale}
          tone="blue"
          onClick={() => navigate('/rpdu/evaluations')}
        />
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'calls'
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Call for Proposals Manager</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 ml-1">
              {calls.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proposals')}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'proposals'
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Proposals Review</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 ml-1">
              {proposals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluators')}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'evaluators'
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Evaluators Roster</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 ml-1">
              {evaluators.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'calls' && <CallForProposalsManager />}

      {activeTab === 'proposals' && <PipelineSummaryPanel />}

      {activeTab === 'evaluators' && <EvaluatorRosterTable />}
    </div>
  );
};

export default RpduDashboard;
