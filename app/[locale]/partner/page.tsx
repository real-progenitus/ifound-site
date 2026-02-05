'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import MobileNav from '../../components/MobileNav';
import PageFooter from '../../components/PageFooter';
import Logo from '../../components/Logo';

export default function Partner() {
  const t = useTranslations('partner');
  const nav = useTranslations('nav');
  const [showNotification, setShowNotification] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const company = formData.get('company') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;
    
    // Validate all fields are filled
    if (!company || !firstName || !lastName || !email || !message) {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 10000);
      return;
    }
    
    // Show success notification
    setShowNotification(true);
    
    // Clear the form
    e.currentTarget.reset();
    
    // Hide notification after 10 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: nav('aboutUs') },
          { href: '/privacy', label: nav('privacyPolicy') }
        ]} />

        {/* Desktop Logo */}
        <Logo className="hidden min-[600px]:flex absolute top-4 left-8 z-10" />

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</Link>
          <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('aboutUs')}</Link>
          <Link href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('privacyPolicy')}</Link>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">{t('title')}</h1>
            <div className="text-lg leading-relaxed space-y-4">
              <p>{t('intro1')}</p>
              <p>{t('intro2')}</p>
              <p>{t('intro3')}</p>
              <p>{t('intro4')}</p>
            </div>

            {/* Partner Form */}
            <div className="mt-12 bg-white rounded-lg p-8 text-black relative">
              <h2 className="text-2xl font-black mb-6">{t('formTitle')}</h2>
              
              {/* Error Notification */}
              {showError && (
                <div className="mb-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 animate-slide-in">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('errorTitle')}</p>
                    <p className="text-sm">{t('errorMessage')}</p>
                  </div>
                  <button 
                    onClick={() => setShowError(false)}
                    className="ml-4 hover:bg-red-600 rounded p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Success Notification */}
              {showNotification && (
                <div className="mb-6 bg-[#38B6FF] text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 animate-slide-in">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('successTitle')}</p>
                    <p className="text-sm">{t('successMessage')}</p>
                  </div>
                  <button 
                    onClick={() => setShowNotification(false)}
                    className="ml-4 hover:bg-[#2FA5EE] rounded p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Company name */}
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold mb-2">
                    {t('companyName')}
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Contact name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t('contactName')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder={t('firstName')}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder={t('lastName')}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                    />
                  </div>
                </div>

                {/* Email address */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">
                    {t('emailAddress')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold mb-2">
                    {t('message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] resize-none"
                  />
                </div>

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors"
                  >
                    {t('submitButton')}
                  </button>
                </div>
              </form>
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
