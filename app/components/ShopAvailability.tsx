'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SHOP_QA_COOKIE, type ShopEnvironment } from '@/lib/shop-env';
import { createLogger } from '@/lib/logger';

const log = createLogger('shop-availability');

/**
 * Carries the shop's availability and environment down to the nav.
 *
 * The answer depends on the visitor (country, QA cookie, user agent) and on
 * the Firestore shop config, which only the server can read. It used to be
 * resolved in the root layout, but a layout that reads request data makes
 * every page beneath it render on the server per visit, so the whole site lost
 * its static pages to one nav link (and ran out of Vercel CPU, November 2026).
 *
 * The pages are now prebuilt and this provider asks /api/shop-visibility once
 * per page load instead. The Shop link therefore appears a moment after the
 * page does. Client-side navigations keep the provider mounted, so they do not
 * ask again, and the browser caches the answer for five minutes.
 *
 * Until the answer arrives, and if the request fails, the shop is hidden: the
 * same fail-closed default as before.
 */
interface ShopAvailability {
  enabled: boolean;
  environment: ShopEnvironment;
}

const HIDDEN: ShopAvailability = { enabled: false, environment: 'production' };

const ShopAvailabilityContext = createContext<ShopAvailability>(HIDDEN);

function qaCookieSet(): boolean {
  return document.cookie
    .split('; ')
    .some((entry) => entry === `${SHOP_QA_COOKIE}=1`);
}

export function ShopAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<ShopAvailability>(HIDDEN);

  useEffect(() => {
    let cancelled = false;
    // The query string only varies the browser-cache key, so turning QA on or
    // off with the hidden toggle is picked up straight away.
    fetch(`/api/shop-visibility?qa=${qaCookieSet() ? 1 : 0}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<ShopAvailability> | null) => {
        if (cancelled || !data) return;
        setValue({
          enabled: data.enabled === true,
          environment: data.environment === 'qa' ? 'qa' : 'production',
        });
      })
      .catch((error) => {
        log.warn('shop visibility check failed', { error: String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ShopAvailabilityContext.Provider value={value}>
      {children}
    </ShopAvailabilityContext.Provider>
  );
}

/** False until the server says otherwise, so a failed check hides the shop. */
export function useShopEnabled(): boolean {
  return useContext(ShopAvailabilityContext).enabled;
}

/** Production unless the server said otherwise, so QA is never assumed. */
export function useShopEnvironment(): ShopEnvironment {
  return useContext(ShopAvailabilityContext).environment;
}
