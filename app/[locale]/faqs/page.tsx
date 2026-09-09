'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import SiteNav from '../../components/SiteNav';
import PageFooter from '../../components/PageFooter';

const faqSections = [
  { category: 'cat_general', items: [1, 2, 3] },
  { category: 'cat_pricing', items: [4, 5, 6, 7, 8, 9, 10, 11] },
  { category: 'cat_items', items: [12, 13] },
  { category: 'cat_partners', items: [14, 15, 16, 17] },
  { category: 'cat_trust', items: [18, 19, 20] },
  { category: 'cat_support', items: [21, 22] }
];

export default function FAQs() {
  const t = useTranslations('faqs');
  const nav = useTranslations('nav');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Navigation */}
        <SiteNav align="start" links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: nav('aboutUs') },
          { href: '/privacy', label: nav('privacyPolicy') }
        ]} />

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32 pb-16">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-8">{t('title')}</h1>
            
            <div className="space-y-10">
              {faqSections.map((section) => (
                <div key={section.category}>
                  <h2 className="text-xl min-[600px]:text-2xl font-bold text-white mb-4">{t(section.category)}</h2>
                  <div className="space-y-4">
                    {section.items.map((index) => (
                      <div key={index} className="bg-white rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleFAQ(index)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg font-semibold text-black pr-4">{t(`q${index}`)}</span>
                          <svg
                            className={`w-6 h-6 text-[#38B6FF] flex-shrink-0 transition-transform ${
                              openIndex === index ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openIndex === index && (
                          <div className="px-6 pb-4 text-gray-700">
                            <p>{t(`a${index}`)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* White Section */}
      <section className="w-full bg-white py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/about" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              {nav('aboutUs')}
            </Link>
            <Link 
              href="/privacy" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              {nav('privacyPolicy')}
            </Link>
            <Link 
              href="/partner" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              {nav('becomePartner')}
            </Link>
            <Link 
              href="/contact" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              {nav('contacts')}
            </Link>
            <Link 
              href="/faqs" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              {nav('faqs')}
            </Link>
          </div>
        </div>
      </section>
      <PageFooter />
    </div>
  );
}
