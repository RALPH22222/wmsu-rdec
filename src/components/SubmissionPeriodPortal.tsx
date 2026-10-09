import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ArrowRight,
  Download,
  FileText,
  Mail,
  ExternalLink,
  LockKeyhole,
} from 'lucide-react';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { parseMemoDetails, openMemoInNewTab } from '../utils/memoUtils';

interface SubmissionPeriodPortalProps {
  onSignInClick?: () => void;
}

interface PriorityArea {
  id: string;
  category: string;

  icon: React.ReactNode;
  topics: string[];
}

export const SubmissionPeriodPortal: React.FC<SubmissionPeriodPortalProps> = ({ onSignInClick }) => {
  const { activeCall, calls, loadingCalls } = useCallForProposals();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAllTopics, setShowAllTopics] = useState<boolean>(false);

  // Calls are ordered newest first. Drafts are never displayed publicly.
  const targetCall = activeCall || calls.find((c) => c.scheduledOpen) || calls.find((c) => String(c.status).toUpperCase() === 'CLOSED') || null;
  const isOpen = !loadingCalls && !!targetCall && ['OPEN', 'ACTIVE'].includes(String(targetCall.status).toUpperCase());
  const isClosed = !!targetCall && String(targetCall.status).toUpperCase() === 'CLOSED';

  // Display the published call data.
  const callTitle = targetCall?.title?.trim() || 'Call for Proposals';

  const callYear = targetCall?.fiscalYear || (targetCall?.startDate ? new Date(targetCall.startDate).getFullYear() : undefined);

  // Subtitle / Description
  const callDescription =
    targetCall?.description?.trim() ||
    '';

  // Format date helper for human-readable dates (e.g. "October 7, 2026")
  const formatDisplayDate = (dateStr?: string, defaultStr: string = '') => {
    if (!dateStr) return defaultStr;
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    return dateStr;
  };

  const formattedStartDate = formatDisplayDate(targetCall?.startDate, '');
  const formattedEndDate = formatDisplayDate(targetCall?.endDate, '');

  // Official Memo Details
  const memoDetails = useMemo(() => {
    if (!targetCall) return null;
    return parseMemoDetails(targetCall.memo || targetCall.memoAttachment || targetCall.memoFileUrl);
  }, [targetCall]);

  const memoFileName = memoDetails?.name || 'Official memorandum';
  const memoExtension = useMemo(() => {
    const ext = memoFileName.split('.').pop()?.toUpperCase();
    return ext && ext.length <= 4 ? ext : '';
  }, [memoFileName]);

  const handleOpenMemo = (e: React.MouseEvent) => {
    if (memoDetails) {
      e.preventDefault();
      openMemoInNewTab(memoDetails);
    }
  };

  // Priority Focus Topics: replace placeholder pills with dynamic call focus topics
  const focusTopicPills: string[] = useMemo(() => {
    if (targetCall?.priorityTopics && targetCall.priorityTopics.length > 0) {
      const pills: string[] = [];
      targetCall.priorityTopics.forEach((pt) => {
        if (Array.isArray(pt.subtopics) && pt.subtopics.length > 0) {
          pt.subtopics.forEach((sub) => {
            pills.push(`${pt.topic} - ${sub}`);
          });
        } else if (pt.topic) {
          pills.push(pt.topic);
        }
      });
      if (pills.length > 0) return pills;
    }

    if (targetCall?.priorityAreas && targetCall.priorityAreas.length > 0) {
      return targetCall.priorityAreas;
    }

    return [];
  }, [targetCall]);

  const dynamicPriorityAreas: PriorityArea[] = useMemo(() => {
    if (targetCall?.priorityTopics?.length) {
      return targetCall.priorityTopics.map((item, index) => ({
        id: String(index),
        category: item.topic,
        icon: <FileText className="w-5 h-5 text-[#C8102E]" />,
        topics: item.subtopics || [],
      }));
    }
    return (targetCall?.priorityAreas || []).map((area, index) => ({
      id: String(index),
      category: area,
      icon: <FileText className="w-5 h-5 text-[#C8102E]" />,
      topics: [],
    }));
  }, [targetCall]);

  const filteredAreas =
    selectedCategory === 'all'
      ? dynamicPriorityAreas
      : dynamicPriorityAreas.filter((area) => area.id === selectedCategory);

  const submissionSteps = [
    {
      step: '01',
      title: 'Download Official Template',
      description: 'Acquire DOST Form 1B and review the prescribed proposal format, line-item budget requirements, and work plan template.',
      actionLabel: 'Download Form 1B',
      actionUrl: '/DOST_Form_No.1b.docx',
      isDownload: true,
    },
    {
      step: '02',
      title: 'Prepare & Endorse',
      description: 'Consolidate proposal details, curriculum vitae, and secure college dean or department chair endorsements.',
      actionLabel: 'View Criteria',
      actionUrl: '#priority-areas',
      isDownload: false,
    },
    {
      step: '03',
      title: 'Submit Online & Track',
      description: 'Sign into the WMSU RDEC portal to submit your files before the deadline. Track evaluation phases in real time.',
      actionLabel: 'Submit Proposal',
      onClick: onSignInClick,
      isDownload: false,
    },
  ];

  if (loadingCalls) {
    return (
      <div role="status" aria-label="Loading call for proposals" className="w-full bg-white">
        <span className="sr-only">Loading call for proposals</span>
        <div aria-hidden="true" className="bg-slate-50/60 py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 motion-safe:animate-pulse">
            <div className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-16">
              <div className="min-w-0 space-y-6 lg:py-4">
                <div className="h-5 w-48 rounded bg-slate-200" />
                <div className="space-y-3">
                  <div className="h-10 w-full rounded bg-slate-200" />
                  <div className="h-10 w-3/4 rounded bg-slate-200" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200" />
                  <div className="h-4 w-5/6 rounded bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="h-12 w-40 rounded-lg bg-slate-200" />
                  <div className="h-12 w-56 rounded-lg bg-slate-200" />
                </div>
              </div>
              <div className="min-w-0 rounded-sm border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex justify-between gap-4">
                  <div className="h-5 w-40 rounded bg-slate-100" />
                  <div className="h-6 w-16 rounded-full bg-slate-100" />
                </div>
                <div className="mt-6 space-y-5 border-t border-slate-100 pt-6">
                  <div className="h-16 rounded-lg bg-slate-100" />
                  <div className="h-24 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <div className="h-9 w-40 rounded-lg bg-slate-200" />
              <div className="h-9 w-48 rounded-lg bg-slate-200" />
              <div className="h-9 w-32 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 motion-safe:animate-pulse">
          <div className="mx-auto mb-10 h-8 w-60 rounded bg-slate-100" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-56 rounded-sm border border-slate-200 bg-slate-50" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white text-slate-800">
      {/* Call overview */}
      <section
        id="call-for-proposals"
        aria-labelledby="call-heading"
        className="scroll-mt-24 border-b border-slate-200 bg-slate-50/60 py-12 sm:py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-6">
            <div className="min-w-0 lg:py-4">
              <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#C8102E]">
                <img src="/Call.svg" alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
                Call for Proposals {callYear && <span className="border-l border-red-200 pl-2">{callYear}</span>}
              </p>
              <h1 id="call-heading" className="max-w-2xl break-words text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {callTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                {callDescription}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onSignInClick}
                  disabled={!isOpen}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-5 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
                >
                  {loadingCalls ? 'Loading call…' : isOpen ? 'Submit Proposal' : 'Submissions closed'}
                  {isClosed ? <LockKeyhole className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </button>
                <a
                  href="/DOST_Form_No.1b.docx"
                  download
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E]"
                >
                  <Download className="h-4 w-4" /> Download Proposal Template
                </a>
              </div>
              <a href="#how-to-submit" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-[#C8102E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E]">
                {isClosed ? 'Submission guidelines' : 'How to submit'} <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <aside aria-label="Submission details" className={`lg:col-start-2 lg:row-start-1 lg:row-span-2 min-w-0 rounded-sm border bg-white p-5 shadow-sm sm:p-7 ${isClosed ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Calendar className="h-5 w-5 text-[#C8102E]" /> {isClosed ? 'Submission window' : 'Submission schedule'}
                </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : isClosed ? 'border-red-200 bg-red-50 text-[#A00D26]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-600' : isClosed ? 'bg-[#C8102E]' : 'bg-slate-500'}`} />
                    {loadingCalls ? 'LOADING' : isOpen ? 'OPEN' : isClosed ? 'CLOSED' : 'NO OPEN CALL'}
                  </span>
              </div>

              {!loadingCalls && isClosed && targetCall && (
                <div role="status" className="mt-6">
                  <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#A00D26]">
                      <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-[#A00D26]">{targetCall?.scheduledOpen ? 'Scheduled to reopen' : 'Officially closed'}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{targetCall?.scheduledOpen ? `Submissions remain closed until ${formattedStartDate}.` : 'This call is no longer accepting proposals.'}</p>
                    </div>
                  </div>
                  {(targetCall.publicNotice || targetCall.closureReason) && <div className="mt-5 border-l-2 border-red-200 pl-4">
                    <h3 className="text-sm font-semibold text-slate-900">Public notice</h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {targetCall.publicNotice || targetCall.closureReason}
                    </p>
                  </div>}
                </div>
              )}

              <dl className={`mt-6 border-t border-slate-200 pt-6 ${isClosed ? 'grid gap-4 sm:grid-cols-2' : 'space-y-5'}`}>
                <div>
                  <dt className="text-sm text-slate-600">{targetCall?.scheduledOpen ? 'Next opening' : isClosed ? 'Opened on' : 'Submissions open'}</dt>
                  <dd className={`mt-1 font-semibold tracking-tight ${isClosed ? 'text-sm leading-6 text-slate-700' : 'text-xl text-slate-900'}`}>
                    <time dateTime={targetCall?.startDate}>{formattedStartDate}</time>
                  </dd>
                </div>
                <div className={isClosed ? '' : 'rounded-xl border border-red-100 bg-red-50/50 p-4'}>
                  <dt className={`text-sm ${isClosed ? 'text-slate-600' : 'font-medium text-[#A00D26]'}`}>{isClosed ? 'Scheduled deadline' : 'Submission deadline'}</dt>
                  <dd className={`mt-1 font-semibold tracking-tight ${isClosed ? 'text-sm leading-6 text-slate-700' : 'text-xl text-[#A00D26]'}`}>
                    <time dateTime={targetCall?.endDate}>{formattedEndDate}</time>
                  </dd>
                </div>
              </dl>

              {memoDetails && <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Official memorandum</h3>
                <a
                  href={memoDetails?.dataUrl || '#'}
                  onClick={handleOpenMemo}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-6 text-slate-800 group-hover:text-[#C8102E]">{memoFileName}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{memoExtension} &middot; View guidelines and terms</p>
                  </div>
                  <ExternalLink aria-hidden="true" className="mt-2 h-4 w-4 shrink-0 text-slate-500" />
                </a>
              </div>}
            </aside>

            {focusTopicPills.length > 0 && (
              <div className="min-w-0 border-t border-slate-200 pt-5 lg:col-start-1 lg:row-start-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Priority focus topics</h2>
                  {focusTopicPills.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTopics((prev) => !prev)}
                      aria-expanded={showAllTopics}
                      aria-controls="call-focus-topics"
                      className="min-h-10 text-sm font-semibold text-[#C8102E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E] cursor-pointer"
                    >
                      {showAllTopics ? 'Show less' : `+${focusTopicPills.length - 6} more`}
                    </button>
                  )}
                </div>
                <div id="call-focus-topics" className="flex flex-wrap gap-2">
                  {(showAllTopics ? focusTopicPills : focusTopicPills.slice(0, 6)).map((pill, idx) => (
                    <span key={idx} className="max-w-full break-words rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm leading-relaxed text-slate-600">
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRIORITY RESEARCH AREAS SECTION */}
      <section id="priority-areas" className="scroll-mt-24 py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Priority Research Areas
            </h2>
            <div className="w-12 h-1 bg-[#C8102E] rounded-sm mx-auto mt-1.5 mb-3" />
            <p className="text-base font-normal text-slate-600 mt-2 leading-relaxed">
              Proposals directly aligned with these key thematic domains are given priority evaluation for {callYear} grant allocation.
            </p>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`min-h-11 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                All Domains ({dynamicPriorityAreas.length})
              </button>
              {dynamicPriorityAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedCategory(area.id)}
                  className={`min-h-11 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedCategory === area.id
                      ? 'bg-[#C8102E] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {area.category}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className="bg-white rounded-sm p-5 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-sm bg-red-50/70 border border-red-100 flex items-center justify-center">
                      {area.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-100">
                      {area.topics.length} topics
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {area.category}
                  </h3>

                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Focus Disciplines
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {area.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-sm font-medium px-2.5 py-1 rounded-sm bg-slate-50 text-slate-700 border border-slate-100 hover:bg-red-50 hover:text-[#C8102E] hover:border-red-100 transition-colors"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO SUBMIT SECTION (Minimalist 3-Step) */}
      <section id="how-to-submit" className="scroll-mt-24 py-16 sm:py-20 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Simple 3-Step Submission Process
            </h2>
            <div className="w-12 h-1 bg-[#C8102E] rounded-sm mx-auto mt-1.5 mb-3" />
            <p className="text-base font-normal text-slate-600 mt-2">
              Everything you need to successfully submit your research project proposal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {submissionSteps.map((stepItem, idx) => {
              return (
                <div
                  key={idx}
                  className="bg-white rounded-sm p-6 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-semibold text-[#C8102E]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {stepItem.title}
                    </h3>

                    <p className="text-sm text-slate-600 leading-7 mb-6">
                      {stepItem.description}
                    </p>
                  </div>

                  <div>
                    {stepItem.isDownload ? (
                      <a
                        href={stepItem.actionUrl}
                        download
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#C8102E] hover:text-[#A00D26] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{stepItem.actionLabel}</span>
                      </a>
                    ) : stepItem.onClick ? (
                      <button
                        type="button"
                        onClick={stepItem.onClick}
                        disabled={!isOpen}
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#C8102E] enabled:hover:text-[#A00D26] cursor-pointer disabled:cursor-not-allowed disabled:text-slate-500"
                      >
                        <span>{isOpen ? stepItem.actionLabel : 'Submissions closed'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href={stepItem.actionUrl}
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <span>{stepItem.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEMPLATES & DOWNLOADS SECTION */}
      <section id="templates" className="scroll-mt-24 py-16 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-sm p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                <FileText className="w-5 h-5 text-[#C8102E]" />
                <span>Official DOST Form No. 1B (Detailed Proposal)</span>
              </h3>
              <p className="text-sm sm:text-base font-normal text-slate-600 max-w-xl leading-relaxed">
                Download the prescribed proposal template. Ensure all required sections including the line-item budget, work plan, and proponent details are complete prior to submission.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <a
                href="/DOST_Form_No.1b.docx"
                download
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm font-semibold text-xs sm:text-sm text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-xs hover:shadow transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Word (.docx)</span>
              </a>
              <a
                href="/DOST_Form_No.1b.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-medium text-xs sm:text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <span>View PDF Guide</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ASSISTANCE BANNER */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-sm bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                RPDU Help &amp; Consultation
              </span>
              <h4 className="text-lg sm:text-xl font-bold">
                Need guidance on your research proposal?
              </h4>
              <p className="text-sm sm:text-base font-normal leading-7 text-slate-200 max-w-lg">
                The Research Project Development Unit is available for format inquiries, proposal consultation, and technical assistance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <a
                href="mailto:rpdu@wmsu.edu.ph"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4 text-red-400" />
                <span>rpdu@wmsu.edu.ph</span>
              </a>
              <button
                type="button"
                onClick={onSignInClick}
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#C8102E] hover:bg-[#A00D26] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
