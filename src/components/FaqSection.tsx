import React, { useState } from 'react';
import type { FAQCategory } from '../data/landingContent';

interface FaqSectionProps {
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    description: string;
  };
  categories: FAQCategory[];
  support: {
    title: string;
    description: string;
    email: string;
    phone: string;
  };
}

export const FaqSection: React.FC<FaqSectionProps> = ({
  hero,
  categories,
  support,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(
    categories[0]?.id || 'general'
  );
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const currentCategory =
    categories.find((cat) => cat.id === selectedCategory) || categories[0];

  return (
    <section id="faq" className="py-20 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 mb-4">
            {hero.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-red-700 bg-clip-text text-transparent">
            <span>{hero.titlePrefix} </span>
            <span className="text-[#C8102E]">{hero.titleHighlight}</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {hero.description}
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Accordion Questions */}
        <div className="space-y-4 max-w-4xl mx-auto mb-14">
          {currentCategory?.items.map((item) => {
            const isOpen = openItems.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:border-red-200 transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-bold text-gray-800 pr-4">
                    {item.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-red-100 text-[#C8102E]' : 'text-gray-500'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-gray-600 text-sm sm:text-base leading-relaxed border-t border-gray-100">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Card */}
        <div className="bg-gradient-to-r from-red-50 via-white to-red-50 rounded-3xl p-8 border border-red-100 text-center max-w-3xl mx-auto shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{support.title}</h3>
          <p className="text-gray-600 mb-6">{support.description}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${support.email}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8102E] text-white font-medium shadow-sm hover:bg-[#A00D26] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {support.email}
            </a>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {support.phone}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
