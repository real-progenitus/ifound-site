import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import {
  SHOP_QA_COOKIE,
  resolveShopEnvironment,
  shopCollection,
} from '@/lib/shop-env';
import SiteNav from '../../../components/SiteNav';
import PageFooter from '../../../components/PageFooter';
import { db } from '@/lib/firebase-admin';
import { createLogger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';

const log = createLogger('shop-success');

/**
 * Where Stripe returns a buyer after a successful payment.
 *
 * Deliberately does NOT wait for the order to reach `paid` in Firestore. That
 * flip is the webhook's, and it can land a second or two after the redirect —
 * showing an error because our own bookkeeping has not caught up would be
 * wrong and alarming. Stripe saying the session is paid is the fact that
 * matters to the person reading this page.
 */
export default async function ShopSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const [t, nav, params, cookieStore] = await Promise.all([
    getTranslations('shop'),
    getTranslations('nav'),
    searchParams,
    cookies(),
  ]);

  // A QA checkout was paid with the test key, so the session can only be read
  // back with that same key and the order only exists in QA_ShopOrders.
  const environment = resolveShopEnvironment(cookieStore.get(SHOP_QA_COOKIE)?.value);

  let orderId: string | null = null;
  let paid = false;

  const sessionId = params.session_id;
  if (sessionId) {
    try {
      const session = await stripe(environment).checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid';
      orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId : null;

      // Only a convenience lookup, to show the buyer a reference they can quote.
      if (!orderId) {
        const snap = await db()
          .collection(shopCollection('ShopOrders', environment))
          .where('stripe.checkoutSessionId', '==', sessionId)
          .limit(1)
          .get();
        orderId = snap.empty ? null : (snap.docs[0].data().orderId ?? null);
      }
    } catch (error) {
      log.error('could not resolve checkout session', error);
    }
  }

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        <SiteNav
          align="start"
          links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: nav('aboutUs') },
            { href: '/faqs', label: nav('faqs') },
          ]}
        />

        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-2xl text-white w-full">
            <div className="bg-white rounded-lg p-8 text-black">
              <h1 className="text-2xl font-black mb-4">
                {paid ? t('successTitle') : t('errorGeneric')}
              </h1>
              {paid ? (
                <>
                  <p className="text-base leading-relaxed mb-4">{t('successBody')}</p>
                  {orderId && (
                    <p className="text-sm text-gray-600 mb-4">
                      {t('orderReference')}:{' '}
                      <span className="font-mono">{orderId}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">{t('successEmailNote')}</p>
                </>
              ) : (
                <p className="text-base leading-relaxed">{t('cancelled')}</p>
              )}
              <Link
                href="/"
                className="inline-block mt-6 px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors"
              >
                {t('backHome')}
              </Link>
            </div>
          </div>
        </main>
      </div>
      <PageFooter />
    </div>
  );
}
