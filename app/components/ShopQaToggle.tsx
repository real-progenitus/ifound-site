'use client';

import { useRef, useState } from 'react';
import { useRouter } from '@/routing';
import { SHOP_QA_COOKIE, SHOP_QA_COOKIE_MAX_AGE } from '@/lib/shop-env';

/**
 * Hidden QA switch for the shop.
 *
 * Tapping the wrapped element 12 times in quick succession flips the shop
 * between the live catalogue and the QA_* one, so a tester can exercise the
 * whole purchase against the production deployment without a separate site.
 * The same 12-tap gesture already exists on the cloakroom page, so testers only
 * have to learn it once.
 *
 * The choice is a cookie rather than localStorage, unlike the cloakroom's,
 * because the shop page is server-rendered: the server has to know which
 * catalogue to read before it renders any prices. Flipping it therefore needs a
 * router.refresh() to re-run the server render.
 *
 * The wrapped element keeps looking and behaving exactly as it did. Nothing
 * about this is discoverable by an ordinary visitor.
 */
const TAPS_TO_TOGGLE = 12;
const TAP_RESET_MS = 1500;

export default function ShopQaToggle({
  active,
  children,
}: {
  /** Whether QA mode is currently on, as resolved on the server. */
  active: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [taps, setTaps] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = () => {
    if (timer.current) clearTimeout(timer.current);
    const next = taps + 1;

    if (next < TAPS_TO_TOGGLE) {
      setTaps(next);
      timer.current = setTimeout(() => setTaps(0), TAP_RESET_MS);
      return;
    }

    setTaps(0);
    const enabling = !active;
    // Lax rather than Strict: a tester who follows the Stripe redirect back to
    // the success page must still be seen as being in QA.
    document.cookie = enabling
      ? `${SHOP_QA_COOKIE}=1; path=/; max-age=${SHOP_QA_COOKIE_MAX_AGE}; samesite=lax`
      : `${SHOP_QA_COOKIE}=; path=/; max-age=0; samesite=lax`;
    // The environment is read server-side, so the page has to render again.
    router.refresh();
  };

  return (
    // A plain span with a click handler, deliberately: no role, no tabIndex and
    // no button element, so assistive technology and keyboard users are never
    // offered a control that does nothing for them. It is NOT aria-hidden — the
    // text it wraps is real product information and has to stay readable.
    <span onClick={handleTap} className="inline-block cursor-default select-none">
      {children}
    </span>
  );
}
