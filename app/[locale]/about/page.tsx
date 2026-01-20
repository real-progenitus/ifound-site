import MobileNav from '../../components/MobileNav';
import {useTranslations} from 'next-intl';
import {Link} from '@/routing';
import PageFooter from '../../components/PageFooter';

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
            <div className="text-lg leading-relaxed space-y-6 text-justify">
              <p>
                {t('intro')}
              </p>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">{t('gettingStartedTitle')}</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>{t('gettingStarted1')}</li>
                  <li>{t('gettingStarted2')}</li>
                  <li>{t('gettingStarted3')}</li>
                  <li>{t('gettingStarted4')}</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">{t('reportingLostTitle')}</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>{t('reportingLost1')}</li>
                  <li>{t('reportingLost2')}</li>
                  <li>{t('reportingLost3')}</li>
                  <li>{t('reportingLost4')}</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">{t('findingLostTitle')}</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>{t('findingLost1')}</li>
                  <li>{t('findingLost2')}</li>
                  <li>{t('findingLost3')}</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">{t('tipsTitle')}</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>{t('tips1')}</li>
                  <li>{t('tips2')}</li>
                  <li>{t('tips3')}</li>
                  <li>{t('tips4')}</li>
                </ol>
              </div>

              <p className="mt-8">
                {t('conclusion')}
              </p>
            </div>
          </div>
        </main>
      </div>

      <PageFooter />
    </div>
  );
}
