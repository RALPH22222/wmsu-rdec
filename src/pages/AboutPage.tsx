import React, { useState, useEffect, useRef } from 'react';

const aboutData = {
  hero: {
    badge: 'About Our Service',
    description:
      'Empowering students and faculty with professionally crafted project proposals that secure funding and drive innovation at Western Mindanao State University.',
    title_prefix: 'About',
    title_highlight: 'Project Proposal',
  },
  stats: {
    badge: 'Our Distinct Approach',
    title: 'The WMSU Lead',
    description:
      'Experience a partnership built on academic excellence, tailored specifically for the Western Mindanao State University community.',
    approval_rate: 89,
    projects_funded: 50,
    client_satisfaction: 100,
    funding_secured_text: '₱2.3M+',
  },
  story: {
    badge: 'Our Story',
    title: 'Transforming Ideas into Funded Projects',
    image_url: '/wmsu_gym.jpg',
    paragraphs: [
      'Founded by dedicated professionals with extensive experience in academic research and project development, Smart Project Proposal was born from a simple observation: many brilliant ideas at our university never see the light of day due to inadequate proposal writing.',
      "We recognized the gap between innovative concepts and successful funding approvals. Our mission became clear: to bridge this gap by providing expert proposal writing services tailored specifically for WMSU's unique academic environment.",
      "Today, we're proud to have helped numerous students and faculty members transform their visions into funded, impactful projects that contribute to WMSU's legacy of excellence.",
    ],
  },
  process: {
    title: 'Our Streamlined Process',
    steps: [
      {
        title: 'Team Formation & Proposal Preparation',
        description: 'Assemble your research team and develop your initial proposal concept with our guidance',
      },
      {
        title: 'Proposal Submission',
        description: 'Submit your completed proposal through our streamlined online portal for initial review',
      },
      {
        title: 'R&D Staff & Evaluator Review',
        description: 'Our research and development team and expert evaluators conduct comprehensive assessment',
      },
      {
        title: 'RDEC Endorsement',
        description: 'Successful proposals receive official endorsement from the Research and Development Ethics Committee',
      },
      {
        title: 'Funding Approval & Implementation',
        description: 'Your proposal is declared fundable and ready for project implementation and execution',
      },
    ],
  },
  value_props: {
    proposition_1: {
      title: 'Response Guarantee',
      button_text: 'Get Feedback',
      description: 'Get feedback within 48 hours and complete proposals in as little as 2 weeks, ensuring you never miss important deadlines.',
    },
    proposition_2: {
      title: 'Budget-Conscious Solutions',
      button_text: 'Affordable Excellence',
      description: 'Special student and faculty rates with flexible payment options, because great research shouldn\'t be limited by budget constraints.',
    },
  },
  mission_vision: {
    vision: 'To become the leading project proposal consultancy at Western Mindanao State University, recognized for transforming innovative ideas into funded projects that create lasting positive change in academia and society.',
    mission: 'To empower WMSU students and faculty with professionally crafted project proposals that secure funding, drive innovation, and contribute to the university\'s academic excellence and community impact.',
  },
};

const AnimatedNumber: React.FC<{ value: number; suffix: string; label: string; shouldStart: boolean }> = ({
  value,
  suffix,
  label,
  shouldStart,
}) => {
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
    <div className="text-center transform hover:scale-110 transition-transform duration-300">
      <div className="text-3xl font-bold mb-2">
        {count}
        {suffix}
      </div>
      <div className="text-red-200 text-sm">{label}</div>
    </div>
  );
};

export const AboutPage: React.FC = () => {
  const [heroInView, setHeroInView] = useState(false);
  const [storyInView, setStoryInView] = useState(false);
  const [mvInView, setMvInView] = useState(false);
  const [statsInView, setStatsInView] = useState(false);
  const [processInView, setProcessInView] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const mvRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const createObserver = (setter: (v: boolean) => void) =>
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setter(true);
        },
        { threshold: 0.1 }
      );

    const hObs = createObserver(setHeroInView);
    if (heroRef.current) hObs.observe(heroRef.current);

    const sObs = createObserver(setStoryInView);
    if (storyRef.current) sObs.observe(storyRef.current);

    const mvObs = createObserver(setMvInView);
    if (mvRef.current) mvObs.observe(mvRef.current);

    const stObs = createObserver(setStatsInView);
    if (statsRef.current) stObs.observe(statsRef.current);

    const pObs = createObserver(setProcessInView);
    if (processRef.current) pObs.observe(processRef.current);

    return () => {
      hObs.disconnect();
      sObs.disconnect();
      mvObs.disconnect();
      stObs.disconnect();
      pObs.disconnect();
    };
  }, []);

  const t = aboutData;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-white via-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />

        <div ref={heroRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div
            className={`text-center transition-all duration-1000 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="mb-2 animate-fade-in-down">
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 animate-fade-in-up animation-delay-100">
              <span className="text-transparent bg-clip-text">
                <span className="text-gray-800">{t.hero.title_prefix}</span>{' '}
                <span className="font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
                  {t.hero.title_highlight}
                </span>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              {t.hero.description}
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white">
        <div ref={storyRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transform hover:shadow-[0_20px_50px_rgba(128,0,0,0.15)] transition-all duration-1000 border border-gray-100 ${
              storyInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="animate-fade-in-left">
              <div className="mb-3">
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                  {t.story.badge}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent leading-relaxed">
                {t.story.title}
              </h2>
              {t.story.paragraphs.map((p, idx) => (
                <p key={idx} className="text-lg text-gray-600 mb-6 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>

            <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in-right animation-delay-200">
              <div className="relative h-96 w-full overflow-hidden rounded-lg shadow-lg group">
                <img
                  src={t.story.image_url}
                  alt="Western Mindanao State University"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div ref={mvRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-1000 ${
              mvInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Mission */}
            <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:shadow-[0_20px_50px_rgba(128,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border border-gray-100 border-b-4 border-b-red-300 hover:border-b-red-600 animate-fade-in-left">
              <div className="w-16 h-16 bg-red-100 mx-auto rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold flex items-center justify-center mb-4">
                <span className="text-red-600">❝</span>
                <span className="text-gray-900 px-1">Our Mission</span>
                <span className="text-red-600">❞</span>
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">{t.mission_vision.mission}</p>
            </div>

            {/* Vision */}
            <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:shadow-[0_20px_50px_rgba(128,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border border-gray-100 border-b-4 border-b-red-300 hover:border-b-red-600 animate-fade-in-right animation-delay-200">
              <div className="w-16 h-16 bg-red-100 mx-auto rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold flex items-center justify-center mb-4">
                <span className="text-red-600">❝</span>
                <span className="text-gray-900 px-1">Our Vision</span>
                <span className="text-red-600">❞</span>
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">{t.mission_vision.vision}</p>
            </div>
          </div>
        </div>
      </section>

      {/* The WMSU Lead / Stats Section */}
      <section className="py-20 bg-gradient-to-br from-white via-red-50/10 to-white relative overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-20 bg-red-200 rounded-full opacity-20 animate-float" />
        <div className="absolute bottom-20 right-16 w-16 h-16 bg-red-300 rounded-full opacity-30 animate-float animation-delay-2000" />
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-red-100 rounded-full opacity-40 animate-float animation-delay-4000" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-block px-3 py-1 items-center rounded-full bg-red-50 border border-red-300 mb-4">
              <span className="text-xs text-red-700 font-semibold">{t.stats.badge}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-[#C8102E] to-gray-800 bg-clip-text text-transparent">
              {t.stats.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t.stats.description}
            </p>
          </div>

          <div className="mb-16 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in-up animation-delay-200">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left Column */}
              <div className="p-12 lg:p-16 bg-gradient-to-br from-red-50 to-white">
                <h3 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 via-[#C8102E] to-gray-800 bg-clip-text mb-8">
                  {t.stats.title}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">{t.stats.description}</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-gray-600 transform hover:translate-x-2 transition-transform duration-300">
                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                    Familiar with WMSU research protocols and formats
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 transform hover:translate-x-2 transition-transform duration-300">
                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                    Established relationships with review committees
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 transform hover:translate-x-2 transition-transform duration-300">
                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                    Updated on latest university research policies
                  </li>
                </ul>
              </div>

              {/* Right Column: Key Metrics */}
              <div ref={statsRef} className="bg-gradient-to-br from-gray-900 to-[#C8102E] p-12 lg:p-16 text-white">
                <h4 className="text-2xl font-bold mb-6">Proven Track Record</h4>
                <div
                  className={`grid grid-cols-2 gap-8 mb-8 transition-all duration-1000 ${
                    statsInView ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <AnimatedNumber value={t.stats.approval_rate} suffix="%" label="Approval Rate" shouldStart={statsInView} />
                  <AnimatedNumber value={t.stats.projects_funded} suffix="+" label="Projects Funded" shouldStart={statsInView} />
                  <div className="text-center transform hover:scale-110 transition-transform duration-300">
                    <div className="text-3xl font-bold mb-2">{t.stats.funding_secured_text}</div>
                    <div className="text-red-200 text-sm">Funding Secured</div>
                  </div>
                  <AnimatedNumber value={t.stats.client_satisfaction} suffix="%" label="Client Satisfaction" shouldStart={statsInView} />
                </div>
                <p className="text-red-100 leading-relaxed">
                  Join the growing community of successful researchers who have transformed their ideas into funded projects through our specialized support.
                </p>
              </div>
            </div>
          </div>

          {/* Our Streamlined Process Timeline */}
          <div ref={processRef} className="mb-16">
            <h3
              className={`text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900 transition-all duration-1000 ${
                processInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              {t.process.title}
            </h3>

            <div className="relative">
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-red-200 to-red-300" />
              <div className="space-y-6 sm:space-y-8 md:space-y-12">
                {t.process.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`relative transition-all duration-700 ${
                      processInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${idx * 150}ms` }}
                  >
                    {/* Mobile Card */}
                    <div className="md:hidden bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-600 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                      <div className="text-sm font-semibold text-red-600 mb-1">
                        Step {String(idx + 1).padStart(2, '0')}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                    </div>

                    {/* Desktop Alternating Card */}
                    <div className="hidden md:flex items-center w-full">
                      {idx % 2 === 0 ? (
                        <>
                          <div className="w-1/2 pr-8 lg:pr-12">
                            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg border-l-4 border-red-600 text-right hover:shadow-xl transform hover:-translate-x-2 hover:scale-105 transition-all duration-300">
                              <div className="text-sm font-semibold text-red-600 mb-2">
                                Step {String(idx + 1).padStart(2, '0')}
                              </div>
                              <h4 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">{step.title}</h4>
                              <p className="text-gray-600 leading-relaxed text-sm lg:text-base">{step.description}</p>
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg z-10 shrink-0 animate-pulse" />
                          <div className="w-1/2" />
                        </>
                      ) : (
                        <>
                          <div className="w-1/2" />
                          <div className="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg z-10 shrink-0 animate-pulse" />
                          <div className="w-1/2 pl-8 lg:pl-12">
                            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg border-l-4 border-red-600 hover:shadow-xl transform hover:translate-x-2 hover:scale-105 transition-all duration-300">
                              <div className="text-sm font-semibold text-red-600 mb-2">
                                Step {String(idx + 1).padStart(2, '0')}
                              </div>
                              <h4 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">{step.title}</h4>
                              <p className="text-gray-600 leading-relaxed text-sm lg:text-base">{step.description}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up animation-delay-400">
            <div
              className="group p-10 rounded-3xl border border-red-100 shadow-lg transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
              style={{ backgroundColor: 'rgb(200, 16, 46)' }}
            >
              <h4 className="text-2xl font-bold text-white mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">
                {t.value_props.proposition_1.title}
              </h4>
              <p className="text-gray-200 leading-relaxed mb-6">
                {t.value_props.proposition_1.description}
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 border border-white bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transform hover:scale-105 transition-all duration-300 cursor-pointer">
                <span>{t.value_props.proposition_1.button_text}</span>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-white to-red-50 p-10 rounded-3xl border border-red-100 shadow-lg transform hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <h4
                className="text-2xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300 inline-block"
                style={{ color: 'rgb(200, 16, 46)' }}
              >
                {t.value_props.proposition_2.title}
              </h4>
              <p className="text-red-900 leading-relaxed mb-6">
                {t.value_props.proposition_2.description}
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold hover:bg-red-200 transform hover:scale-105 transition-all duration-300 cursor-pointer">
                <span>{t.value_props.proposition_2.button_text}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
