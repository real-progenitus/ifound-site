import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import SiteNav from '../../components/SiteNav';
import PageFooter from '../../components/PageFooter';
import ShopQaToggle from '../../components/ShopQaToggle';
import { getShopConfig } from '@/lib/shop-config';
import { SHOP_QA_COOKIE, resolveShopEnvironment } from '@/lib/shop-env';
import ShopClient from './ShopClient';

/**
 * The iFound Tag shop.
 *
 * A server component so the catalogue is read through firebase-admin — the site
 * is unauthenticated and Dynamic/shop_config is not publicly readable. Prices
 * therefore never come from the browser, and the checkout route recomputes them
 * anyway before charging anything.
 *
 * A closed shop renders a "coming soon" state rather than a 404: SiteNav drops
 * the link when the shop is off, so anyone landing here followed an old link or
 * a bookmark, and a dead end serves them worse than a sentence explaining it.
 */
export default async function ShopPage() {
  // The hidden 12-tap gesture below flips this, so a tester gets the QA
  // catalogue and the Stripe test key on the live site.
  const cookieStore = await cookies();
  const environment = resolveShopEnvironment(cookieStore.get(SHOP_QA_COOKIE)?.value);

  const [t, nav, config] = await Promise.all([
    getTranslations('shop'),
    getTranslations('nav'),
    getShopConfig(environment),
  ]);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: nav('aboutUs') },
    { href: '/faqs', label: nav('faqs') },
  ];

  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const shipsToLabel = config.shopCountries
    .map((cc) => {
      try {
        return countryNames.of(cc) ?? cc;
      } catch {
        return cc;
      }
    })
    .join(', ');

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        <SiteNav align="start" links={links} />

        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">
              {t('title')}
            </h1>
            <p className="text-lg leading-relaxed mb-2">{t('tagline')}</p>
            {/* Also the hidden QA switch: 12 taps flips the whole page to the
                QA catalogue and the Stripe test key. Looks and reads as an
                ordinary line of text. */}
            <ShopQaToggle active={environment === 'qa'}>
              <span className="text-base opacity-90">{t('worksWith')}</span>
            </ShopQaToggle>

            {environment === 'qa' && (
              <p className="mt-4 inline-block rounded bg-black/30 px-3 py-1 text-sm font-semibold">
                QA mode. Test cards only, orders go to QA_ShopOrders.
              </p>
            )}

            <div className="mt-10 flex flex-col min-[600px]:flex-row gap-8 items-start">
              <img
                src="/ifound-tag.jpeg"
                alt={t('title')}
                width={320}
                height={320}
                className="w-full max-w-[320px] mx-auto min-[600px]:mx-0 rounded-2xl bg-white object-contain"
              />
              <div className="text-base leading-relaxed space-y-4">
                <p>{t('description')}</p>
                <dl className="space-y-1">
                  {[
                    [t('specSize'), t('specSizeValue')],
                    [t('specBattery'), t('specBatteryValue')],
                    [t('specDelivery'), t('specDeliveryValue')],
                    [t('specShipping'), t('specShippingValue')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="font-semibold min-w-[104px]">{label}</dt>
                      <dd className="opacity-90">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {config.shopEnabled && config.shopCountries.length > 0 ? (
              <ShopClient
                packs={config.packs}
                accessoryEnabled={config.accessoryEnabled}
                accessoryPriceCents={config.accessoryPriceCents}
                accessoryShowImage={config.accessoryShowImage}
                shippingCents={config.shippingCents}
                currency={config.currency}
                shipsToLabel={shipsToLabel}
              />
            ) : (
              <div className="mt-12 bg-white rounded-lg p-8 text-black">
                <h2 className="text-2xl font-black mb-3">{t('comingSoonTitle')}</h2>
                <p className="text-base">{t('comingSoonBody')}</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
