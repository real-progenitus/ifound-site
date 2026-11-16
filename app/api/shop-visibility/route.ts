import { NextRequest, NextResponse } from 'next/server';
import { getShopConfig } from '@/lib/shop-config';
import { SHOP_QA_COOKIE, resolveShopEnvironment } from '@/lib/shop-env';
import { geoHeaderExpected, mayViewShop, visitorCountry } from '@/lib/shop-geo';

/**
 * Whether this visitor's nav should show the Shop link, and which shop
 * environment they are in.
 *
 * This used to be decided in the root layout, which made every page on the
 * site render on the server for every visit. The pages are now prebuilt and
 * the nav asks here once per page load instead (see ShopAvailability.tsx).
 *
 * Same rule as the /shop page itself (mayViewShop, Google's crawlers
 * included), so the link only appears where it leads somewhere. The shop page
 * and the checkout route still enforce their own gates; this only decides a
 * link.
 *
 * No rate-limit guard: the answer depends only on the caller's own country,
 * cookie and user agent, and the config read behind it is cached in memory
 * (getShopConfig), so a flood here costs no Firestore reads.
 *
 * `private` keeps the CDN from caching one visitor's answer for another. The
 * client adds `?qa=0|1` so flipping the QA cookie misses the browser cache.
 */
export async function GET(request: NextRequest) {
  const environment = resolveShopEnvironment(request.cookies.get(SHOP_QA_COOKIE)?.value);
  const shop = await getShopConfig(environment);
  const enabled =
    shop.shopEnabled &&
    mayViewShop({
      shopCountries: shop.shopCountries,
      country: visitorCountry(request.headers),
      environment,
      headerExpected: geoHeaderExpected(),
      userAgent: request.headers.get('user-agent'),
    });

  return NextResponse.json(
    { enabled, environment },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}
