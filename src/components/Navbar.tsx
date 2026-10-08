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
      className={`fixed top-0 w-full z-50 transition-all duration-300 bg-[#C8102E] text-white ${isScrolled ? 'shadow-md border-b border-red-800/40' : 'shadow-sm'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 sm:gap-3.5 group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-sm p-1"
            aria-label="Home - WMSU Project Proposal"
          >
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white ring-2 ring-[#C8102E] border border-white/20 p-0.5 flex items-center justify-center shadow-xs">
                <img
                  src="/WMSU.png"
                  alt="WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
              <div className="relative z-0 h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white ring-2 ring-[#C8102E] border border-white/20 p-0.5 flex items-center justify-center shadow-xs">
                <img
                  src="/RDEC-WMSU.png"
                  alt="RDEC-WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
            </div>

            <div className="min-w-0 flex flex-col leading-tight">
              <span className="hidden sm:block text-[10px] lg:text-[11px] font-normal tracking-wider text-white/80 uppercase">
                Western Mindanao State University
              </span>
              <span className="truncate text-sm lg:text-base font-semibold tracking-tight text-white">
                RDEC <span className="hidden sm:inline">Proposal </span>Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-6 text-sm font-medium text-white/90">

            <a
              href="#call-for-proposals"
              className="hover:text-white transition-colors py-1 hover:underline underline-offset-4"
            >
              Call for Proposals
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              to="/register"
              className="hidden sm:inline-flex min-h-11 items-center justify-center px-4 py-2.5 rounded-lg border border-white/60 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Sign Up
            </Link>
            <button
              type="button"
              onClick={onSignInClick}
              className="group inline-flex min-h-11 items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg font-semibold text-sm text-[#C8102E] bg-white hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="hidden sm:block w-4 h-4 text-[#C8102E] transition-transform duration-500 ease-in-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 motion-reduce:transform-none motion-reduce:transition-none" />
            </button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden min-h-11 min-w-11 p-2 rounded-lg text-white hover:bg-red-800/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="xl:hidden py-4 border-t border-red-800/40 bg-[#C8102E] rounded-b-sm shadow-lg px-2 space-y-2 text-white">

            <a
              href="#call-for-proposals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              Call for Proposals
            </a>
            <a
              href="#priority-areas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              Priority Research Areas
            </a>
            <a
              href="#how-to-submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              How to Submit
            </a>
            <a
              href="#templates"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              Download Templates
            </a>
            <a
              href="#contacts"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              Helpdesk &amp; Inquiries
            </a>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="sm:hidden flex min-h-11 items-center justify-center px-4 py-2.5 rounded-lg border border-white/60 text-sm font-semibold hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
