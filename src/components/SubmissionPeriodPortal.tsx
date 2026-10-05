import React, { useState } from 'react';
import {
  Calendar,
  ArrowRight,
  Download,
  FlaskConical,
  Cpu,
  Users,
  Sprout,
  FileText,
  Mail,
  ExternalLink,
} from 'lucide-react';

interface SubmissionPeriodPortalProps {
  onSignInClick?: () => void;
}

interface PriorityArea {
  id: string;
  category: string;
  shortDesc: string;
  icon: React.ReactNode;
  topics: string[];
}

export const SubmissionPeriodPortal: React.FC<SubmissionPeriodPortalProps> = ({ onSignInClick }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const priorityAreas: PriorityArea[] = [
    {
      id: 'science-tech',
      category: 'Science & Technology',
      shortDesc: 'Pure and applied natural sciences promoting foundational discoveries and quantitative methodologies.',
      icon: <FlaskConical className="w-5 h-5 text-[#C8102E]" />,
      topics: ['Biology', 'Chemistry', 'Physics', 'Mathematics'],
    },
    {
      id: 'engineering',
      category: 'Engineering & Innovation',
      shortDesc: 'Technological solutions, resilient infrastructure, and practical engineered systems.',
      icon: <Cpu className="w-5 h-5 text-[#C8102E]" />,
      topics: ['Applied Engineering Systems', 'Innovative Technology', 'Infrastructure & Smart Solutions'],
    },
    {
      id: 'social-science',
      category: 'Social Sciences & Humanities',
      shortDesc: 'Community development, local heritage, psychosocial wellness, and inclusive public governance.',
      icon: <Users className="w-5 h-5 text-[#C8102E]" />,
      topics: [
        'Psycho-social Attributes & Coping',
        'Indigenous Knowledge Systems',
        'Impact Evaluation Studies',
        'Crime Solution & Safety',
        'Studies on Vulnerable Groups',
        'Disaster Risk Management',
        'ICT in Education',
      ],
    },
    {
      id: 'agriculture',
      category: 'Agriculture & Food Systems',
      shortDesc: 'Sustainable farming initiatives, food security, and ecological conservation in Western Mindanao.',
      icon: <Sprout className="w-5 h-5 text-[#C8102E]" />,
      topics: ['Food Security', 'Conservation & Protection', 'Sustainable Farming Initiatives'],
    },
  ];

  const filteredAreas =
    selectedCategory === 'all'
      ? priorityAreas
      : priorityAreas.filter((area) => area.id === selectedCategory);

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

  return (
    <div className="w-full bg-white text-slate-800">
      {/* HERO SECTION */}
      <section
        id="call-for-proposals"
        className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white border-b border-slate-100"
      >
        {/* Subtle background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-100/30 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Clean Modern Headline with Call.svg resting near 'e' and 'a' of Research */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight mb-5">
            Advancing Research &amp; Innovation
            <span className="flex items-center justify-center gap-2 sm:gap-3 text-[#C8102E] font-extrabold mt-1">
              <img
                src="/Call.svg"
                alt=""
                aria-hidden="true"
                className="w-8 sm:w-10 md:w-12 h-auto select-none pointer-events-none shrink-0"
              />
              <span>Call for Proposals 2027</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed mb-10">
            Western Mindanao State University invites faculty, researchers, and project proponents to submit research proposals for institutional funding support and peer review.
          </p>

          {/* Submission Window Card (Minimalist & Crisp) */}
          <div className="max-w-2xl mx-auto bg-white rounded-sm border border-slate-200/90 shadow-sm p-5 sm:p-6 mb-8 text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-[#C8102E]" />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Submission Schedule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-50/70 rounded-sm p-3.5 border border-slate-100">
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Submission Opens
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900">
                  September 15, 2026
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">8:00 AM PST</span>
              </div>

              <div className="bg-red-50/40 rounded-sm p-3.5 border border-red-100/80">
                <span className="text-xs font-medium text-[#C8102E] block mb-1">
                  Submission Deadline
                </span>
                <span className="text-base sm:text-lg font-bold text-[#C8102E]">
                  November 15, 2026
                </span>
                <span className="text-[11px] text-[#C8102E]/70 block mt-0.5">5:00 PM PST · Strict Deadline</span>
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block mb-2">
                Priority Focus Topics
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 rounded-sm">Science & Technology - Biology</span>
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 rounded-sm">Social Science - ICT in Education</span>
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 rounded-sm">Agriculture - Food Security</span>
              </div>
            </div>
          </div>

          {/* Official Call Memo - Centered Display */}
          <div className="flex flex-col items-center justify-center mb-10">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Official Call Memo
            </span>
            <a
              href="#"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] rounded-md hover:bg-[#dbeafe] transition-colors text-[15px] font-medium shadow-sm"
            >
              <FileText className="w-5 h-5" />
              <span>WMSU-RDEC-Memo-2026.pdf</span>
            </a>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onSignInClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm font-semibold text-sm text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:ring-offset-2 cursor-pointer"
            >
              <span>Submit Proposal</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
            </button>

            <a
              href="/DOST_Form_No.1b.docx"
              download
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-sm font-medium text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all duration-200"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download DOST Form 1B</span>
            </a>

            <a
              href="#how-to-submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-sm font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
            >
              <span>How It Works</span>
            </a>
          </div>

        </div>
      </section>

      {/* PRIORITY RESEARCH AREAS SECTION */}
      <section id="priority-areas" className="py-16 sm:py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Priority Research Areas
            </h2>
            <div className="w-12 h-1 bg-[#C8102E] rounded-sm mx-auto mt-1.5 mb-3" />
            <p className="text-sm sm:text-base font-semibold text-slate-700 mt-2 leading-relaxed">
              Proposals directly aligned with these key thematic domains are given priority evaluation for 2027 grant allocation.
            </p>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                All Domains ({priorityAreas.length})
              </button>
              {priorityAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedCategory(area.id)}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all ${
                    selectedCategory === area.id
                      ? 'bg-[#C8102E] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {area.category.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className="bg-white rounded-sm p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-sm bg-red-50/70 border border-red-100 flex items-center justify-center">
                      {area.icon}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-100">
                      {area.topics.length} topics
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {area.category}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {area.shortDesc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Focus Disciplines
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {area.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-sm bg-slate-50 text-slate-700 border border-slate-100 hover:bg-red-50 hover:text-[#C8102E] hover:border-red-100 transition-colors"
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
      <section id="how-to-submit" className="py-16 sm:py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Simple 3-Step Submission Process
            </h2>
            <div className="w-12 h-1 bg-[#C8102E] rounded-sm mx-auto mt-1.5 mb-3" />
            <p className="text-sm sm:text-base font-semibold text-slate-700 mt-2">
              Everything you need to successfully submit your research project proposal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {submissionSteps.map((stepItem, idx) => (
              <div
                key={idx}
                className="bg-white rounded-sm p-6 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-300 group-hover:text-[#C8102E] transition-colors">
                      {stepItem.step}
                    </span>
                    <span className="w-8 h-8 rounded-sm bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {stepItem.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {stepItem.description}
                  </p>
                </div>

                <div>
                  {stepItem.isDownload ? (
                    <a
                      href={stepItem.actionUrl}
                      download
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8102E] hover:text-[#A00D26] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{stepItem.actionLabel}</span>
                    </a>
                  ) : stepItem.onClick ? (
                    <button
                      type="button"
                      onClick={stepItem.onClick}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8102E] hover:text-[#A00D26] cursor-pointer"
                    >
                      <span>{stepItem.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <a
                      href={stepItem.actionUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span>{stepItem.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATES & DOWNLOADS SECTION */}
      <section id="templates" className="py-16 bg-slate-50/60 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-sm p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                <FileText className="w-5 h-5 text-[#C8102E]" />
                <span>Official DOST Form No. 1B (Detailed Proposal)</span>
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 max-w-xl leading-relaxed">
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
          <div className="rounded-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                RPDU Help &amp; Consultation
              </span>
              <h4 className="text-lg sm:text-xl font-bold">
                Need guidance on your research proposal?
              </h4>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 max-w-lg">
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
