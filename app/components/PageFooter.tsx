import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faInstagram, faLinkedin, faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';

export default function PageFooter() {
  return (
    <footer className="w-full bg-[#2A2A2A] text-white px-6 md:px-12 lg:px-16 py-8 md:py-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-0">
              <img src="/favicon.png" alt="Logo" width={80} height={80} className="object-contain" />
              <a href="/" className="text-white text-xl font-semibold">
                ifound
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Quick Links */}
            <div className="text-center">
              <h3 className="text-white font-bold text-sm mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/about" className="text-white/70 hover:text-white transition-colors text-xs">
                    About us
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-white/70 hover:text-white transition-colors text-xs">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/partner" className="text-white/70 hover:text-white transition-colors text-xs">
                    Become a Partner
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center">
              <h3 className="text-white font-bold text-sm mb-3">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/contact" className="text-white/70 hover:text-white transition-colors text-xs">
                    Contacts
                  </a>
                </li>
                <li>
                  <a href="/faqs" className="text-white/70 hover:text-white transition-colors text-xs">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-white font-bold text-sm">Follow Us</h3>
            <div className="flex gap-3">
              <a 
                href="https://www.facebook.com/p/IFound-61578119646465/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faFacebook} className="w-5 h-5 text-white" />
              </a>
              <a 
                href="https://www.instagram.com/ifound__app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-5 h-5 text-white" />
              </a>
              <a 
                href="https://www.linkedin.com/company/ifoundapp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faLinkedin} className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* App Store Buttons */}
          <div className="flex flex-col gap-2 items-center">
            <a href="https://apps.apple.com/us/app/ifound/id6470928381" target="_blank" rel="noopener noreferrer" className="flex h-11 w-full max-w-[150px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
              <FontAwesomeIcon icon={faApple} className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium leading-none">App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.progenitus.ifound" target="_blank" rel="noopener noreferrer" className="flex h-11 w-full max-w-[150px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
              <FontAwesomeIcon icon={faGooglePlay} className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium leading-none">Google Play</span>
            </a>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-4 gap-6 lg:gap-10 items-start">
          {/* Logo and ifound */}
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-col items-center gap-0">
              <img src="/favicon.png" alt="Logo" width={60} height={60} className="object-contain" />
              <a href="/" className="text-white text-2xl font-semibold">
                ifound
              </a>
            </div>
          </div>

          {/* Quick Links and Support */}
          <div className="flex gap-10 justify-start">
            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2">Quick Links</h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="/about" className="text-white/70 hover:text-white transition-colors text-sm">
                    About us
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-white/70 hover:text-white transition-colors text-sm">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/partner" className="text-white/70 hover:text-white transition-colors text-sm">
                    Become a Partner
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2">Support</h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="/contact" className="text-white/70 hover:text-white transition-colors text-sm">
                    Contacts
                  </a>
                </li>
                <li>
                  <a href="/faqs" className="text-white/70 hover:text-white transition-colors text-sm">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex flex-col items-start gap-2">
            <h3 className="text-white font-bold text-sm mb-1">Follow Us</h3>
            <div className="flex gap-2.5">
              <a 
                href="https://www.facebook.com/p/IFound-61578119646465/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faFacebook} className="w-4 h-4 text-white" />
              </a>
              <a 
                href="https://www.instagram.com/ifound__app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-4 h-4 text-white" />
              </a>
              <a 
                href="https://www.linkedin.com/company/ifoundapp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faLinkedin} className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* App Store Buttons */}
          <div className="flex flex-col gap-2.5 items-start justify-start">
            <a href="https://apps.apple.com/us/app/ifound/id6470928381" target="_blank" rel="noopener noreferrer" className="flex h-12 w-[135px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
              <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
              <span className="text-sm font-medium leading-none">App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.progenitus.ifound" target="_blank" rel="noopener noreferrer" className="flex h-12 w-[135px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
              <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium leading-none">Google Play</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-6 md:mt-4 pt-3 md:pt-2.5 text-center">
          <p className="text-white/50 text-xs">&copy; 2026 ifound. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
