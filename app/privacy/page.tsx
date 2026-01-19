import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function Privacy() {
  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out pb-16">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About us' },
          { href: '/partner', label: 'Become a Partner' }
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
          <a href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">Become a Partner</a>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-2">Privacy<br />Policy</h1>
            <p className="text-sm mb-6">Last updated: June 28, 2025</p>
            <div className="text-lg leading-relaxed space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">1. Introduction</h2>
                <p>
                  Welcome to iFound. We are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and handle your information when you use our services.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">2. Information We Collect</h2>
                <p className="mb-2">
                  When you visit our website, we may collect certain information automatically including:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Device information</li>
                  <li>Log and usage data</li>
                  <li>Location data</li>
                </ul>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">3. How We Use Your Information</h2>
                <p className="mb-2">
                  We use the information we collect for various purposes including:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>To provide and maintain our service</li>
                  <li>To notify you about changes to our service</li>
                  <li>To provide customer support</li>
                  <li>To gather analysis or valuable information to improve our service</li>
                </ul>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">4. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us through{' '}
                  <a href="mailto:support@ifound.tech" className="underline hover:text-white/80">
                    support@ifound.tech
                  </a>
                </p>
              </div>
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
