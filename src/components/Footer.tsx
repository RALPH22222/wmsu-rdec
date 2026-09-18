import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="contacts" className="bg-white text-slate-800 py-12 border-t border-slate-200 pb-16 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo & Institutional Info (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <h5 className="text-lg font-bold text-slate-900">
                Western Mindanao State University · <span className="text-[#C8102E]">RPDU</span>
              </h5>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm max-w-lg leading-relaxed">
              Research Project Development Unit (RPDU), under the Research Development &amp; Evaluation Center (RDEC). Dedicated to the administration, monitoring, and quality evaluation of institutional research proposals.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h6 className="font-bold text-xs uppercase tracking-wider text-[#C8102E]">Helpdesk &amp; Inquiries</h6>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#C8102E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:rpdu@wmsu.edu.ph" className="hover:underline text-slate-800 font-medium">
                  rpdu@wmsu.edu.ph
                </a>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#C8102E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+63 (62) 991-4567</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#C8102E] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>RDEC Building, Normal Road, Baliwasan, Zamboanga City</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} Western Mindanao State University. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-slate-400">Institutional Research Portal</span>
            <span>·</span>
            <span className="text-slate-400">PST Timezone</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
