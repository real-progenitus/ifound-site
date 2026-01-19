'use client';

import { useState } from 'react';
import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function Partner() {
  const [showNotification, setShowNotification] = useState(false);
  const [showError, setShowError] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [isClosingNotification, setIsClosingNotification] = useState(false);
  const [isClosingError, setIsClosingError] = useState(false);

  const handleFieldChange = (fieldName: string) => {
    if (emptyFields.includes(fieldName)) {
      setEmptyFields(emptyFields.filter(field => field !== fieldName));
    }
  };

  const closeNotification = () => {
    setIsClosingNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setIsClosingNotification(false);
    }, 300);
  };

  const closeError = () => {
    setIsClosingError(true);
    setTimeout(() => {
      setShowError(false);
      setIsClosingError(false);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const company = formData.get('company') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;
    
    // Check which fields are empty
    const emptyFieldsList: string[] = [];
    if (!company) emptyFieldsList.push('company');
    if (!firstName) emptyFieldsList.push('firstName');
    if (!lastName) emptyFieldsList.push('lastName');
    if (!email) emptyFieldsList.push('email');
    if (!message) emptyFieldsList.push('message');
    
    // Validate all fields are filled
    if (emptyFieldsList.length > 0) {
      setEmptyFields(emptyFieldsList);
      setShowError(true);
      setTimeout(() => {
        closeError();
        setEmptyFields([]);
      }, 10000);
      return;
    }
    
    // Show success notification
    setShowNotification(true);
    
    // Clear the form
    e.currentTarget.reset();
    
    // Hide notification after 10 seconds
    setTimeout(() => {
      closeNotification();
    }, 10000);
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
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">Become a<br />partner<br />with<br />ifound</h1>
            <div className="text-lg leading-relaxed space-y-4">
              <p>
                Every day, people lose important things in public places and many of them are found by staff before their owners ever realize where to look.
              </p>
              <p>
                Make your establishment part of the ifound community.
              </p>
              <p>
                Disco clubs, cafés, shopping malls, gyms, hotels, restaurants, and other public spaces can register their location on ifound and manage lost items digitally.
              </p>
              <p>Give visibility to your bussiness and help those who need it most to recover what they've lost.</p>
            </div>

            {/* Partner Form */}
            <div className="mt-12 bg-white rounded-lg p-8 text-black relative">
              <h2 className="text-2xl font-black mb-6">Partner Application Form</h2>
              
              {/* Error Notification */}
              {showError && (
                <div className={`mb-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 ${
                  isClosingError ? 'animate-slide-out' : 'animate-slide-in'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold">Please fill in all fields</p>
                    <p className="text-sm">All fields are required to submit the form.</p>
                  </div>
                  <button 
                    onClick={closeError}
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
                <div className={`mb-6 bg-[#38B6FF] text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 ${
                  isClosingNotification ? 'animate-slide-out' : 'animate-slide-in'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold">Email sent successfully!</p>
                    <p className="text-sm">We'll get back to you soon.</p>
                  </div>
                  <button 
                    onClick={closeNotification}
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
                    Company name:
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    onChange={() => handleFieldChange('company')}
                    className={`w-full px-4 py-3 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] transition-all ${
                      emptyFields.includes('company') ? '!bg-red-500/15 animate-flash-red' : 'bg-gray-100'
                    }`}
                  />
                </div>

                {/* Contact name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Contact name:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First"
                      onChange={() => handleFieldChange('firstName')}
                      className={`w-full px-4 py-3 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] transition-all ${
                        emptyFields.includes('firstName') ? '!bg-red-500/15 animate-flash-red' : 'bg-gray-100'
                      }`}
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last"
                      onChange={() => handleFieldChange('lastName')}
                      className={`w-full px-4 py-3 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] transition-all ${
                        emptyFields.includes('lastName') ? '!bg-red-500/15 animate-flash-red' : 'bg-gray-100'
                      }`}
                    />
                  </div>
                </div>

                {/* Email address */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">
                    Email address:
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    onChange={() => handleFieldChange('email')}
                    className={`w-full px-4 py-3 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] transition-all ${
                      emptyFields.includes('email') ? '!bg-red-500/15 animate-flash-red' : 'bg-gray-100'
                    }`}
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold mb-2">
                    Message:
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    onChange={() => handleFieldChange('message')}
                    className={`w-full px-4 py-3 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] resize-none transition-all ${
                      emptyFields.includes('message') ? '!bg-red-500/15 animate-flash-red' : 'bg-gray-100'
                    }`}
                  />
                </div>

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
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
