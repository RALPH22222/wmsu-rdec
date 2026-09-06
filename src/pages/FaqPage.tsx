import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, PiggyBank, Wrench, Mail, Phone } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  items: FAQItem[];
}

interface FAQData {
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    description: string;
  };
  support: {
    title: string;
    description: string;
    email: string;
    phone: string;
  };
  categories: FAQCategory[];
}

const defaultFaq: FAQData = {
  hero: {
    badge: 'Support Center',
    titlePrefix: 'Frequently Asked',
    titleHighlight: 'Questions',
    description: 'Find quick answers to questions about proposals, submission, funding, and technical help.',
  },
  support: {
    title: 'Still have questions?',
    description: 'Please reach out to our support team for further help.',
    email: 'research@wmsu.edu.ph',
    phone: '+63629914569',
  },
  categories: [
    {
      id: 'general',
      icon: 'general',
      name: 'General Questions',
      items: [
        {
          id: 'q_gen_1',
          question: 'What are the proposal submission deadlines?',
          answer:
            'Proposal deadlines vary by funding source. Regular internal reviews occur monthly on the last Friday of each month, while external funding opportunities have specific timelines announced on our portal.',
        },
        {
          id: 'q_gen_2',
          question: 'How long does the proposal review process take?',
          answer:
            'Standard review takes 2-3 weeks. Complex proposals or those requiring ethics clearance may take 4-6 weeks.',
        },
        {
          id: 'q_gen_3',
          question: 'Who can submit research proposals?',
          answer:
            'All WMSU faculty members, graduate students, and research staff are eligible to submit proposals.',
        },
      ],
    },
    {
      id: 'submission',
      icon: 'submission',
      name: 'Submission Process',
      items: [
        {
          id: 'q_sub_1',
          question: 'What documents are required for proposal submission?',
          answer:
            'Required documents include: completed DOST Form 1B, project timeline, budget breakdown, and endorsement from department head.',
        },
        {
          id: 'q_sub_2',
          question: 'Can I submit proposals electronically?',
          answer:
            'Yes! All proposals must be submitted through our online portal. The system accepts PDF documents and provides confirmation.',
        },
      ],
    },
    {
      id: 'funding',
      icon: 'funding',
      name: 'Funding & Budget',
      items: [
        {
          id: 'q_fund_1',
          question: 'What funding sources are available through WMSU?',
          answer:
            'We support funding avenues including internal WMSU grants, DOST, CHED, and international collaborations.',
        },
        {
          id: 'q_fund_2',
          question: 'Can I get help with budget preparation?',
          answer:
            'Yes! Our research support team provides budget consultation to align with funding requirements.',
        },
      ],
    },
    {
      id: 'technical',
      icon: 'technical',
      name: 'Technical Support',
      items: [
        {
          id: 'q_tech_1',
          question: 'What if I encounter technical issues with the portal?',
          answer:
            'For technical support, email research.support@wmsu.edu.ph or call +63 (62) 991-4569.',
        },
      ],
    },
  ],
};

export const FaqPage: React.FC = () => {
  const data = defaultFaq;
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultFaq.categories[0].id);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [heroInView, setHeroInView] = useState(false);
  const [contentInView, setContentInView] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const hObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeroInView(true);
      },
      { threshold: 0.1 }
    );
    if (heroRef.current) hObs.observe(heroRef.current);

    const cObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setContentInView(true);
      },
      { threshold: 0.1 }
    );
    if (contentRef.current) cObs.observe(contentRef.current);

    return () => {
      hObs.disconnect();
      cObs.disconnect();
    };
  }, []);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    general: <Search className="w-5 h-5 shrink-0" />,
    submission: <FileText className="w-5 h-5 shrink-0" />,
    funding: <PiggyBank className="w-5 h-5 shrink-0" />,
    technical: <Wrench className="w-5 h-5 shrink-0" />,
  };

  const selectedCategoryData =
    data.categories.find((c) => c.id === selectedCategory) || data.categories[0];

  const allQuestions = data.categories.flatMap((c) =>
    c.items.map((item) => ({
      ...item,
      categoryName: c.name,
      categoryIcon: c.icon,
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-white via-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />

        <div ref={heroRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div
            className={`transition-all duration-1000 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="mb-2 animate-fade-in-down">
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-[#C8102E] border border-[#C8102E]/20">
                {data.hero.badge}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 animate-fade-in-up animation-delay-100">
              <span className="text-gray-800">{data.hero.titlePrefix} </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-[#C8102E]">
                {data.hero.titleHighlight}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              {data.hero.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main FAQ Content */}
      <section className="py-8 sm:py-12 md:py-16 bg-white flex-1">
        <div
          ref={contentRef}
          className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8"
        >
          {/* Left Column: Category Sidebar (Sticky on Desktop) */}
          <div
            className={`lg:col-span-1 hidden lg:block transition-all duration-1000 ${
              contentInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <div className="bg-white rounded-2xl p-6 border border-[#C8102E]/20 shadow-md sticky top-24 transform hover:scale-102 transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {data.categories.map((cat, idx) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-all duration-300 transform cursor-pointer ${
                        isSelected
                          ? 'text-white shadow-lg hover:scale-101'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-[#C8102E] hover:scale-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? '#C8102E' : 'white',
                        transitionDelay: `${idx * 50}ms`,
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#FEECEC';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <span className="shrink-0">
                        {categoryIcons[cat.icon] ?? categoryIcons.general}
                      </span>
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Still have questions? links in sidebar */}
              <div className="mt-8 pt-6 border-t border-[#C8102E]/30">
                <h4 className="font-semibold text-gray-900 mb-3">{data.support.title}</h4>
                <div className="space-y-3">
                  {data.support.email && (
                    <a
                      href={`mailto:${data.support.email}`}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm transform hover:scale-100 hover:shadow-md break-all cursor-pointer"
                      style={{ color: '#C8102E' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEECEC')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="shrink-0">
                        <Mail className="w-4 h-4" />
                      </span>
                      Email Support
                    </a>
                  )}
                  {data.support.phone && (
                    <a
                      href={`tel:${data.support.phone}`}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm transform hover:scale-100 hover:shadow-md cursor-pointer"
                      style={{ color: '#C8102E' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEECEC')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="shrink-0">
                        <Phone className="w-4 h-4" />
                      </span>
                      Call Support
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Question Accordions & Bottom CTA Card */}
          <div
            className={`lg:col-span-3 transition-all duration-1000 ${
              contentInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="bg-white rounded-2xl p-3 sm:p-6 md:p-8 border border-[#C8102E]/20 shadow-md hover:shadow-xl transition-all duration-300 overflow-x-auto">
              {/* Desktop Category Header */}
              {selectedCategoryData && (
                <div className="hidden lg:flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#C8102E]/10 rounded-xl flex items-center justify-center transform hover:rotate-12 transition-transform duration-300 min-w-[48px] min-h-[48px] text-[#C8102E]">
                    {categoryIcons[selectedCategoryData.icon] ?? categoryIcons.general}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCategoryData.name}</h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {selectedCategoryData.items.length} questions in this category
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile Header */}
              <div className="lg:hidden mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Questions</h2>
                <p className="text-gray-600 text-sm">{allQuestions.length} total questions available</p>
              </div>

              {/* Desktop Accordions */}
              <div className="space-y-4">
                <div className="hidden lg:block">
                  {selectedCategoryData?.items.map((item, idx) => {
                    const isOpen = openItems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-100 mb-4"
                        style={{ transitionDelay: `${idx * 50}ms` }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="w-full text-left p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <h3 className="font-semibold text-gray-900 text-lg flex-1">
                            {item.question}
                          </h3>
                          <svg
                            className={`w-5 h-5 text-[#C8102E] transition-transform duration-300 shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <div
                          className={`transition-all duration-500 overflow-hidden ${
                            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-6 pt-0 border-t border-gray-100 text-gray-600 leading-relaxed">
                            {item.answer}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedCategoryData?.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-lg">
                      No questions in this category.
                    </div>
                  )}
                </div>

                {/* Mobile Accordions */}
                <div className="lg:hidden space-y-4">
                  {allQuestions.map((q) => {
                    const itemId = `mob_${q.id}`;
                    const isOpen = openItems.includes(itemId);
                    return (
                      <div
                        key={itemId}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                          <div className="flex items-center gap-2 text-xs text-[#C8102E] font-medium bg-[#C8102E]/10 px-2 py-1 rounded-full">
                            {categoryIcons[q.categoryIcon] ?? categoryIcons.general}
                            <span className="capitalize">{q.categoryName}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleItem(itemId)}
                          className="w-full text-left p-6 pt-2 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <h3 className="font-semibold text-gray-900 text-lg flex-1">
                            {q.question}
                          </h3>
                          <svg
                            className={`w-5 h-5 text-[#C8102E] transition-transform duration-300 shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <div
                          className={`transition-all duration-500 overflow-hidden ${
                            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-6 pt-0 border-t border-gray-100 text-gray-600 leading-relaxed">
                            {q.answer}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom CTA Card: Still have questions? (Exact match to screenshot 1) */}
              <div
                className="mt-8 p-6 rounded-xl text-center text-white shadow-lg transition-all duration-300 transform hover:scale-100 hover:shadow-2xl"
                style={{ backgroundColor: '#C8102E' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#A00D26')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8102E')}
              >
                <h3 className="text-xl font-bold mb-2">{data.support.title}</h3>
                <p className="text-red-100 mb-4">{data.support.description}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {data.support.email && (
                    <a
                      href={`mailto:${data.support.email}`}
                      className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#C8102E] rounded-lg font-medium transition-all shadow-md hover:shadow-lg hover:scale-101 gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      Email Support
                    </a>
                  )}
                  {data.support.phone && (
                    <a
                      href={`tel:${data.support.phone}`}
                      className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-lg font-medium transition-all hover:bg-white hover:text-[#C8102E] hover:scale-101 gap-2 cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                      Call Now
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
