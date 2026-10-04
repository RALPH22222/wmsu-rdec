import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
  Check,
  Info,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { ConceptProposal, ScreeningSectionComments } from '../../../types';

interface PreliminaryScreeningModalProps {
  isOpen: boolean;
  proposal: ConceptProposal | null;
  onClose: () => void;
  onPass: (id: string, remarks?: string) => void;
  onFail: (
    id: string,
    reasons: string[],
    remarks: string,
    criteria?: any,
    sectionComments?: ScreeningSectionComments
  ) => void;
  onReset?: (id: string) => void;
}

export const PreliminaryScreeningModal: React.FC<PreliminaryScreeningModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onPass,
  onFail,
  onReset,
}) => {
  const [activeFile, setActiveFile] = useState<'concept' | 'endorsement'>('concept');
  const [actionType, setActionType] = useState<'pass' | 'fail' | null>(null);
  const [showSideFile, setShowSideFile] = useState(false);

  // Single comment for PASS
  const [passRemarks, setPassRemarks] = useState('');

  // Per-section comments for FAIL
  const [titleComment, setTitleComment] = useState('');
  const [rationaleComment, setRationaleComment] = useState('');
  const [objectivesComment, setObjectivesComment] = useState('');
  const [budgetComment, setBudgetComment] = useState('');
  const [overallFailComment, setOverallFailComment] = useState('');

  useEffect(() => {
    if (isOpen && proposal) {
      document.body.style.overflow = 'hidden';
      setActiveFile('concept');
      setShowSideFile(false);
      setActionType(
        proposal.screeningStatus === 'passed'
          ? 'pass'
          : proposal.screeningStatus === 'failed'
            ? 'fail'
            : null
      );
      setPassRemarks(
        proposal.screeningStatus === 'passed' && proposal.screeningRemarks
          ? proposal.screeningRemarks
          : 'PASSED: Concept proposal and endorsement form verified and approved for full proposal submission.'
      );
      setOverallFailComment(
        proposal.screeningStatus === 'failed' && proposal.screeningRemarks
          ? proposal.screeningRemarks
          : ''
      );
      setTitleComment(proposal.sectionComments?.title || '');
      setRationaleComment(proposal.sectionComments?.rationaleSignificance || '');
      setObjectivesComment(proposal.sectionComments?.objectives || '');
      setBudgetComment(proposal.sectionComments?.estimatedBudget || '');
    } else {
      document.body.style.overflow = '';
      setActionType(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, proposal]);

  if (!isOpen || !proposal) return null;

  const conceptFileName = 'Concept_Proposal.pdf';
  const endorsementFileName = 'Dean_Endorsement_Form.pdf';

  const handleConfirmPass = () => {
    onPass(
      proposal.id,
      passRemarks.trim() || 'PASSED: Concept proposal and endorsement form verified and approved for full proposal submission.'
    );
    onClose();
  };

  const handleConfirmFail = () => {
    const hasAnySectionComment =
      titleComment.trim() ||
      rationaleComment.trim() ||
      objectivesComment.trim() ||
      budgetComment.trim();

    if (!hasAnySectionComment && !overallFailComment.trim()) {
      alert('Please provide an overall remark or comment on at least one section explaining why this proposal failed.');
      return;
    }

    const sectionComments: ScreeningSectionComments = {
      title: titleComment.trim() || undefined,
      rationaleSignificance: rationaleComment.trim() || undefined,
      objectives: objectivesComment.trim() || undefined,
      estimatedBudget: budgetComment.trim() || undefined,
    };

    const reasons: string[] = [];
    if (titleComment.trim()) reasons.push('Title revisions required');
    if (rationaleComment.trim()) reasons.push('Rationale / significance insufficient');
    if (objectivesComment.trim()) reasons.push('Objectives need revision');
    if (budgetComment.trim()) reasons.push('Budget adjustment required');
    if (reasons.length === 0) reasons.push('Preliminary compliance criteria not met');

    onFail(
      proposal.id,
      reasons,
      overallFailComment.trim() || 'Concept proposal did not meet preliminary screening criteria based on section evaluation.',
      undefined,
      sectionComments
    );
    onClose();
  };

  const renderFileTabs = (isSideLayout: boolean) => (
    <div className={isSideLayout ? 'shrink-0' : 'p-4 bg-slate-100/70 border-b border-slate-200'}>
      {!isSideLayout && (
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Submitted Review Documents (2 Files)
        </div>
      )}
      <div className={isSideLayout ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        {/* File 1: Concept Proposal */}
        <div
          onClick={() => setActiveFile('concept')}
          className={`p-2 sm:p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
            activeFile === 'concept'
              ? 'bg-white border-slate-800 shadow-2xs ring-1 ring-slate-800/10'
              : 'bg-white/80 border-slate-200 hover:border-slate-400 hover:bg-white'
          }`}
        >
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">
                1. Concept Proposal
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                PDF
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{conceptFileName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                activeFile === 'concept'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {activeFile === 'concept' ? 'Viewing' : 'View'}
            </span>
          </div>
        </div>

        {/* File 2: Endorsement Form */}
        <div
          onClick={() => setActiveFile('endorsement')}
          className={`p-2 sm:p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
            activeFile === 'endorsement'
              ? 'bg-white border-slate-800 shadow-2xs ring-1 ring-slate-800/10'
              : 'bg-white/80 border-slate-200 hover:border-slate-400 hover:bg-white'
          }`}
        >
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">
                2. Endorsement Form
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                PDF
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{endorsementFileName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                activeFile === 'endorsement'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {activeFile === 'endorsement' ? 'Viewing' : 'View'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentViewer = (isSideLayout: boolean) => (
    <div className={`bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden flex flex-col ${
      isSideLayout ? 'flex-1 min-h-0' : 'flex-1'
    }`}>
      {/* Viewer Control Bar - Clean Neutral Theme */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md text-xs">
            {activeFile === 'concept' ? conceptFileName : endorsementFileName}
          </span>
          <span className="text-[10px] text-slate-500 bg-slate-200/70 border border-slate-200 px-2 py-0.5 rounded shrink-0">
            Page 1 of {activeFile === 'concept' ? '3' : '1'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => alert(`Simulating download of ${activeFile === 'concept' ? conceptFileName : endorsementFileName}`)}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Download File"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Download</span>
          </button>
          {isSideLayout && (
            <button
              type="button"
              onClick={() => setShowSideFile(false)}
              className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              title="Close File on Side"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Document Content Canvas */}
      <div
        className={`p-4 sm:p-5 bg-slate-50 overflow-y-auto text-slate-800 font-serif ${
          isSideLayout ? 'flex-1 min-h-0' : 'min-h-[260px] max-h-[380px]'
        }`}
      >
        {activeFile === 'concept' ? (
          /* Concept Proposal Document Representation */
          <div className="max-w-2xl mx-auto bg-white p-5 sm:p-7 rounded shadow-xs border border-slate-200 space-y-4 text-xs font-sans">
            <div className="text-center border-b border-slate-200 pb-3 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Western Mindanao State University &bull; RDEC
              </p>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                DOST-Form 1B: Concept Proposal Submission
              </h3>
            </div>

            <div className="space-y-3 text-slate-700 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
                <p><strong>Lead Proponent:</strong> {proposal.leadInvestigator}</p>
                <p><strong>College / Department:</strong> {proposal.college} — {proposal.department}</p>
                <p><strong>Funding Call Cycle:</strong> {proposal.callTitle}</p>
                <p><strong>Proposed Duration:</strong> {proposal.durationMonths} Months</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  1. Title
                </h4>
                <p className="text-slate-800 font-semibold text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                  {proposal.title}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  2. Rationale / Significance &amp; Local Relevance
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {proposal.executiveSummary}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  3. General &amp; Specific Objectives
                </h4>
                <ul className="list-disc pl-5 text-slate-600 space-y-1 text-[11px]">
                  {proposal.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  4. Estimated Total Budget
                </h4>
                <p className="text-slate-800 font-bold text-xs bg-slate-50 p-2 rounded border border-slate-200 inline-block">
                  ₱{proposal.budgetRequested?.toLocaleString() || '0'} PHP
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  5. Methodology Overview
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {proposal.methodologySummary}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Endorsement Form Document Representation */
          <div className="max-w-2xl mx-auto bg-white p-5 sm:p-7 rounded shadow-xs border border-slate-200 space-y-4 text-xs font-sans">
            <div className="text-center border-b border-slate-200 pb-3 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Western Mindanao State University
              </p>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Official College Dean Endorsement Form
              </h3>
              <p className="text-[11px] text-slate-500">Office of the College Dean &bull; Academic Year 2026–2027</p>
            </div>

            <div className="space-y-4 text-slate-700 text-xs leading-relaxed">
              <p>
                To the <strong>Director, Research, Publication &amp; Development Unit (RPDU)</strong>:
              </p>
              <p>
                This is to officially endorse the research concept proposal submitted by{' '}
                <strong>{proposal.leadInvestigator}</strong> of the <strong>{proposal.department}</strong>,{' '}
                <strong>{proposal.college}</strong>.
              </p>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-950 space-y-1 text-[11px]">
                <p className="font-bold">Dean's Institutional Clearance Checklist:</p>
                <p>✓ Proponent has regular tenured faculty status with permissible research teaching load.</p>
                <p>✓ College laboratory and departmental space commitments are certified available.</p>
                <p>✓ Proposal aligns with the College research priority agenda.</p>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-end justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Endorsement</p>
                  <p className="font-semibold text-slate-800">{proposal.submittedAt}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded text-[10px] font-mono text-slate-600 mb-1 border border-slate-200">
                    [Digital Signature Verified]
                  </div>
                  <p className="font-bold text-slate-900">Office of the College Dean</p>
                  <p className="text-[11px] text-slate-500">{proposal.college}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFailForm = () => {
    const sections = [
      {
        num: 1,
        id: 'title',
        title: 'Title',
        hint: 'Clarity, conciseness, scope & alignment',
        value: titleComment,
        setter: setTitleComment,
        placeholder: 'e.g., Title lacks focus, scope is too broad, or does not reflect the proposed intervention...',
      },
      {
        num: 2,
        id: 'rationale',
        title: 'Rationale / Significance',
        hint: 'Problem justification, local relevance, regional impact',
        value: rationaleComment,
        setter: setRationaleComment,
        placeholder: 'e.g., Problem statement requires stronger local data justification or clearer beneficiary impact...',
      },
      {
        num: 3,
        id: 'objectives',
        title: 'Objectives',
        hint: 'SMART alignment, measurable outcomes, feasibility',
        value: objectivesComment,
        setter: setObjectivesComment,
        placeholder: 'e.g., Objectives are not measurable, missing specific deliverables within the proposed duration...',
      },
      {
        num: 4,
        id: 'budget',
        title: 'Estimated Total Budget',
        hint: 'Allowable items, ceiling compliance, justification',
        value: budgetComment,
        setter: setBudgetComment,
        placeholder: 'e.g., Exceeds ceiling guidelines, contains ineligible line items, or requires itemized breakdown...',
      },
    ];

    const filledCount = sections.filter((s) => s.value.trim().length > 0).length;
    const hasOverall = overallFailComment.trim().length > 0;
    const hasAnyFeedback = filledCount > 0 || hasOverall;

    return (
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-full min-h-0 animate-in fade-in duration-200">
        {/* Header Banner - Clean Neutral Slate */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Disapproval Feedback
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Provide notes on sections requiring revision
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasAnyFeedback ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <span>
                <strong className="text-slate-900">{filledCount}</strong>/4 commented
              </span>
            </span>
          </div>
        </div>

        {/* Section Review Cards */}
        <div className="p-3 sm:p-3.5 space-y-2.5 bg-slate-50/50 flex-1 min-h-0 overflow-y-auto">
          {sections.map((section) => {
            const isFilled = section.value.trim().length > 0;
            return (
              <div
                key={section.id}
                className={`rounded-lg border transition-all duration-200 bg-white ${
                  isFilled
                    ? 'border-slate-300 ring-1 ring-slate-200/70 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Section Card Header */}
                <div className="px-3 py-1.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                        isFilled
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isFilled ? <Check className="w-3 h-3 stroke-[3]" /> : section.num}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {section.title}
                    </span>
                    <span className="hidden sm:inline-block text-[11px] text-slate-400">
                      &bull; {section.hint}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFilled ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        Comment added
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-2.5 space-y-1.5">
                  <textarea
                    rows={2}
                    value={section.value}
                    onChange={(e) => section.setter(e.target.value)}
                    placeholder={section.placeholder}
                    className={`w-full text-xs rounded-md p-2 transition-all text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 ${
                      isFilled
                        ? 'bg-white border border-slate-300'
                        : 'bg-slate-50/40 border border-slate-200 focus:bg-white'
                    }`}
                  />

                  {/* Bottom metadata / action */}
                  {isFilled && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{section.value.length} characters</span>
                      <button
                        type="button"
                        onClick={() => section.setter('')}
                        className="text-slate-400 hover:text-red-600 font-medium cursor-pointer transition-colors"
                      >
                        Clear comment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Overall Remarks Card */}
          <div
            className={`rounded-lg border transition-all duration-200 bg-white ${
              hasOverall
                ? 'border-slate-300 ring-1 ring-slate-200/70 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <MessageSquare className="w-3 h-3" />
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Overall Summary Remarks &amp; Next Steps
                </span>
              </div>
              {hasOverall ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Remarks provided
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                  General
                </span>
              )}
            </div>

            <div className="p-2.5 space-y-1.5">
              <textarea
                rows={2}
                value={overallFailComment}
                onChange={(e) => setOverallFailComment(e.target.value)}
                placeholder="Provide overall evaluation summary, primary grounds for disapproval, or specific instructions for resubmission..."
                className={`w-full text-xs rounded-md p-2 transition-all text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 ${
                  hasOverall
                    ? 'bg-white border border-slate-300'
                    : 'bg-slate-50/40 border border-slate-200 focus:bg-white'
                }`}
              />

              {hasOverall && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>{overallFailComment.length} characters</span>
                  <button
                    type="button"
                    onClick={() => setOverallFailComment('')}
                    className="text-slate-400 hover:text-red-600 font-medium cursor-pointer transition-colors"
                  >
                    Clear remarks
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPassForm = () => {
    return (
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-full min-h-0 animate-in fade-in duration-200">
        {/* Header Banner - Clean Neutral Slate */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Pass Feedback
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Provide remarks and next steps for the proponent
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  passRemarks.trim() ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <span>{passRemarks.trim() ? 'Remarks added' : 'Optional'}</span>
            </span>
          </div>
        </div>

        {/* Pass Form Body */}
        <div className="p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                Remarks for Proponent
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Optional
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Provide overall feedback, instructions, or commendation for the proponent upon clearing preliminary screening (e.g., instructions for full proposal submission):
            </p>

            <textarea
              rows={5}
              value={passRemarks}
              onChange={(e) => setPassRemarks(e.target.value)}
              placeholder="Enter remarks or approval notes for the proponent (e.g., cleared for full proposal submission, prepare detailed line-item budget)..."
              className="w-full text-xs rounded-md p-2.5 transition-all text-slate-800 placeholder-slate-400 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
            />

            {passRemarks.trim() && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{passRemarks.length} characters</span>
                <button
                  type="button"
                  onClick={() => setPassRemarks('')}
                  className="text-slate-400 hover:text-red-600 font-medium cursor-pointer transition-colors"
                >
                  Clear remarks
                </button>
              </div>
            )}
          </div>

          {/* Institutional note */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-emerald-950 space-y-1 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              Preliminary Screening Clearance
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Confirming PASS will notify the proponent that their concept proposal and endorsement have cleared preliminary administrative screening.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white rounded-lg shadow-2xl w-full ${
          actionType
            ? showSideFile
              ? 'max-w-7xl h-[92vh]'
              : 'max-w-3xl h-[92vh]'
            : 'max-w-4xl max-h-[92vh]'
        } flex flex-col border border-slate-200 overflow-hidden my-auto transition-all duration-300 animate-in fade-in zoom-in-95`}
      >

        {/* Header: Title on top, status badge, and close button */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${proposal.screeningStatus === 'passed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : proposal.screeningStatus === 'failed'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                >
                  {proposal.screeningStatus === 'pending'
                    ? 'Pending Screening'
                    : proposal.screeningStatus === 'passed'
                      ? 'Passed'
                      : 'Failed'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Preliminary Screening &bull; Document Verification
                </span>
              </div>

              {/* Proposal Title on the top */}
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {proposal.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 mt-0.5"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CSS for moving arrow animations */}
        <style>{`
          @keyframes sideArrowRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(3.5px); }
          }
          @keyframes sideArrowLeft {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-3.5px); }
          }
          .animate-side-arrow-right {
            animation: sideArrowRight 1.1s ease-in-out infinite;
          }
          .animate-side-arrow-left {
            animation: sideArrowLeft 1.1s ease-in-out infinite;
          }
        `}</style>

        {/* Modal Main Content Area */}
        {actionType ? (
          /* Side-by-Side or Full-Width Layout */
          <div className="flex-1 min-h-0 p-3 sm:p-4 bg-slate-100/50 overflow-hidden flex flex-col">
            {showSideFile ? (
              /* When side file is open: 2 columns with middle divider CLOSE FILE tab */
              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 h-full w-full">
                {/* Left Column: Review Documents Panel */}
                <div className="flex flex-col h-full min-h-0 space-y-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  {renderFileTabs(true)}
                  {renderDocumentViewer(true)}
                </div>

                {/* Mobile Close File Button */}
                <div className="lg:hidden flex justify-center py-1">
                  <button
                    type="button"
                    onClick={() => setShowSideFile(false)}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 shadow-xs text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 animate-side-arrow-left text-slate-600" />
                    <span>Close File</span>
                  </button>
                </div>

                {/* Middle Toggle CLOSE FILE Tab (Sitting right in the middle seam between left and right) */}
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setShowSideFile(false)}
                    className="py-3 px-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-md flex flex-col items-center gap-1.5 text-slate-700 transition-all cursor-pointer hover:border-slate-400 group hover:scale-105 active:scale-95"
                    title="Close File on Side"
                  >
                    <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-800" />
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-900 animate-side-arrow-left" />
                    <span className="text-[10px] font-bold [writing-mode:vertical-lr] uppercase tracking-wider text-slate-500 group-hover:text-slate-800">
                      Close File
                    </span>
                  </button>
                </div>

                {/* Right Column: Decision Comments Form (Pass or Fail) */}
                <div className="flex flex-col h-full min-h-0">
                  {actionType === 'pass' ? renderPassForm() : renderFailForm()}
                </div>
              </div>
            ) : (
              /* When side file is closed: Centered card with middle OPEN FILE tab on the left */
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center h-full max-w-4xl mx-auto w-full">
                {/* Mobile Open File Button */}
                <div className="lg:hidden flex justify-center pb-2 w-full">
                  <button
                    type="button"
                    onClick={() => setShowSideFile(true)}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 shadow-xs text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open File</span>
                    <ChevronRight className="w-3.5 h-3.5 animate-side-arrow-right text-slate-600" />
                  </button>
                </div>

                {/* Middle Toggle OPEN FILE Tab on the side */}
                <div className="hidden lg:flex items-center shrink-0 pr-3">
                  <button
                    type="button"
                    onClick={() => setShowSideFile(true)}
                    className="py-3 px-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-sm flex flex-col items-center gap-1.5 text-slate-700 transition-all cursor-pointer hover:border-slate-400 group hover:scale-105 active:scale-95"
                    title="Open Document Preview on Side"
                  >
                    <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-800" />
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-900 animate-side-arrow-right" />
                    <span className="text-[10px] font-bold [writing-mode:vertical-lr] uppercase tracking-wider text-slate-500 group-hover:text-slate-800">
                      Open File
                    </span>
                  </button>
                </div>

                {/* Comments Form taking the remaining width */}
                <div className="flex-1 flex flex-col h-full min-h-0 w-full">
                  {actionType === 'pass' ? renderPassForm() : renderFailForm()}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Standard Layout for Initial View (before selecting Pass or Fail) */
          <>
            {renderFileTabs(false)}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/50 space-y-4">
              {renderDocumentViewer(false)}
            </div>
          </>
        )}

        {/* Modal Footer with Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            {proposal.screeningStatus !== 'pending' && onReset && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset proposal screening status to Pending?')) {
                    onReset(proposal.id);
                    onClose();
                  }
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Reset to Pending
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {actionType ? (
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-3 py-2 rounded text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            )}

            {actionType === 'pass' ? (
              <button
                type="button"
                onClick={handleConfirmPass}
                className="px-5 py-2 rounded text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm PASS</span>
              </button>
            ) : actionType === 'fail' ? (
              <button
                type="button"
                onClick={handleConfirmFail}
                className="px-5 py-2 rounded text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm FAIL</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActionType('pass');
                    setShowSideFile(false);
                  }}
                  className="px-4 py-2 rounded text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionType('fail');
                    setShowSideFile(false);
                  }}
                  className="px-4 py-2 rounded text-xs font-bold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white border border-red-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Fail</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
