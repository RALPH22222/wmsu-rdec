import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

interface NavbarProps {
  onSignInClick?: () => void;
}

const HomeIcon: React.FC<{ isActive: boolean }> = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const AboutIcon: React.FC<{ isActive: boolean }> = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ContactsIcon: React.FC<{ isActive: boolean }> = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const FaqIcon: React.FC<{ isActive: boolean }> = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const location = useLocation();
  const navigate = useNavigate();

  const routeTab =
    location.pathname === '/about'
      ? 'about'
      : location.pathname === '/contacts'
      ? 'contacts'
      : location.pathname === '/faqs'
      ? 'faq'
      : 'home';

  const currentActiveTab = location.pathname === '/' ? activeSection : routeTab;

  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      setIsScrolled(window.scrollY > 10);

      if (window.location.pathname === '/') {
        const section = ['contacts', 'about', 'home'].find((id) => {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            return rect.top <= 100 && rect.bottom >= 100;
          }
          return false;
        });

        if (section) {
          setActiveSection(section);
        } else if (window.scrollY === 0) {
          setActiveSection('home');
        }
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/', id: 'home' },
    { name: 'About', icon: AboutIcon, href: '/about', id: 'about' },
    { name: 'Contacts', icon: ContactsIcon, href: '/contacts', id: 'contacts' },
    { name: 'FAQ', icon: FaqIcon, href: '/faqs', id: 'faq' },
  ];

  const handleNavClick = (e: React.MouseEvent, item: (typeof navItems)[0]) => {
    e.preventDefault();
    setActiveSection(item.id);

    if (location.pathname === item.href) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(item.href);
    }
  };

  return (
    <>
      {/* Top Header Banner */}
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
                    alt="WMSU Project Proposal Logo"
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

            {/* Desktop Navigation Links */}
            <nav role="navigation" className="hidden md:flex items-center space-x-1 pr-4">
              {navItems.map((item) => {
                const isCurrent = currentActiveTab === item.id;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`relative px-4 py-2 font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md cursor-pointer ${
                      isCurrent
                        ? 'font-bold text-white'
                        : 'text-white/90 hover:text-[#E03A52]'
                    }`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.name}
                    <span
                      className={`absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? 'w-full bg-white'
                          : 'w-0 bg-[#E03A52] group-hover:w-full'
                      }`}
                    />
                  </a>
                );
              })}

              {/* Get Started Button */}
              <button
                type="button"
                onClick={onSignInClick}
                className="ml-4 px-4 py-1.5 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E03A52] focus:ring-offset-2 md:px-5 md:py-2 lg:px-6 lg:py-3 bg-white text-[#333333] hover:bg-[#E03A52] hover:text-white cursor-pointer"
              >
                Get Started
              </button>
            </nav>

            {/* Mobile Top Button */}
            <button
              type="button"
              onClick={onSignInClick}
              className="md:hidden px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E03A52] bg-white text-[#333333] cursor-pointer"
            >
              <span className="text-xs">Get Started</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (exact copy of original website) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-red-700 shadow-2xl bg-[#C8102E]"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isCurrent = currentActiveTab === item.id;
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex flex-col items-center py-3 px-2 flex-1 min-w-0 transition-all duration-200 cursor-pointer ${
                  isCurrent ? 'text-white bg-red-800' : 'text-white/90 hover:bg-red-800'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <div className={`mb-1 transition-transform duration-200 ${isCurrent ? 'scale-110' : 'scale-100'}`}>
                  <Icon isActive={isCurrent} />
                </div>
                <span className={`text-xs font-medium truncate max-w-full ${isCurrent ? 'font-bold' : 'font-normal'}`}>
                  {item.name}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
};
