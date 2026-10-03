import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  onSignInClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      setIsScrolled(window.scrollY > 10);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <header
      role="banner"
      className={`fixed top-0 w-full z-50 transition-all duration-300 bg-[#C8102E] text-white ${
        isScrolled ? 'shadow-md border-b border-red-800/40' : 'shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-xl p-1"
            aria-label="Home - WMSU Project Proposal"
          >
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 h-9 w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white ring-2 ring-[#C8102E] border border-white/20 p-0.5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs">
                <img
                  src="/WMSU.png"
                  alt="WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
              <div className="relative z-0 h-9 w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white ring-2 ring-[#C8102E] border border-white/20 p-0.5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs">
                <img
                  src="/RDEC-WMSU.png"
                  alt="RDEC-WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-[10px] lg:text-[11px] font-normal tracking-wider text-white/80 uppercase">
                Western Mindanao State University
              </span>
              <span className="text-sm lg:text-base font-semibold tracking-tight text-white">
                RDEC Proposal Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-white/90">
            <Link
              to="/admin"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors text-xs border border-white/20 flex items-center gap-1.5"
            >
              <span>Admin Page</span>
            </Link>
            <Link
              to="/rpdu"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors text-xs border border-white/20 flex items-center gap-1.5"
            >
              <span>RPDU Page</span>
            </Link>
            <a
              href="#call-for-proposals"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              Call 2027
            </a>
            <a
              href="#priority-areas"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              Priority Areas
            </a>
            <a
              href="#how-to-submit"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              How to Submit
            </a>
            <a
              href="#templates"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              Templates
            </a>
            <a
              href="#contacts"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              Helpdesk
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignInClick}
              className="group inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#C8102E] bg-white hover:bg-slate-100 shadow-xs hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-[#C8102E] transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
            </button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-red-800/50 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-red-800/40 bg-[#C8102E] rounded-b-2xl shadow-lg px-2 space-y-2 text-white">
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 text-white"
            >
              ⚙️ Admin Page
            </Link>
            <Link
              to="/rpdu"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 text-white"
            >
              📑 RPDU Page
            </Link>
            <a
              href="#call-for-proposals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-800/40"
            >
              Call for Proposals 2027
            </a>
            <a
              href="#priority-areas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-800/40"
            >
              Priority Research Areas
            </a>
            <a
              href="#how-to-submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-800/40"
            >
              How to Submit
            </a>
            <a
              href="#templates"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-800/40"
            >
              Download Templates
            </a>
            <a
              href="#contacts"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-800/40"
            >
              Helpdesk &amp; Inquiries
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
