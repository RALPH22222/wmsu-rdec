import React, { useState } from 'react';
import { Calendar, FileCheck, Layers, Users } from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { CallForProposalsManager } from '../../components/adminComponent/CallForProposalsManager';

export const AdminDashboard: React.FC = () => {
  const { activeCall, calls, currentUser } = useCallForProposals();
  const [activeTab, setActiveTab] = useState<'calls' | 'proposals' | 'evaluators'>('calls');

  const totalSubmissions = calls.reduce((acc, curr) => acc + curr.submissionCount, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#C8102E] text-white uppercase tracking-wider shadow-2xs">
            Admin Page
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {currentUser.name}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          {currentUser.department}
        </p>
      </div>

      {/* Metrics Grid */}
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
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
              className={`w-9 h-9 rounded-sm flex items-center justify-center ${
                activeCall ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
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
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 sm:col-span-2 lg:col-span-1">
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
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 sm:space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'calls'
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
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'proposals'
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
            className={`py-3.5 px-1 border-b-2 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'evaluators'
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

export default AdminDashboard;
