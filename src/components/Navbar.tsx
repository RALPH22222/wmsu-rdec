import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X, ChevronDown, ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface NavbarProps {
  onSignInClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const portalDropdownRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      setIsScrolled(window.scrollY > 10);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        portalDropdownRef.current &&
        !portalDropdownRef.current.contains(event.target as Node)
      ) {
        setPortalDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-sm p-1"
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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/90">
            {/* Admin & RPDU Dropdown */}
            <div className="relative" ref={portalDropdownRef}>
              <button
                type="button"
                onClick={() => setPortalDropdownOpen((prev) => !prev)}
                aria-expanded={portalDropdownOpen}
                aria-haspopup="true"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded-sm transition-colors text-xs border border-white/20 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <span>Admin & RPDU</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    portalDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {portalDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white text-slate-800 rounded-sm shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Portals
                  </div>
                  <Link
                    to="/admin"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#C8102E] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-sm bg-red-100 text-[#C8102E] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Admin Page</div>
                      <div className="text-[10px] text-slate-500 font-normal">Dashboard & Settings</div>
                    </div>
                  </Link>
                  <div className="h-px bg-slate-100 my-1" />
                  <Link
                    to="/rpdu"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#C8102E] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-sm bg-red-100 text-[#C8102E] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">RPDU Page</div>
                      <div className="text-[10px] text-slate-500 font-normal">Proposals & Evaluations</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

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
              className="group inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-sm font-bold text-xs sm:text-sm text-[#C8102E] bg-white hover:bg-slate-100 shadow-xs hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-[#C8102E] transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
            </button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-sm text-white hover:bg-red-800/50 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-red-800/40 bg-[#C8102E] rounded-b-sm shadow-lg px-2 space-y-2 text-white">
            <div className="p-2 bg-red-900/40 rounded-sm space-y-1">
              <div className="text-[11px] font-bold text-white/70 px-2 py-0.5 uppercase tracking-wider">
                Admin & RPDU
              </div>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-semibold bg-white/10 hover:bg-white/20 text-white"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Page</span>
              </Link>
              <Link
                to="/rpdu"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-semibold bg-white/10 hover:bg-white/20 text-white"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>RPDU Page</span>
              </Link>
            </div>
            <a
              href="#call-for-proposals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-sm text-sm font-medium hover:bg-red-800/40"
            >
              Call for Proposals 2027
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
          </div>
        )}
      </div>
    </header>
  );
};
