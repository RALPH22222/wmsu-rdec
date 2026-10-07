import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileCheck, FileText, Layers, Users, ClipboardCheck } from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { CallForProposalsManager } from '../../components/adminComponent/CallForProposalsManager';

export const RpduDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeCall, calls, conceptProposals } = useCallForProposals();
  const { user, profile, loadingProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'calls' | 'proposals' | 'evaluators'>('calls');

  const fullName = formatUserFullName(profile, user, 'RPDU Staff');

  const totalSubmissions = calls.reduce((acc, curr) => acc + curr.submissionCount, 0);
  const pendingScreeningCount = conceptProposals.filter((p) => p.screeningStatus === 'pending').length;
  const passedScreeningCount = conceptProposals.filter((p) => p.screeningStatus === 'passed').length;

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

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Total Proposals */}
        <div className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Proposals
            </span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{totalSubmissions}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Across all call cycles</span>
          </div>
        </div>

        {/* Card 2: Active Call Window */}
        <div className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Call Status
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">
              {activeCall ? '1' : '0'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block truncate">
              {activeCall ? (activeCall.title || 'Window Open') : 'No Open Call Window'}
            </span>
          </div>
        </div>

        {/* Card 3: Calls In System */}
        <div className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Call Cycles
            </span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{calls.length}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Active, Draft &amp; Closed</span>
          </div>
        </div>

        {/* Card 4: Preliminary Screening Queue */}
        <div
          onClick={() => navigate('/rpdu/screening')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
              Screening Queue
            </span>
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">{pendingScreeningCount}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {pendingScreeningCount > 0 ? 'Pending RPDU Review' : `${passedScreeningCount} Passed Screening`}
            </span>
          </div>
        </div>
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
              {totalSubmissions}
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
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'calls' && <CallForProposalsManager />}

      {activeTab === 'proposals' && (
        <div className="bg-white p-12 text-center rounded-sm border border-slate-200 shadow-xs">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Proposals Management Pipeline</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
            Faculty submissions under active calls will populate here for eligibility checks, peer evaluation assignment, and grant approvals.
          </p>
        </div>
      )}

      {activeTab === 'evaluators' && (
        <div className="bg-white p-12 text-center rounded-sm border border-slate-200 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Technical Evaluators Panel</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
            Maintain the roster of internal and external peer reviewers, track evaluation turnaround times, and assign proposals.
          </p>
        </div>
      )}
    </div>
  );
};

export default RpduDashboard;
