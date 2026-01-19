import {useTranslations} from 'next-intl';
import {Link} from '@/routing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function Footer() {
  const nav = useTranslations('nav');

  return (
    <footer className="w-full bg-[#2A2A2A] text-white min-h-[220px] px-6 md:px-12 lg:px-16">
      <div className="max-w-[1400px] mx-auto h-full flex flex-col justify-between py-4">
        <div className="grid grid-cols-3 gap-12">
          {/* Logo and Info */}
          <div className="flex flex-col items-start gap-3">
            <img src="/logopin.png" alt="Logo" width={80} height={80} className="object-contain" />
            <Link href="/" className="text-white text-3xl font-semibold">
              ifound
            </Link>
            {/* Social Icons */}
            <div className="flex gap-3 mt-2">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-5 h-5 text-white" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faLinkedin} className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links and Support - Middle Column */}
          <div className="flex gap-12 justify-center items-start self-center">
            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="text-white/60 hover:text-white transition-colors text-base">
                    {nav('aboutUs')}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-white/60 hover:text-white transition-colors text-base">
                    {nav('privacyPolicy')}
                  </Link>
                </li>
                <li>
                  <Link href="/partner" className="text-white/60 hover:text-white transition-colors text-base">
                    {nav('becomePartner')}
                  </Link>
                </li>
              </ul>
            </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2.5">
                <li>
                  <Link href="/contact" className="text-white/60 hover:text-white transition-colors text-base">
                    {nav('contacts')}
                  </Link>
                </li>
                <li>
                  <Link href="/faqs" className="text-white/60 hover:text-white transition-colors text-base">
                    {nav('faqs')}
                  </Link>
                </li>
            </ul>
          </div>
          </div>

          {/* Empty Column */}
          <div></div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-2 text-center">
          <p className="text-white/50 text-sm">© 2026 ifound. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
