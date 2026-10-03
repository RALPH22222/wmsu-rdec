import React from 'react';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="contacts" className="bg-slate-50 text-slate-700 pt-16 pb-12 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-200/60">
          {/* Institutional Branding (6 cols) */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                  <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="relative z-0 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                  <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Western Mindanao State University</p>
                <h5 className="text-base font-bold text-slate-900">
                  Research Development &amp; Evaluation Center
                </h5>
              </div>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm max-w-md leading-relaxed">
              The Research Project Development Unit (RPDU) oversees institutional research evaluation, proposal management, compliance, and grant monitoring to cultivate impactful university research.
            </p>
          </div>

          {/* Quick Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h6 className="font-semibold text-xs uppercase tracking-wider text-slate-900">Navigation &amp; Resources</h6>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a href="#call-for-proposals" className="hover:text-[#C8102E] transition-colors">
                  Call for Proposals 2027
                </a>
              </li>
              <li>
                <a href="#priority-areas" className="hover:text-[#C8102E] transition-colors">
                  Priority Research Thematic Areas
                </a>
              </li>
              <li>
                <a href="#how-to-submit" className="hover:text-[#C8102E] transition-colors">
                  Submission Workflow
                </a>
              </li>
              <li>
                <a href="/DOST_Form_No.1b.docx" download className="hover:text-[#C8102E] transition-colors inline-flex items-center gap-1">
                  <span>DOST Form 1B (Word)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a href="/DOST_Form_No.1b.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8102E] transition-colors inline-flex items-center gap-1">
                  <span>DOST Form 1B (PDF)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Helpdesk & Inquiries (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h6 className="font-semibold text-xs uppercase tracking-wider text-slate-900">RPDU Helpdesk</h6>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C8102E] shrink-0" />
                <a href="mailto:rpdu@wmsu.edu.ph" className="hover:underline text-slate-800 font-medium">
                  rpdu@wmsu.edu.ph
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C8102E] shrink-0" />
                <span>+63 (62) 991-4567</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C8102E] shrink-0 mt-0.5" />
                <span>RDEC Building, WMSU Main Campus, Normal Road, Baliwasan, Zamboanga City</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} Western Mindanao State University · All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RDEC Proposal Management System</span>
            <span>·</span>
            <span>Philippine Standard Time (PST)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
