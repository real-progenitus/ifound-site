import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import MobileNav from '../../components/MobileNav';
import PageFooter from '../../components/PageFooter';

export default function Privacy() {
  const t = useTranslations('privacy');
  const nav = useTranslations('nav');

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: nav('aboutUs') },
          { href: '/partner', label: nav('becomePartner') }
        ]} />

        {/* Desktop Logo */}
        <Link href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</Link>
          <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('aboutUs')}</Link>
          <Link href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('becomePartner')}</Link>

        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-2">{t('title')}</h1>
            <p className="text-sm mb-6">{t('lastUpdated')}: June 28, 2025</p>
            <div className="text-lg leading-relaxed space-y-6">
              <div>
                <p>{t('intro')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('infoCollection')}</h2>
                <p>{t('infoCollectionText')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('howWeUse')}</h2>
                <p>{t('howWeUseText')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('dataSharing')}</h2>
                <p>{t('dataSharingText')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('security')}</h2>
                <p>{t('securityText')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('yourRights')}</h2>
                <p>{t('yourRightsText')}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('contact')}</h2>
                <p>{t('contactText')}</p>
              </div>
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
