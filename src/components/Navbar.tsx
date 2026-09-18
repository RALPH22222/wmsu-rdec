import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onSignInClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);

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
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out ${
        isScrolled
          ? 'backdrop-blur-md bg-[#C8102E]/95 shadow-xl'
          : 'bg-[#C8102E] shadow-lg'
      }`}
      style={{ backgroundColor: '#C8102E' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo & Brand Name */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#E03A52] focus:ring-offset-2"
            aria-label="Home - WMSU Project Proposal"
          >
            <div className="relative flex items-center gap-2">
              <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-red-950/50">
                <img
                  src="/WMSU.png"
                  alt="WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
              <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-red-950/50">
                <img
                  src="/RDEC-WMSU.png"
                  alt="RDEC-WMSU Logo"
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-base lg:text-lg font-bold tracking-tight text-white">
                <span className="hidden min-[321px]:inline">WMSU </span>
                <span>Project Proposal</span>
              </span>
              <span className="text-xs lg:text-sm opacity-80 hidden lg:block text-white">
                Research Development &amp; Evaluation Center
              </span>
            </div>
          </Link>

          {/* Right Navigation CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignInClick}
              className="px-4 py-1.5 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E03A52] focus:ring-offset-2 md:px-5 md:py-2 lg:px-6 lg:py-2.5 bg-white text-[#333333] hover:bg-[#E03A52] hover:text-white cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
