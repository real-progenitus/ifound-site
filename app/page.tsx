import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import MobileNav from './components/MobileNav';

export default function Home() {
  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[600px]:block min-[600px]:relative transition-all duration-500 ease-in-out pb-16">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/about', label: 'About us' },
          { href: '/privacy', label: 'Privacy Policy' },
          { href: '/partner', label: 'Become a Partner' }
        ]} />

        {/* Desktop Logo */}
        <a href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <a href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">About us</a>
          <a href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
          <a href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">Become a Partner</a>
        </div>

        {/* Mobile Content */}
        <main className="pt-10 pb-4 flex-1 flex flex-col justify-center min-[600px]:hidden transition-all duration-500 ease-in-out">
          <div className="text-left w-full max-w-[320px] mx-auto pl-10 pr-4 transition-all duration-500 ease-in-out">
            <h1 className="font-black leading-tight text-white uppercase text-3xl transition-all duration-500 ease-in-out">
              THE LOST AND<br />FOUND APP
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/90 max-w-xs">
              The general purpose lost and found app that changes the way you recover your lost items. Anywhere, anytime, with anyone.
            </p>
            <div className="flex flex-row gap-3 text-sm font-semibold mt-6 justify-start">
              <button className="flex h-12 w-[110px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
                <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
                <span className="text-sm leading-none">App Store</span>
              </button>
              <button className="flex h-12 w-[110px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
                <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm leading-none">Google Play</span>
              </button>
            </div>
          </div>
        </main>

        {/* Mobile Phone Image */}
        <div className="flex justify-center pb-4 min-[600px]:hidden transition-all duration-500 ease-in-out">
          <div className="w-full max-w-[320px] mx-auto px-4 transition-all duration-500 ease-in-out">
            <img
              src="/final.png"
              alt="App preview"
              width={360}
              height={360}
              className="w-full -mt-4 drop-shadow-2xl object-contain"
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden min-[600px]:block w-full min-h-screen relative overflow-hidden transition-all duration-500 ease-in-out">
          <div className="h-full min-h-screen flex items-center justify-between px-6 min-[500px]:px-8 md:px-12 lg:px-16 xl:px-20 gap-4 min-[500px]:gap-6 md:gap-8 lg:gap-12 xl:gap-16 max-w-[1600px] mx-auto transition-all duration-500 ease-in-out">
            <div className="text-left flex-1 max-w-[600px] z-10 flex-shrink-0 transition-all duration-500 ease-in-out">
              <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl xl:text-7xl transition-all duration-500 ease-in-out">
                THE LOST AND<br />FOUND APP
              </h1>
              <p className="max-w-md text-xs min-[500px]:text-sm min-[600px]:text-base md:text-lg lg:text-xl leading-5 min-[500px]:leading-6 min-[600px]:leading-7 md:leading-8 text-white/90 mt-3 min-[500px]:mt-4 min-[600px]:mt-5 md:mt-6">
                The general purpose lost and found app that changes the way you recover your lost items. Anywhere, anytime, with anyone.
              </p>
              <div className="flex flex-row gap-2 min-[500px]:gap-3 min-[600px]:gap-4 text-xs min-[500px]:text-sm min-[600px]:text-base font-semibold mt-5 min-[500px]:mt-6 min-[600px]:mt-7 md:mt-8 justify-start">
                <button className="flex h-10 min-[500px]:h-11 min-[600px]:h-12 md:h-14 w-[100px] min-[500px]:w-[110px] min-[600px]:w-[130px] md:w-[150px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
                  <FontAwesomeIcon icon={faApple} className="h-4 min-[500px]:h-5 min-[600px]:h-6 flex-shrink-0 -mt-0.5" />
                  <span className="leading-none">App Store</span>
                </button>
                <button className="flex h-10 min-[500px]:h-11 min-[600px]:h-12 md:h-14 w-[100px] min-[500px]:w-[110px] min-[600px]:w-[130px] md:w-[150px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
                  <FontAwesomeIcon icon={faGooglePlay} className="h-3 min-[500px]:h-4 min-[600px]:h-5 flex-shrink-0" />
                  <span className="leading-none">Google Play</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center items-center flex-shrink min-w-0 transition-all duration-500 ease-in-out pt-16">
              <img src="/final.png" alt="Final" width={600} height={600} className="w-full max-w-[280px] min-[500px]:max-w-[350px] min-[600px]:max-w-[420px] md:max-w-[550px] lg:max-w-[650px] xl:max-w-[750px] 2xl:max-w-[850px] h-auto object-contain drop-shadow-2xl transition-all duration-500 ease-in-out" />
            </div>
          </div>
        </div>
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
