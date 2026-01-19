'use client';

import { useState } from 'react';
import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

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
      question: "Can I use the app outside Portugal?",
      answer: "Yes. The app works anywhere, but the initial focus is on the Portuguese market, where we are building an active community."
    },
    {
      question: "What is iFound for if I haven't lost anything?",
      answer: "You can help others recover what they've lost—by sharing posts, getting in touch, or even returning something you found. The strength of iFound lies in its community."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
        <main className="flex items-start justify-center min-h-screen p-8 pt-32 pb-16">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-8">Frequently<br />Asked<br />Questions</h1>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg font-semibold text-black pr-4">{faq.question}</span>
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
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#2A2A2A] text-white min-h-[160px] px-6 md:px-12 lg:px-16">
        <div className="max-w-[1400px] mx-auto h-full flex flex-col justify-between py-3">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-8">
            {/* Logo and Info */}
            <div className="flex flex-col items-start gap-2 min-[400px]:items-start items-center">
              <div className="flex flex-col items-start gap-0">
                <img src="/logopin.png" alt="Logo" width={60} height={60} className="object-contain mt-3 ml-2" />
                <a href="/" className="text-white text-2xl font-semibold -mt-3">
                  ifound
                </a>
              </div>
              {/* Social Icons */}
              <div className="flex gap-2 mt-1 -ml-1">
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="w-4 h-4 text-white" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faLinkedin} className="w-4 h-4 text-white" />
                  </a>
                </div>
            </div>

            {/* Quick Links and Support - Middle Column */}
            <div className="flex flex-col min-[400px]:flex-row gap-8 justify-center items-start min-[400px]:self-center">
            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold text-base mb-2">Quick Links</h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="/about" className="text-white/60 hover:text-white transition-colors text-base">
                    About us
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-white/60 hover:text-white transition-colors text-base">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/partner" className="text-white/60 hover:text-white transition-colors text-base">
                    Become a Partner
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold text-base mb-2">Support</h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="/contact" className="text-white/60 hover:text-white transition-colors text-base">
                    Contacts
                  </a>
                </li>
                <li>
                  <a href="/faqs" className="text-white/60 hover:text-white transition-colors text-base">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Empty Column */}
          <div></div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-1.5 text-center">
          <p className="text-white/50 text-xs">© 2026 ifound. All rights reserved.</p>
        </div>
      </div>
    </footer>
    </div>
  );
}
