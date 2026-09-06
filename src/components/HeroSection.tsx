import React, { useState, useEffect, useRef } from 'react';
import type { StatItem } from '../data/landingContent';

interface HeroSectionProps {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  images: string[];
  stats: StatItem[];
  onSignInClick?: () => void;
}

const ImageWithLoader: React.FC<{ src: string; alt: string; className: string }> = ({
  src,
  alt,
  className,
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className} bg-gray-200 transition-colors duration-500`}>
      {!loaded && (
        <div className="absolute inset-0 z-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
        </div>
      )}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-1000 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 backdrop-blur-3xl bg-white/5 animate-pulse" />
      </div>
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`relative z-20 w-full h-full object-cover transition-all duration-1000 ease-out-expo ${
          loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-2xl scale-110'
        }`}
      />
    </div>
  );
};

const StatItemView: React.FC<{
  value: number;
  suffix: string;
  label: string;
  shouldStart: boolean;
}> = ({ value, suffix, label, shouldStart }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    const duration = 2000;
    const startVal = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * (value - startVal) + startVal));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value, shouldStart]);

  return (
    <div className="text-center sm:text-left transform hover:scale-105 transition-transform duration-300">
      <p className="text-2xl font-bold text-gray-800">
        {count}
        {suffix}
      </p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  badge,
  titlePrefix,
  titleHighlight,
  description,
  images,
  stats,
  onSignInClick,
}) => {
  const [isHeroInView, setIsHeroInView] = useState(false);
  const [isStatsInView, setIsStatsInView] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsHeroInView(true);
        }
      },
      { threshold: 0.1 }
    );
    const currentHero = heroRef.current;
    if (currentHero) heroObserver.observe(currentHero);

    const statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsStatsInView(true);
        }
      },
      { threshold: 0.1 }
    );
    const currentStats = statsRef.current;
    if (currentStats) statsObserver.observe(currentStats);

    return () => {
      if (currentHero) heroObserver.unobserve(currentHero);
      if (currentStats) statsObserver.unobserve(currentStats);
    };
  }, []);

  const heroImg1 = images[0] || '/wmsu1_live.jpg';
  const heroImg2 = images[1] || '/wmsu2_live.jpg';
  const heroImg3 = images[2] || '/wmsu3_live.jpg';

  return (
    <section id="home" className="pt-24 pb-16 bg-gradient-to-br from-white via-white to-gray-50 relative overflow-hidden">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />

      <div
        ref={heroRef}
        className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10"
      >
        {/* Left Column: Copy & Actions */}
        <div
          className={`order-2 lg:order-1 transition-all duration-1000 ${
            isHeroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-2 animate-fade-in-down">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
              {badge}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold leading-tight mb-6 animate-fade-in-up">
            <span className="text-transparent bg-clip-text">
              <span className="text-gray-800">{titlePrefix}</span>{' '}
              <span className="font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
                {titleHighlight}
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed animate-fade-in-up animation-delay-200">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up animation-delay-400">
            <button
              type="button"
              onClick={onSignInClick}
              className="group inline-flex items-center justify-center px-7 py-3.5 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 transform hover:-translate-y-0.5 cursor-pointer"
              style={{ backgroundColor: '#C8102E' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#A00D26')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8102E')}
            >
              <span>Get Started</span>
              <svg
                className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <a
              href="#about"
              className="group inline-flex items-center justify-center px-7 py-3.5 rounded-lg font-medium transition-all duration-300 border-2 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 transform hover:-translate-y-0.5"
              style={{ borderColor: '#C8102E', color: '#C8102E' }}
            >
              <span>Learn More</span>
              <svg
                className="ml-2 w-4 h-4 transition-transform group-hover:translate-y-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          {/* Stats Bar */}
          <div
            ref={statsRef}
            className={`mt-12 pt-8 border-t border-gray-200 transition-all duration-1000 ${
              isStatsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex flex-wrap gap-8">
              {stats.map((stat, idx) => (
                <StatItemView
                  key={idx}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  shouldStart={isStatsInView}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Original 2-column image collage with Q1 loaders */}
        <div
          className={`order-1 lg:order-2 relative transition-all duration-1000 delay-200 ${
            isHeroInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}
        >
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4 md:space-y-6 animate-fade-in-left">
              <div className="overflow-hidden rounded-2xl shadow-lg transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:rotate-1">
                <ImageWithLoader
                  src={heroImg1}
                  alt="Research visual 1"
                  className="w-full h-44 sm:h-48 lg:h-56 transition-transform duration-700 hover:scale-110"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-lg transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:rotate-1">
                <ImageWithLoader
                  src={heroImg2}
                  alt="Research visual 2"
                  className="w-full h-44 sm:h-48 lg:h-56 transition-transform duration-700 hover:scale-110"
                />
              </div>
            </div>

            <div className="pt-8 md:pt-12 animate-fade-in-right animation-delay-200">
              <div className="overflow-hidden rounded-2xl shadow-lg transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:-rotate-1">
                <ImageWithLoader
                  src={heroImg3}
                  alt="Research visual 3"
                  className="w-full h-80 sm:h-72 lg:h-96 transition-transform duration-700 hover:scale-110"
                />
              </div>
            </div>
          </div>

          <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-100 rounded-full opacity-70 -z-10 animate-float" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-red-50 rounded-full opacity-60 -z-10 animate-float animation-delay-2000" />
        </div>
      </div>
    </section>
  );
};
