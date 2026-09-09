import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { guardApiRequest } from '@/lib/api-guard';
import { createLogger } from '@/lib/logger';
import { getShopConfig, priceShopOrder } from '@/lib/shop-config';
import {
  SHOP_QA_COOKIE,
  resolveShopEnvironment,
  shopCollection,
  shopEnvironmentTag,
} from '@/lib/shop-env';
import { stripe } from '@/lib/stripe';
import { routing } from '@/routing';

const log = createLogger('shop-checkout');

/** Checkout sessions expire after this long; the order is swept a day later. */
const SESSION_TTL_SECONDS = 30 * 60;

type ErrorCode =
  | 'shop_disabled'
  | 'invalid_pack'
  | 'invalid_accessory_qty'
  | 'accessory_unavailable'
  | 'no_countries'
  | 'invalid_request'
  | 'server_error';

function fail(code: ErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Maps our locale to one Stripe Checkout accepts. Anything unrecognised falls
 * back to 'auto' rather than erroring, since a checkout in the wrong language
 * is far better than no checkout.
 */
function stripeLocale(locale: string): 'auto' | 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de' | 'hu' {
  const supported = ['en', 'pt', 'es', 'fr', 'it', 'de', 'hu'] as const;
  const match = supported.find((l) => l === locale);
  return match ?? 'auto';
}

/**
 * Starts a shop checkout.
 *
 * Writes a `pending` ShopOrders document, then creates a Stripe Checkout
 * Session and hands back its URL. Stripe collects and validates the delivery
 * address, restricted to the countries the shop is configured to ship to —
 * which is the only place that restriction can actually be enforced.
 *
 * Nothing price-bearing comes from the client: the body names a pack and an
 * accessory quantity, and the amount is recomputed here from Dynamic/shop_config.
 *
 * The order is only ever moved to `paid` by the webhook in ifound-functions, so
 * a customer who closes the tab mid-payment still gets a fulfilled order.
 */
export async function POST(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    name: 'shop-checkout',
    // Every call creates a Stripe session and a Firestore document, so the
    // budget is deliberately tighter than a read endpoint's.
    requestsPerMinute: 10,
  });
  if (blocked) return blocked;

  let body: { packId?: unknown; accessoryQty?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('invalid_request', 400);
  }

  // Read from the cookie, not the request body: the browser cannot talk us into
  // an environment, and this is the same value the page rendered its prices
  // from. QA writes only to QA_ShopOrders and charges only the Stripe test key,
  // so honouring it on the production deployment is harmless by construction.
  const cookieStore = await cookies();
  const environment = resolveShopEnvironment(cookieStore.get(SHOP_QA_COOKIE)?.value);

  const config = await getShopConfig(environment);
  if (!config.shopEnabled) return fail('shop_disabled', 403);
  if (config.shopCountries.length === 0) {
    // Stripe rejects an empty allowed_countries, and a shop that ships nowhere
    // is closed in every sense that matters.
    log.warn('shop is enabled but ships to no countries');
    return fail('no_countries', 403);
  }

  const priced = priceShopOrder(config, {
    packId: body.packId,
    accessoryQty: body.accessoryQty,
  });
  if (!priced.ok) {
    const status = priced.error === 'accessory_unavailable' ? 403 : 400;
    return fail(priced.error === 'zero_total' ? 'server_error' : priced.error, status);
  }
  const order = priced.value;

  const locale =
    typeof body.locale === 'string' && routing.locales.includes(body.locale as never)
      ? body.locale
      : routing.defaultLocale;
  const orderId = `so_${randomBytes(12).toString('hex')}`;
  const origin = request.nextUrl.origin;

  try {
    // The pending row goes in first, so a session that is created but never
    // paid still leaves a trace, and so the webhook has a document to find.
    await db()
      .collection(shopCollection('ShopOrders', environment))
      .doc(orderId)
      .create({
        orderId,
        status: 'pending',
        source: 'web',
        environment: shopEnvironmentTag(environment),

        packId: order.pack.id,
        units: order.units,
        accessoryQty: order.accessoryQty,
        currency: order.currency,
        packPriceCents: order.packPriceCents,
        accessoryUnitPriceCents: order.accessoryUnitPriceCents,
        shippingCents: order.shippingCents,
        amountCents: order.amountCents,

        uid: null,
        email: null,
        // Filled by the webhook from what Stripe Checkout collected.
        shipping: null,
        countryCode: null,
        locale,

        stripe: { paymentIntentId: null, checkoutSessionId: null, receiptUrl: null },

        createdAt: FieldValue.serverTimestamp(),
        paidAt: null,
        shippedAt: null,
        tracking: null,
      });

    const lineItems: Array<{
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; images?: string[] };
      };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.packPriceCents,
          product_data: {
            name:
              order.units === 1 ? 'iFound Tag' : `iFound Tag — ${order.units}-pack`,
            images: [`${origin}/ifound-tag.jpeg`],
          },
        },
        quantity: 1,
      },
    ];
    if (order.accessoryQty > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.accessoryUnitPriceCents,
          product_data: { name: 'iFound Tag case with ring' },
        },
        quantity: order.accessoryQty,
      });
    }

    const metadata = {
      kind: 'shop_order',
      // Tells the webhook which event owns this payment. Web orders are
      // fulfilled from checkout.session.completed, because only the session
      // reliably carries the address Stripe collected.
      surface: 'web',
      orderId,
      // Routes the resulting events to stripeShopWebhook or its QA twin, which
      // refuse anything stamped for the other environment.
      environment: shopEnvironmentTag(environment),
    };

    const session = await stripe(environment).checkout.sessions.create({
      mode: 'payment',
      locale: stripeLocale(locale),
      line_items: lineItems,
      // Modelled as a shipping rate rather than a line item, so charging for
      // delivery later is a single config change and nothing here moves.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: order.shippingCents, currency: order.currency.toLowerCase() },
            display_name: 'Standard delivery',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 7 },
              maximum: { unit: 'business_day', value: 14 },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries:
          config.shopCountries as unknown as Array<'PT' | 'ES' | 'FR' | 'IT'>,
      },
      phone_number_collection: { enabled: true },
      metadata,
      payment_intent_data: { metadata },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      success_url: `${origin}/${locale}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/shop?cancelled=1`,
    });

    await db()
      .collection(shopCollection('ShopOrders', environment))
      .doc(orderId)
      .set({ stripe: { checkoutSessionId: session.id } }, { merge: true });

    if (!session.url) {
      log.error('stripe returned a session with no url', { orderId });
      return fail('server_error', 500);
    }

    log.info('checkout session created', {
      orderId,
      amountCents: order.amountCents,
      packId: order.pack.id,
    });
    return NextResponse.json(
      { url: session.url },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    log.error('failed to start shop checkout', error);
    return fail('server_error', 500);
  }
}
