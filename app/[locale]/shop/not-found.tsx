import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import SiteNav from '../../components/SiteNav';
import PageFooter from '../../components/PageFooter';
import { getShopConfig } from '@/lib/shop-config';

/**
 * Rendered when the shop page calls notFound() for a visitor outside the
 * countries we ship to.
 *
 * A dedicated file rather than markup inside page.tsx, for the same reason as
 * profile/[uid]/not-found.tsx: going through notFound() gives a genuine 404, so
 * the shop is not served there in any sense a crawler or cache would honour,
 * while the visitor still gets a sentence explaining why instead of the bare
 * framework error page.
 *
 * It names the countries we do ship to. Someone travelling, or on a VPN, can
 * then see immediately why the page is missing rather than assuming it is
 * broken.
 */
export default async function ShopNotAvailable() {
  const [t, nav, config] = await Promise.all([
    getTranslations('shop'),
    getTranslations('nav'),
    getShopConfig(),
  ]);

  let countries = config.shopCountries.join(', ');
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    countries = config.shopCountries.map((cc) => names.of(cc) ?? cc).join(', ');
  } catch {
    /* fall back to the codes */
  }

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        <SiteNav
          links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: nav('aboutUs') },
            { href: '/contact', label: nav('contacts') },
          ]}
        />
        <main className="flex items-center justify-center min-h-screen p-8">
          <div className="max-w-xl text-center text-white">
            <h1 className="text-3xl min-[600px]:text-4xl font-black mb-4">
              {t('unavailableTitle')}
            </h1>
            <p className="text-lg mb-8 opacity-90">
              {countries ? t('unavailableBody', { countries }) : t('unavailableBodyNoList')}
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-[#38B6FF] font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
            >
              {t('backHome')}
            </Link>
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
