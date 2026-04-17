import { useTranslations } from 'next-intl';
import { Link } from '@/routing';
import MobileNav from '../../components/MobileNav';
import PageFooter from '../../components/PageFooter';
import Logo from '../../components/Logo';

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
        <Logo className="hidden min-[600px]:flex absolute top-4 left-8 z-10" />

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

      <PageFooter />
    </div>
  );
}
