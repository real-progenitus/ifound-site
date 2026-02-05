import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import MobileNav from '../components/MobileNav';
import {useTranslations} from 'next-intl';
import {Link} from '@/routing';
import PageFooter from '../components/PageFooter';

export default function Home() {
  const t = useTranslations('home');
  const nav = useTranslations('nav');

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[600px]:block min-[600px]:relative transition-all duration-500 ease-in-out pb-16">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/about', label: nav('aboutUs') },
          { href: '/privacy', label: nav('privacyPolicy') },
          { href: '/partner', label: nav('becomePartner') }
        ]} />

        {/* Desktop Logo */}
        <Link href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-center gap-1">
          <img src="/favicon.png" alt="Logo" width={80} height={80} className="object-contain" />
          <span className="text-white text-3xl font-semibold">ifound</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-center">
          <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('aboutUs')}</Link>
          <Link href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('privacyPolicy')}</Link>
          <Link href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('becomePartner')}</Link>
        </div>

        {/* Mobile Content */}
        <main className="pt-10 pb-4 flex-1 flex flex-col justify-center min-[600px]:hidden transition-all duration-500 ease-in-out">
          <div className="text-left w-full mx-auto px-14 transition-all duration-500 ease-in-out">
            <h1 className="font-black leading-tight text-white uppercase text-3xl transition-all duration-500 ease-in-out">
              {t('title')}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/90 max-w-xs">
              {t('description')}
            </p>
            <div className="flex flex-row gap-3 text-sm font-semibold mt-6 justify-center items-center">
              <a href="https://apps.apple.com/us/app/ifound/id6470928381" target="_blank" rel="noopener noreferrer" className="flex h-12 w-[140px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
                <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm leading-none">{t('appStore')}</span>
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.progenitus.ifound" target="_blank" rel="noopener noreferrer" className="flex h-12 w-[140px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
                <FontAwesomeIcon icon={faGooglePlay} className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm leading-none">{t('googlePlay')}</span>
              </a>
            </div>
          </div>
        </main>

        {/* Mobile Phone Image */}
        <div className="flex justify-center pb-4 min-[600px]:hidden transition-all duration-500 ease-in-out">
          <div className="w-full mx-auto px-4 transition-all duration-500 ease-in-out">
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
                {t('title')}
              </h1>
              <p className="max-w-md text-xs min-[500px]:text-sm min-[600px]:text-base md:text-lg lg:text-xl leading-5 min-[500px]:leading-6 min-[600px]:leading-7 md:leading-8 text-white/90 mt-3 min-[500px]:mt-4 min-[600px]:mt-5 md:mt-6">
                {t('description')}
              </p>
              <div className="flex flex-row gap-2 min-[500px]:gap-3 min-[600px]:gap-4 text-xs min-[500px]:text-sm min-[600px]:text-base font-semibold mt-5 min-[500px]:mt-6 min-[600px]:mt-7 md:mt-8 justify-start">
                <a href="https://apps.apple.com/us/app/ifound/id6470928381" target="_blank" rel="noopener noreferrer" className="flex h-10 min-[500px]:h-11 min-[600px]:h-12 md:h-14 px-4 min-[500px]:px-5 min-[600px]:px-6 items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
                  <FontAwesomeIcon icon={faApple} className="h-4 min-[500px]:h-5 min-[600px]:h-6 flex-shrink-0 -mt-0.5" />
                  <span className="leading-none">{t('appStore')}</span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.progenitus.ifound" target="_blank" rel="noopener noreferrer" className="flex h-10 min-[500px]:h-11 min-[600px]:h-12 md:h-14 px-4 min-[500px]:px-5 min-[600px]:px-6 items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
                  <FontAwesomeIcon icon={faGooglePlay} className="h-3 min-[500px]:h-4 min-[600px]:h-5 flex-shrink-0" />
                  <span className="leading-none">{t('googlePlay')}</span>
                </a>
              </div>
            </div>

            <div className="flex justify-center items-center flex-shrink min-w-0 transition-all duration-500 ease-in-out pt-16">
              <img src="/final.png" alt="Final" width={600} height={600} className="w-full max-w-[280px] min-[500px]:max-w-[350px] min-[600px]:max-w-[420px] md:max-w-[550px] lg:max-w-[650px] xl:max-w-[750px] 2xl:max-w-[850px] h-auto object-contain drop-shadow-2xl transition-all duration-500 ease-in-out" />
            </div>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
