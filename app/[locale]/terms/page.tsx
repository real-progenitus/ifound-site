import { getTranslations } from 'next-intl/server';
import SiteNav from '../../components/SiteNav';
import PageFooter from '../../components/PageFooter';

/**
 * Terms of sale for the shop.
 *
 * Required before the first order, not optional polish: an EU distance sale of
 * consumer goods has to set out who is selling, the total price including VAT,
 * delivery, the 14-day right of withdrawal with the model form, and the
 * two-year legal guarantee of conformity.
 *
 * NOTE: the seller-identity section points at the contact page rather than
 * naming a legal entity, because none is recorded anywhere in this codebase.
 * The registered company name, tax number and registered address must be filled
 * in before the shop is opened.
 */
export default async function TermsPage() {
  const [t, nav] = await Promise.all([getTranslations('terms'), getTranslations('nav')]);

  const sections: Array<{ title: string; body: string }> = [
    { title: t('sellerTitle'), body: t('sellerBody') },
    { title: t('productsTitle'), body: t('productsBody') },
    { title: t('pricesTitle'), body: t('pricesBody') },
    { title: t('deliveryTitle'), body: t('deliveryBody') },
    { title: t('withdrawalTitle'), body: t('withdrawalBody') },
    { title: t('withdrawalFormTitle'), body: t('withdrawalFormBody') },
    { title: t('guaranteeTitle'), body: t('guaranteeBody') },
    { title: t('complaintsTitle'), body: t('complaintsBody') },
    { title: t('contactTitle'), body: t('contactBody') },
  ];

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        <SiteNav
          align="start"
          links={[
            { href: '/', label: 'Home' },
            { href: '/privacy', label: nav('privacyPolicy') },
            { href: '/contact', label: nav('contacts') },
          ]}
        />

        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-4">
              {t('title')}
            </h1>
            <p className="text-sm opacity-80 mb-10">{t('lastUpdated')}</p>

            <div className="text-lg leading-relaxed space-y-8 text-justify">
              {sections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
