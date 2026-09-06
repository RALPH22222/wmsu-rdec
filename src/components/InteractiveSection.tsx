import React, { useState, useEffect } from 'react';
import type { ProcessStep } from '../data/landingContent';
import { CardStack, Card } from './CardStack';

interface InteractiveSectionProps {
  processSteps: ProcessStep[];
  onOpenTemplateModal: () => void;
  templateDocxUrl?: string;
}

export const InteractiveSection: React.FC<InteractiveSectionProps> = ({
  processSteps,
  onOpenTemplateModal,
  templateDocxUrl = '/DOST_Form_No.1b.docx',
}) => {
  const [mobileStep, setMobileStep] = useState(0);

  useEffect(() => {
    if (!processSteps.length) return;
    const timer = setInterval(() => {
      setMobileStep((prev) => (prev + 1) % processSteps.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [processSteps.length]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = templateDocxUrl;
    link.download = 'DOST-Project-Proposal-Template.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="interactive" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: DOST Form 1B Template Card */}
          <div className="order-2 lg:order-1">
            <div className="mb-3">
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                Proposal Template
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
              Research Proposal Template
            </h2>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Use our standardized DOST Form 1B template to ensure your research proposal meets all requirements. This template follows the official CAPSULE Research &amp; Development Proposal format for proper documentation and faster approval.
            </p>

            <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:shadow-[0_20px_50px_rgba(128,0,0,0.15)] transition-all duration-300 border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">DOST Form 1B Template</h3>
                  <p className="text-gray-600 text-sm">CAPSULE Research &amp; Development Proposal</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm text-gray-600">Standardized format for faster review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm text-gray-600">Includes all required sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm text-gray-600">Compliant with DOST guidelines</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg text-white text-center flex-1 bg-[#C8102E] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 cursor-pointer"
                  style={{ backgroundColor: '#C8102E' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#A00D26')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8102E')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Template
                </button>

                <button
                  type="button"
                  onClick={onOpenTemplateModal}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 border-2 hover:bg-red-50 text-center flex-1 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 cursor-pointer"
                  style={{ borderColor: '#C8102E', color: '#C8102E' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Template
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: How It Works with 3D Stacked Card Deck */}
          <div className="order-1 lg:order-2">
            <div className="mb-3">
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                Submission Process
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
              How It Works
            </h3>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Follow these simple steps to submit and manage your research proposal through our platform.
            </p>

            {/* Mobile View: Auto-cycling single card */}
            <div className="block sm:hidden relative h-[340px] flex items-center justify-center">
              {processSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`absolute left-0 right-0 mx-auto w-[98%] bg-white rounded-2xl shadow-2xl border border-red-200 transition-all duration-500 ease-in-out ${
                    idx === mobileStep
                      ? 'z-20 opacity-100 scale-100 translate-y-0'
                      : 'z-10 opacity-0 scale-95 translate-y-6 pointer-events-none'
                  }`}
                  style={{ top: 32 }}
                >
                  <div className="flex gap-4 items-start p-6">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-red-600 font-bold text-lg">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-red-600">{step.title}</h3>
                      <p className="text-gray-700 text-base line-clamp-4">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: The 3D Animated Card Stack */}
            <div className="hidden sm:flex mt-14 items-center justify-center">
              <div className="relative h-[320px] w-full max-w-md overflow-visible">
                <CardStack
                  cardDistance={35}
                  verticalDistance={30}
                  delay={5000}
                  pauseOnHover={true}
                  skewAmount={5}
                >
                  {processSteps.map((step, idx) => (
                    <Card
                      key={idx}
                      customClass="p-6 bg-white text-gray-900 shadow-2xl rounded-xl flex gap-4 items-start border w-full"
                      style={{ height: 260, borderColor: 'rgba(200,16,46,0.12)' }}
                    >
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-red-600 font-bold text-lg">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-3" style={{ color: '#C8102E' }}>
                          {step.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed line-clamp-4">
                          {step.description}
                        </p>
                      </div>
                    </Card>
                  ))}
                </CardStack>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
