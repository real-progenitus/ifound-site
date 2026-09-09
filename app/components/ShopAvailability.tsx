'use client';

import { createContext, useContext } from 'react';
import type { ShopEnvironment } from '@/lib/shop-env';

/**
 * Carries the shop's availability and environment from the root layout down to
 * the nav and the buy form.
 *
 * The flag lives in Firestore and can only be read server-side through
 * firebase-admin, but the nav is rendered inside pages that are client
 * components (the partner form and the FAQ accordion). Importing the reader
 * into the nav therefore dragged firebase-admin into the browser bundle.
 *
 * Pushing the resolved values down from the layout keeps the single server-side
 * read and lets the nav stay a client component that both kinds of page can
 * render.
 */
interface ShopAvailability {
  enabled: boolean;
  environment: ShopEnvironment;
}

const ShopAvailabilityContext = createContext<ShopAvailability>({
  enabled: false,
  environment: 'production',
});

export function ShopAvailabilityProvider({
  enabled,
  environment,
  children,
}: ShopAvailability & { children: React.ReactNode }) {
  return (
    <ShopAvailabilityContext.Provider value={{ enabled, environment }}>
      {children}
    </ShopAvailabilityContext.Provider>
  );
}

/** False unless the layout said otherwise, so a missing provider hides the shop. */
export function useShopEnabled(): boolean {
  return useContext(ShopAvailabilityContext).enabled;
}

/** Production unless the layout said otherwise, so QA is never assumed. */
export function useShopEnvironment(): ShopEnvironment {
  return useContext(ShopAvailabilityContext).environment;
}
