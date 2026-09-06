import React from 'react';
import type { GuidelineItem } from '../data/landingContent';

interface GuidelinesSectionProps {
  badge: string;
  title: string;
  description: string;
  proTip: string;
  items: GuidelineItem[];
}

export const GuidelinesSection: React.FC<GuidelinesSectionProps> = ({
  badge,
  title,
  description,
  proTip,
  items,
}) => {
  const guidelineIcons = [
    // 1. Complete Documentation
    (
      <svg className="w-8 h-8 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    // 2. 7-Day Revision Window
    (
      <svg className="w-8 h-8 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    // 3. Stay Updated
    (
      <svg className="w-8 h-8 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    // 4. Official Channels Only
    (
      <svg className="w-8 h-8 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  ];

  return (
    <section id="guidelines" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Sticky Left Sidebar Header */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 self-start">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 mb-6">
              {badge}
            </span>

            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent leading-relaxed">
              {title}
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              {description}
            </p>

            {/* Desktop Pro Tip Box */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hidden lg:block">
              <div className="flex items-center gap-3 mb-3">
                <svg className="text-[#C8102E] w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-bold text-gray-900">Pro Tip</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{proTip}</p>
            </div>
          </div>

          {/* Right Column: Requirement Items */}
          <div className="lg:col-span-8 space-y-12">
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col sm:flex-row gap-6 group">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-[#C8102E] group-hover:scale-110 transition-transform duration-300">
                      {guidelineIcons[idx] || guidelineIcons[0]}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#C8102E] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">{item.description}</p>
                  </div>
                </div>
                {idx < items.length - 1 && <hr className="border-gray-100" />}
              </React.Fragment>
            ))}

            {/* Mobile Pro Tip Box */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 lg:hidden mt-8">
              <div className="flex items-center gap-3 mb-3">
                <svg className="text-[#C8102E] w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-bold text-gray-900">Pro Tip</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Gather your CVs, consent forms, and research instruments{' '}
                <span className="font-semibold text-[#C8102E]">before</span> you start.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
