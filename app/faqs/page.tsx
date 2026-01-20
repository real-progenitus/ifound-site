'use client';

import { useState } from 'react';
import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import PageFooter from '../components/PageFooter';

export default function FAQs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is ifound?",
      answer: "ifound is an app that allows anyone to post and search for lost or found objects, animals, vehicles, or people in a simple and collaborative way."
    },
    {
      question: "How does it work?",
      answer: "Users can: Post a lost or found item with a description and location; Contact other users directly about their posts; Browse cases by geographic area and help those in need."
    },
    {
      question: "Is the app free?",
      answer: "Yes. The current version of ifound is completely free—for those who post, help, or search."
    },
    {
      question: "Are there notifications or automatic alerts?",
      answer: "Not yet. The current version does not include push notifications or automatic alerts. Users must manually check the available cases in the app."
    },
    {
      question: "Are messages anonymous?",
      answer: "No. The messaging system is direct between users, with visible profiles. Communication is voluntary but not anonymous."
    },
    {
      question: "Can I offer a reward?",
      answer: "In the initial version, there is no built-in reward feature. Any agreements between users must be made outside the app."
    },
    {
      question: "Which platforms is it available on?",
      answer: "The app is currently available on: iOS (App Store) and Android (Google Play)."
    },
    {
      question: "Is my data secure?",
      answer: (
        <>
          Yes. All data is handled according to current{' '}
          <a href="/privacy" className="text-[#1f3577] underline hover:text-[#1f3577]/80">privacy</a>
          {' '}and data protection laws. We do not share personal information with third parties.
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out pb-16">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About us' },
          { href: '/privacy', label: 'Privacy Policy' }
        ]} />

        {/* Desktop Logo */}
        <a href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <a href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</a>
          <a href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">About us</a>
          <a href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-8">Frequently<br />Asked<br />Questions</h1>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full text-left p-6 flex justify-between items-center hover:bg-white/5 transition-colors"
                  >
                    <span className="text-lg font-semibold pr-4">{faq.question}</span>
                    <span className="text-2xl flex-shrink-0">
                      {openIndex === index ? '−' : '+'}
                    </span>
                  </button>
                  {openIndex === index && (
                    <div className="px-6 pb-6 text-white/90">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* App Store and Google Play Buttons */}
        <div className="flex justify-center items-center pt-16 pb-12 px-4">
          <div className="flex flex-row gap-3 text-sm font-semibold">
            <button className="flex h-12 w-[130px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
              <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
              <span className="text-sm leading-none">App Store</span>
            </button>
            <button className="flex h-12 w-[130px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
              <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm leading-none">Google Play</span>
            </button>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
