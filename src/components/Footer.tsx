import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer id="contacts" className="bg-gradient-to-b from-white to-gray-50 text-gray-800 py-12 border-t border-gray-100 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Platform Info (2 cols) */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-xs">
                  <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-xs">
                  <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <h5 className="text-xl font-bold mt-2">
                <span className="text-gray-800">WMSU</span>{' '}
                <span className="font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
                  Project Portal
                </span>
              </h5>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              A comprehensive platform for monitoring and managing research projects and proposals at Western Mindanao State University.
            </p>
          </div>

          {/* Quick Links (1 col) */}
          <div>
            <h6 className="font-semibold mb-4 text-lg text-[#C8102E]">Quick Links</h6>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-gray-600 hover:text-red-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About Office
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-red-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Proposal Process
                </Link>
              </li>
              <li>
                <Link
                  to="/faqs"
                  className="text-gray-600 hover:text-red-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  to="/contacts"
                  className="text-gray-600 hover:text-red-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details (1 col) */}
          <div>
            <h6 className="font-semibold mb-4 text-lg text-[#C8102E]">Contact Us</h6>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="break-words">research@wmsu.edu.ph</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+63 (62) 991-4567</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600">
                <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Normal Road, Baliwasan, Zamboanga City</span>
              </div>
            </div>

            <Link
              to="/contacts"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all duration-300 hover:shadow-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
              style={{ backgroundColor: '#C8102E' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#A00D26')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8102E')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Office
            </Link>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Western Mindanao State University. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link to="/" className="hover:text-red-700 transition-colors duration-200">Privacy Policy</Link>
              <Link to="/" className="hover:text-red-700 transition-colors duration-200">Terms of Service</Link>
              <Link to="/" className="hover:text-red-700 transition-colors duration-200">Accessibility</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
