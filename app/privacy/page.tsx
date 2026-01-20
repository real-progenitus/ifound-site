import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import PageFooter from '../components/PageFooter';

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
                  <a href="mailto:support@ifound.tech" className="text-[#1f3577] underline hover:text-[#1f3577]/80 text-lg">
                    support@ifound.tech
                  </a>
                </p>
              </div>
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
