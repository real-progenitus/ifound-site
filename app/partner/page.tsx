'use client';

import { useState } from 'react';
import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import PageFooter from '../components/PageFooter';

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
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      closeNotification();
    }, 5000);
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
          <form onSubmit={handleSubmit} className="max-w-2xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">
              Become a<br />Partner
            </h1>
            
            <div className="text-lg leading-relaxed space-y-4 mb-8">
              <p>
                Every day, people lose important things in public places and many of them are found by staff before their owners ever realize where to look.
              </p>
              <p className="font-semibold">
                Make your establishment part of the ifound community.
              </p>
              <p>
                Disco clubs, cafes, shopping malls, gyms, hotels, restaurants, and other public spaces can register their location on ifound and manage lost items digitally.
              </p>
              <p>
                Give visibility to your business and help those who need it most to recover what they&apos;ve lost.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Partner Application Form</h2>

              {/* Success Notification */}
              {showNotification && (
                <div className={`transition-all duration-300 ease-out ${isClosingNotification ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
                  <div className="bg-green-500 text-white px-6 py-4 rounded-lg flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Email sent successfully!</h3>
                      <p className="text-sm">We&apos;ll get back to you soon.</p>
                    </div>
                    <button
                      onClick={closeNotification}
                      className="text-white hover:text-white/80 text-2xl leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {showError && (
                <div className={`transition-all duration-300 ease-out ${isClosingError ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
                  <div className="bg-red-500 text-white px-6 py-4 rounded-lg flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Please fill in all fields</h3>
                      <p className="text-sm">All fields are required to submit the form.</p>
                    </div>
                    <button
                      onClick={closeError}
                      className="text-white hover:text-white/80 text-2xl leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Company name: <span className="text-red-300">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  onChange={() => handleFieldChange('company')}
                  className={`w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white ${emptyFields.includes('company') ? 'bg-red-100' : 'bg-white/90'}`}
                  placeholder="Your company name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Contact name: <span className="text-red-300">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    onChange={() => handleFieldChange('firstName')}
                    className={`w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white ${emptyFields.includes('firstName') ? 'bg-red-100' : 'bg-white/90'}`}
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 opacity-0">
                    Last name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    onChange={() => handleFieldChange('lastName')}
                    className={`w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white ${emptyFields.includes('lastName') ? 'bg-red-100' : 'bg-white/90'}`}
                    placeholder="Last"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email address: <span className="text-red-300">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  onChange={() => handleFieldChange('email')}
                  className={`w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white ${emptyFields.includes('email') ? 'bg-red-100' : 'bg-white/90'}`}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Message: <span className="text-red-300">*</span>
                </label>
                <textarea
                  name="message"
                  onChange={() => handleFieldChange('message')}
                  rows={5}
                  className={`w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white resize-none ${emptyFields.includes('message') ? 'bg-red-100' : 'bg-white/90'}`}
                  placeholder="Tell us about your business..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-black/80 transition-colors"
              >
                Submit Application
              </button>
            </div>
          </form>
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
