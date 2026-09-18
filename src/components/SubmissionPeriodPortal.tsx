import React from 'react';

interface SubmissionPeriodPortalProps {
  onSignInClick?: () => void;
}

export const SubmissionPeriodPortal: React.FC<SubmissionPeriodPortalProps> = ({ onSignInClick }) => {
  const priorityTopics = [
    {
      category: 'Science and Technology',
      icon: (
        <svg className="w-6 h-6 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      items: ['Biology', 'Chemistry', 'Physics', 'Mathematics'],
    },
    {
      category: 'Engineering',
      icon: (
        <svg className="w-6 h-6 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      items: ['Applied Engineering Systems', 'Innovative Technology', 'Infrastructure & Smart Solutions'],
    },
    {
      category: 'Social Science',
      icon: (
        <svg className="w-6 h-6 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        'Psycho-social Attribute and Coping Mechanisms',
        'Indigenous Knowledge',
        'Impact Evaluation Studies',
        'Crime Solution',
        'Studies about Vulnerable Groups',
        'Disaster Risk Management',
        'ICT in Education',
      ],
    },
    {
      category: 'Agriculture',
      icon: (
        <svg className="w-6 h-6 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      items: ['Food Security', 'Conservation and Protection', 'Sustainable Farming Initiatives'],
    },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-white via-white to-gray-50 relative overflow-hidden">
        {/* Ambient background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />

        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <div className="mb-3 animate-fade-in-down">
            <span className="inline-block px-3.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-[#C8102E] border border-red-200">
              WMSU RPDU · Faculty Research Grants
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 animate-fade-in-up">
            <span className="text-gray-800">Call for Research Proposals </span>
            <span className="bg-gradient-to-r from-gray-800 to-[#C8102E] bg-clip-text text-transparent">
              for 2027 Funding
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            As we continue to advance our commitment to excellence in research, we are pleased to announce the Official Call for Proposals for the 2027 Funding.
          </p>

          {/* Submission Period Card */}
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-6 border border-red-100 shadow-xl shadow-red-950/5 mb-8 space-y-4 animate-fade-in-up animation-delay-300 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Call for Proposals: Active
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Submission Started</p>
                <p className="text-lg font-bold text-gray-900 mt-1">September 15, 2026</p>
              </div>
              <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-100 text-center">
                <p className="text-xs text-[#C8102E]/80 font-semibold uppercase tracking-wider">Submission Deadline</p>
                <p className="text-lg font-extrabold text-[#C8102E] mt-1">November 15, 2026</p>
              </div>
            </div>
          </div>

          {/* Action Button: Get Started */}
          <div className="flex justify-center items-center animate-fade-in-up animation-delay-400">
            <button
              type="button"
              onClick={onSignInClick}
              className="group inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 transform hover:-translate-y-0.5 cursor-pointer bg-[#C8102E] hover:bg-[#A00D26]"
            >
              <span>Get Started</span>
              <svg
                className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Priority Topics Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-[#C8102E] border border-red-200 mb-3">
              Research Priorities
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Priority Research Topics
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Proposals addressing the following thematic focus areas are prioritized for funding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {priorityTopics.map((topic) => (
              <div
                key={topic.category}
                className="bg-gray-50 hover:bg-red-50/40 rounded-2xl p-6 border border-gray-200 hover:border-red-200 transition-all duration-300 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white border border-red-100 flex items-center justify-center mb-4 shadow-xs">
                    {topic.icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-3">{topic.category}</h3>
                  <ul className="space-y-2">
                    {topic.items.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
