import React, { useState, useEffect, useRef } from 'react';

interface AboutSectionProps {
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  imageUrl?: string;
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

export const AboutSection: React.FC<AboutSectionProps> = ({
  badge,
  title,
  description,
  bullets,
  imageUrl = '/rdec_live.jpg',
}) => {
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );
    const currentEl = sectionRef.current;
    if (currentEl) observer.observe(currentEl);
    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, []);

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div ref={sectionRef} className="max-w-6xl mx-auto px-6 lg:px-8">
        <div
          className={`bg-white rounded-2xl shadow-xl p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center transform hover:shadow-[0_20px_50px_rgba(128,0,0,0.15)] transition-all duration-1000 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Left 2 Columns: Information & Actions */}
          <div className="lg:col-span-2">
            <div className="mb-3">
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 mb-4">
                {badge}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent leading-relaxed">
              {title}
            </h2>

            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm text-gray-600">{bullet}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:research@wmsu.edu.ph"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg text-white text-center bg-[#C8102E] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                style={{ backgroundColor: '#C8102E' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#A00D26')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8102E')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Our Office
              </a>

              <a
                href="/about"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 border-2 hover:bg-red-50 text-center focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                style={{ borderColor: '#C8102E', color: '#C8102E' }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                View Services
              </a>
            </div>
          </div>

          {/* Right Column: Office Photo & Decorative Blobs */}
          <div className="relative">
            <div className="w-full h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg">
              <ImageWithLoader
                src={imageUrl}
                alt="Office Display"
                className="w-full h-full transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-red-100 rounded-full opacity-80 -z-10" />
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-red-50 rounded-full opacity-60 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};
