import MobileNav from '../../components/MobileNav';
import {useTranslations} from 'next-intl';
import {Link} from '@/routing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function About() {
  const t = useTranslations('about');
  const nav = useTranslations('nav');

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/privacy', label: nav('privacyPolicy') },
          { href: '/partner', label: nav('becomePartner') }
        ]} />

        {/* Desktop Logo */}
        <Link href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-center">
          <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</Link>
          <Link href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('privacyPolicy')}</Link>
          <Link href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('becomePartner')}</Link>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-12">{t('title')}</h1>
            <div className="text-lg leading-relaxed space-y-4 text-justify">
              <p>
                {t('p1')} <strong>{t('p1Bold')}</strong>
              </p>
              <p>
                {t('p2Start')} <strong>{t('p2Bold')}</strong>
              </p>
              <p>
                {t('p3Start')} <strong>{t('p3Bold')}</strong>{t('p3End')}
              </p>
              <p>
                {t('p4')}
              </p>
              <p>
                {t('p5')}
              </p>
              <p className="font-semibold">
                <strong>{t('p6')}</strong>
              </p>
              <p className="mt-8">
                {t('p7Start')} <strong>{t('p7AppStore')}</strong> {t('p7And')} <strong>{t('p7GooglePlay')}</strong>{t('p7End')}
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#2A2A2A] text-white py-2 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-3">
            {/* Logo and Info */}
            <div>
              <div className="flex flex-col items-start gap-2">
                <img src="/logopin.png" alt="Logo" width={80} height={80} className="object-contain" />
                <Link href="/" className="text-white text-3xl font-semibold">
                  ifound
                </Link>
                {/* Social Icons */}
                <div className="flex gap-4">
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="w-5 h-5 text-white" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faLinkedin} className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links and Support Container */}
            <div className="flex gap-16 items-start">
              {/* Quick Links Column 1 */}
              <div>
                <h3 className="text-white font-bold text-lg mb-3">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="text-white/70 hover:text-white transition-colors">
                    {nav('aboutUs')}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                    {nav('privacyPolicy')}
                  </Link>
                </li>
                <li>
                  <Link href="/partner" className="text-white/70 hover:text-white transition-colors">
                    {nav('becomePartner')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Quick Links Column 2 */}
            <div>
              <h3 className="text-white font-bold text-lg mb-3">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/contact" className="text-white/70 hover:text-white transition-colors">
                    {nav('contacts')}
                  </Link>
                </li>
                <li>
                  <Link href="/faqs" className="text-white/70 hover:text-white transition-colors">
                    {nav('faqs')}
                  </Link>
                </li>
              </ul>
            </div>
            </div>
          </div>
          {/* Copyright */}
          <div className="border-t border-white/20 pt-2 text-center">
            <p className="text-white/60 text-sm">© 2026 ifound. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
